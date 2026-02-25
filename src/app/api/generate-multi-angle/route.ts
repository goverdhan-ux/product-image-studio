import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const imageFile = formData.get("image") as File | null;
    const anglesStr = formData.get("angles") as string;
    const prompt = formData.get("prompt") as string;
    const frontendApiKey = formData.get("apiKey") as string;
    const envApiKey = process.env.GEMINI_API_KEY;
    const apiKey = envApiKey || frontendApiKey;

    if (!imageFile) {
      return NextResponse.json(
        { error: "NO_IMAGE", message: "Please upload an image" },
        { status: 400 }
      );
    }

    if (!anglesStr) {
      return NextResponse.json(
        { error: "NO_ANGLES", message: "Please select at least one angle" },
        { status: 400 }
      );
    }

    const angles = JSON.parse(anglesStr);

    if (!Array.isArray(angles) || angles.length === 0) {
      return NextResponse.json(
        { error: "INVALID_ANGLES", message: "Please select at least one angle" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "NO_API_KEY", message: "Please set your API key in Settings or add GEMINI_API_KEY env variable" },
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
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const results: { url: string; angle: string; error?: string }[] = [];

    const anglePrompts: Record<string, string> = {
      "front": "Front view, straight on, professional photography",
      "side-left": "Left side view, 45 degree angle from left",
      "side-right": "Right side view, 45 degree angle from right",
      "back": "Back view, looking at the rear",
      "top-down": "Top down view, bird's eye perspective",
      "corner": "Corner view, 3/4 perspective",
    };

    // Generate each angle
    for (const angle of angles) {
      try {
        const fullPrompt = prompt 
          ? `${prompt}. ${anglePrompts[angle] || `Create a ${angle} perspective`}`
          : `${anglePrompts[angle] || `Create a ${angle} perspective`}. Maintain consistent lighting and style.`;

        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Image,
              mimeType: imageFile.type
            }
          },
          { text: fullPrompt }
        ]);

        const candidates = result.response.candidates;
        
        if (!candidates || candidates.length === 0) {
          results.push({ url: "", angle, error: "No response from model" });
          continue;
        }

        let base64Result = "";
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            base64Result = part.inlineData.data;
            break;
          }
        }

        if (base64Result) {
          results.push({ url: `data:image/png;base64,${base64Result}`, angle });
        } else {
          results.push({ url: "", angle, error: "No image in response" });
        }
      } catch (angleError: any) {
        results.push({ url: "", angle, error: angleError.message });
      }
    }

    return NextResponse.json({
      images: results,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });

  } catch (error: any) {
    console.error("Multi-Angle Error:", error);
    
    if (error.message?.includes("API_KEY")) {
      return NextResponse.json(
        { error: "INVALID_API_KEY", message: "Your API key is invalid or expired." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "GENERATION_FAILED", 
        message: error.message || "Failed to generate images. Please try again." 
      },
      { status: 500 }
    );
  }
}
