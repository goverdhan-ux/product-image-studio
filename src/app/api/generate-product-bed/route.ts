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
    const resolution = formData.get("resolution") as string || "1024x1024";
    
    const envApiKey = process.env.GEMINI_API_KEY;
    const frontendApiKey = formData.get("apiKey") as string;
    const apiKey = envApiKey || frontendApiKey;

    if (!bedFile || !productFile) {
      return NextResponse.json(
        { error: "MISSING_IMAGES", message: "Please upload both bed and product images" },
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

    // Convert files to base64
    const bedBuffer = Buffer.from(await bedFile.arrayBuffer());
    const productBuffer = Buffer.from(await productFile.arrayBuffer());
    const base64Bed = bedBuffer.toString("base64");
    const base64Product = productBuffer.toString("base64");

    // Map resolution
    const resolutionMap: Record<string, { width: number; height: number }> = {
      "1024x1024": { width: 1024, height: 1024 },
      "1024x1536": { width: 1024, height: 1536 },
      "1536x1024": { width: 1536, height: 1024 },
    };
    const dims = resolutionMap[resolution] || resolutionMap["1024x1024"];

    const fullPrompt = prompt || `Place a ${productType} naturally on this bed, properly aligned, realistic composition, professional product photography, 4k quality`;

    // Use REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: bedFile.type, data: base64Bed } },
              { inlineData: { mimeType: productFile.type, data: base64Product } },
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
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "API_ERROR", message: errorData.error?.message || "Failed to generate image" },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: "NO_IMAGE_IN_RESPONSE", message: "The model returned no image. Try a different prompt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Result}`,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });

  } catch (error: any) {
    console.error("Product on Bed Error:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
