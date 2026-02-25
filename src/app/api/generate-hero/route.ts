import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { writeFile, unlink } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { readFileSync, unlinkSync, existsSync } from "fs";

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RPM = 20;
const WINDOW_MS = 60000;

function checkRateLimit(identifier: string) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: RPM - 1, resetIn: WINDOW_MS };
  }
  
  if (record.count >= RPM) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: RPM - record.count, resetIn: record.resetTime - now };
}

export async function POST(request: NextRequest) {
  let inputPath = "";
  let outputPath = "";
  
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "RATE_LIMIT_EXCEEDED", 
          message: `Maximum ${RPM} requests per minute. Retry in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string;
    const resolution = formData.get("resolution") as string || "1024x1024";
    const apiKey = formData.get("apiKey") as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: "NO_IMAGE", message: "Please upload an image file" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "NO_PROMPT", message: "Please provide a prompt for the image" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "NO_API_KEY", message: "Please set your API key in Settings tab" },
        { status: 401 }
      );
    }

    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json(
        { error: "INVALID_API_KEY", message: "Invalid API key format. Gemini keys start with AIza..." },
        { status: 401 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = imageFile.type;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-2.0-flash-exp for image generation
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build the prompt
    const fullPrompt = `${prompt}. High quality, professional product photography, 4k, detailed.`;

    // Generate image
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      },
      { text: fullPrompt }
    ]);

    const response = result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { error: "NO_RESPONSE", message: "No image generated. The model returned no response." },
        { status: 500 }
      );
    }

    const candidate = candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      return NextResponse.json(
        { error: "EMPTY_RESPONSE", message: "The model returned an empty response." },
        { status: 500 }
      );
    }

    // Check for image in response
    let base64Result = "";
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        base64Result = part.inlineData.data;
        break;
      }
    }

    if (!base64Result) {
      // Try to get text response as fallback
      const text = candidate.content.parts.map(p => p.text || "").join("");
      return NextResponse.json(
        { 
          error: "NO_IMAGE_IN_RESPONSE", 
          message: "The model returned text instead of an image. Try a different prompt.",
          debug: text
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Result}`,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });

  } catch (error: any) {
    console.error("Hero Image Generation Error:", error);
    
    // Parse specific error types
    if (error.message?.includes("API_KEY")) {
      return NextResponse.json(
        { error: "INVALID_API_KEY", message: "Your API key is invalid or expired." },
        { status: 401 }
      );
    }
    
    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "API_RATE_LIMIT", message: "Google API rate limit exceeded. Please wait and try again." },
        { status: 429 }
      );
    }
    
    if (error.message?.includes("Unsupported")) {
      return NextResponse.json(
        { error: "UNSUPPORTED_FORMAT", message: "Image format not supported. Try JPG or PNG." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "GENERATION_FAILED", 
        message: error.message || "Failed to generate image. Please try again.",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
