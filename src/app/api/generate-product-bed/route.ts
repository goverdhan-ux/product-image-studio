import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

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
    const bedFile = formData.get("bedImage") as File | null;
    const productFile = formData.get("productImage") as File | null;
    const productType = formData.get("productType") as string || "product";
    const prompt = formData.get("prompt") as string;
    const apiKey = formData.get("apiKey") as string;

    if (!bedFile || !productFile) {
      return NextResponse.json(
        { error: "MISSING_IMAGES", message: "Please upload both bed and product images" },
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

    // Convert files to base64
    const bedBuffer = Buffer.from(await bedFile.arrayBuffer());
    const productBuffer = Buffer.from(await productFile.arrayBuffer());
    const base64Bed = bedBuffer.toString("base64");
    const base64Product = productBuffer.toString("base64");

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build the prompt
    const fullPrompt = prompt || `Place a ${productType} naturally on this bed, properly aligned, realistic composition, professional product photography, 4k quality`;

    // Generate image with both images
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Bed,
          mimeType: bedFile.type
        }
      },
      {
        inlineData: {
          data: base64Product,
          mimeType: productFile.type
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

    let base64Result = "";
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        base64Result = part.inlineData.data;
        break;
      }
    }

    if (!base64Result) {
      const text = candidates[0].content.parts.map(p => p.text || "").join("");
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
    console.error("Product on Bed Error:", error);
    
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

    return NextResponse.json(
      { 
        error: "GENERATION_FAILED", 
        message: error.message || "Failed to generate image. Please try again." 
      },
      { status: 500 }
    );
  }
}
