import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeFile, unlink, readFile } from "fs/promises";
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
          error: "Rate limit exceeded", 
          message: `Maximum ${RPM} requests per minute. Retry in ${Math.ceil(rateLimit.resetIn / 1000)}s`,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      );
    }

    const { image, angles, prompt, resolution, apiKey } = await request.json();

    if (!image || !angles || !Array.isArray(angles)) {
      return NextResponse.json(
        { error: "Invalid request", message: "Please provide an image and select at least one angle" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required", message: "Please set your API key in Settings" },
        { status: 401 }
      );
    }

    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json(
        { error: "Invalid API key", message: "Please check your Gemini API key in Settings" },
        { status: 401 }
      );
    }

      const results: { url: string; angle: string; error?: string }[] = [];
    const inputPath = path.join("/tmp", `input-${uuidv4()}.png`);

    try {
      const imageBuffer = Buffer.from(image, "base64");
      await writeFile(inputPath, imageBuffer);
    } catch {
      return NextResponse.json(
        { error: "Invalid image", message: "Could not decode the image" },
        { status: 400 }
      );
    }

    const anglePrompts: Record<string, string> = {
      "front": "Front view, straight on, professional photography",
      "side-left": "Left side view, 45 degree angle from left",
      "side-right": "Right side view, 45 degree angle from right",
      "back": "Back view, looking at the rear",
      "top-down": "Top down view, bird's eye perspective",
      "corner": "Corner view, 3/4 perspective",
    };

    for (const angle of angles) {
      const outputPath = path.join("/tmp", `output-${angle}-${uuidv4()}.png`);
      const fullPrompt = prompt 
        ? `${prompt}. ${anglePrompts[angle] || `Create a ${angle} perspective`}`
        : `${anglePrompts[angle] || `Create a ${angle} perspective`}. Maintain consistent lighting and style.`;

      await new Promise<void>((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "scripts", "generate_image.py");
        const env = { ...process.env, GEMINI_API_KEY: apiKey };

        const proc = spawn("uv", [
          "run", scriptPath, "--prompt", fullPrompt, "--filename", outputPath,
          "--resolution", resolution || "1K", "-i", inputPath
        ], { env, timeout: 120000 });

        let errorOutput = "";

        proc.stderr.on("data", (data) => { errorOutput += data.toString(); });
        proc.on("error", (err) => { reject(new Error(`Failed: ${err.message}`)); });
        proc.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(errorOutput || `Failed for angle: ${angle}`));
        });
      });

      try {
        const generatedImage = await readFile(outputPath);
        const base64Image = generatedImage.toString("base64");
        results.push({ url: `data:image/png;base64,${base64Image}`, angle });
      } catch {
        results.push({ url: "", angle, error: "Failed to generate" });
      }

      await unlink(outputPath).catch(() => {});
    }

    await unlink(inputPath).catch(() => {});

    return NextResponse.json({
      images: results,
      rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { 
        error: "Generation failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
