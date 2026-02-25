import { NextRequest, NextResponse } from "next/server";

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

// Map aspect ratios to dimensions
function getDimensions(aspectRatio: string, quality: string): { width: number; height: number } {
  const qualityMap: Record<string, number> = {
    "1K": 1024,
    "2K": 2048,
    "4K": 4096,
  };
  
  const baseSize = qualityMap[quality] || 1024;
  
  const ratioMap: Record<string, number[]> = {
    "1:1": [baseSize, baseSize],
    "4:3": [baseSize, Math.round(baseSize * 0.75)],
    "3:4": [Math.round(baseSize * 0.75), baseSize],
    "16:9": [baseSize, Math.round(baseSize * 9/16)],
    "9:16": [Math.round(baseSize * 9/16), baseSize],
  };
  
  const [w, h] = ratioMap[aspectRatio] || ratioMap["1:1"];
  return { width: w, height: h };
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMIT_EXCEEDED", message: `Max ${RPM}/min. Retry in ${Math.ceil(rateLimit.resetIn / 1000)}s` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const angle = formData.get("angle") as string;
    const anglePrompt = formData.get("anglePrompt") as string;
    const customPrompt = formData.get("customPrompt") as string;
    const aspectRatio = formData.get("aspectRatio") as string || "1:1";
    const quality = formData.get("quality") as string || "1K";
    
    const envApiKey = process.env.GEMINI_API_KEY;
    const frontendApiKey = formData.get("apiKey") as string;
    const apiKey = envApiKey || frontendApiKey;

    if (!imageFile) {
      return NextResponse.json({ error: "NO_IMAGE", message: "Please upload an image" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "NO_API_KEY", message: "API key required" }, { status: 401 });
    }

    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json({ error: "INVALID_API_KEY", message: "Invalid API key format" }, { status: 401 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");
    const dims = getDimensions(aspectRatio, quality);

    // Build the prompt
    const fullPrompt = `${anglePrompt} ${customPrompt}`.trim() || anglePrompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: imageFile.type, data: base64Image } },
              { text: fullPrompt }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { imageSize: `${dims.width}x${dims.height}` }
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: "API_ERROR", message: errorData.error?.message || "Failed to generate" }, { status: 500 });
    }

    const data = await response.json();
    
    let base64Result = "";
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Result = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Result) {
      return NextResponse.json({ error: "NO_IMAGE", message: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Result}`,
      usedPrompt: fullPrompt,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });

  } catch (error: any) {
    console.error("Camera Angle Error:", error);
    return NextResponse.json({ error: "GENERATION_FAILED", message: error.message || "Failed to generate" }, { status: 500 });
  }
}
