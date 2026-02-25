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

    const { bedImage, productImage, productType, prompt, resolution, apiKey } = await request.json();

    if (!bedImage || !productImage) {
      return NextResponse.json(
        { error: "Missing images", message: "Please upload both bed and product images" },
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

    const bedPath = path.join("/tmp", `bed-${uuidv4()}.png`);
    const productPath = path.join("/tmp", `product-${uuidv4()}.png`);
    const outputPath = path.join("/tmp", `output-${uuidv4()}.png`);

    try {
      const bedBuffer = Buffer.from(bedImage, "base64");
      const productBuffer = Buffer.from(productImage, "base64");
      await writeFile(bedPath, bedBuffer);
      await writeFile(productPath, productBuffer);
    } catch {
      return NextResponse.json(
        { error: "Invalid image data", message: "Could not decode one of the images" },
        { status: 400 }
      );
    }

    await new Promise<void>((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), "scripts", "generate_image.py");
      const env = { ...process.env, GEMINI_API_KEY: apiKey };
      const fullPrompt = prompt || `Place a ${productType} naturally on the bed, properly aligned, realistic composition, professional product photography`;

      const proc = spawn("uv", [
        "run", scriptPath, "--prompt", fullPrompt, "--filename", outputPath,
        "--resolution", resolution || "1K", "-i", bedPath, "-i", productPath
      ], { env, timeout: 120000 });

      let errorOutput = "";

      proc.stderr.on("data", (data) => { errorOutput += data.toString(); });
      proc.on("error", (err) => { reject(new Error(`Failed to start: ${err.message}`)); });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(errorOutput || "Generation failed"));
      });
    });

    const fs = require("fs");
    if (!fs.existsSync(outputPath)) {
      return NextResponse.json(
        { error: "Generation failed", message: "Image was not generated. Please try again." },
        { status: 500 }
      );
    }

    const generatedImage = await readFile(outputPath);
    const base64Image = generatedImage.toString("base64");

    await unlink(bedPath).catch(() => {});
    await unlink(productPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
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
