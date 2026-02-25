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
    const imageFile = formData.get("image") as File | null;
    const anglesStr = formData.get("angles") as string;
    const prompt = formData.get("prompt") as string;
    const resolution = formData.get("resolution") as string || "1024x1024";
    
    const envApiKey = process.env.GEMINI_API_KEY;
    const frontendApiKey = formData.get("apiKey") as string;
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

    const anglePrompts: Record<string, string> = {
      "front": "Front view, straight on, professional photography",
      "side-left": "Left side view, 45 degree angle from left",
      "side-right": "Right side view, 45 degree angle from right",
      "back": "Back view, looking at the rear",
      "top-down": "Top down view, bird's eye perspective",
      "corner": "Corner view, 3/4 perspective",
    };

    const results: { url: string; angle: string; error?: string }[] = [];

    // Map resolution
    const resolutionMap: Record<string, { width: number; height: number }> = {
      "1024x1024": { width: 1024, height: 1024 },
      "1024x1536": { width: 1024, height: 1536 },
      "1536x1024": { width: 1536, height: 1024 },
    };
    const dims = resolutionMap[resolution] || resolutionMap["1024x1024"];

    for (const angle of angles) {
      try {
        const fullPrompt = prompt 
          ? `${prompt}. ${anglePrompts[angle] || `Create a ${angle} perspective`}`
          : `${anglePrompts[angle] || `Create a ${angle} perspective`}. Maintain consistent lighting and style.`;

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
          results.push({ url: "", angle, error: "API error" });
          continue;
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

        if (base64Result) {
          results.push({ url: `data:image/png;base64,${base64Result}`, angle });
        } else {
          results.push({ url: "", angle, error: "No image generated" });
        }
      } catch (e: any) {
        results.push({ url: "", angle, error: e.message });
      }
    }

    return NextResponse.json({
      images: results,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });

  } catch (error: any) {
    console.error("Multi-Angle Error:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED", message: error.message || "Failed to generate images" },
      { status: 500 }
    );
  }
}
