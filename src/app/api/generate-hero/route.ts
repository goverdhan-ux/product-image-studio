import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RPM = 20;
const WINDOW_MS = 60000; // 1 minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
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
    // Rate limit check
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(ip);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: `You have reached the maximum of ${RPM} requests per minute.`,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
            "X-RateLimit-Remaining": "0"
          }
        }
      );
    }

    const { image, prompt, resolution, apiKey } = await request.json();

    if (!image || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields", message: "Please provide both image and prompt" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required", message: "Please set your API key in Settings" },
        { status: 401 }
      );
    }

    // Validate API key format (basic check)
    if (!apiKey.startsWith("AIza")) {
      return NextResponse.json(
        { error: "Invalid API key", message: "Please check your Gemini API key in Settings" },
        { status: 401 }
      );
    }

    // Save input image temporarily
    const inputPath = path.join("/tmp", `input-${uuidv4()}.png`);
    const outputPath = path.join("/tmp", `output-${uuidv4()}.png`);

    try {
      // Decode base64 and save
      const imageBuffer = Buffer.from(image, "base64");
      await writeFile(inputPath, imageBuffer);
    } catch {
      return NextResponse.json(
        { error: "Invalid image data", message: "Could not decode the uploaded image" },
        { status: 400 }
      );
    }

    // Run the generation script
    await new Promise<void>((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), "scripts", "generate_image.py");

      const env = { ...process.env, GEMINI_API_KEY: apiKey };

      const proc = spawn("uv", [
        "run",
        scriptPath,
        "--prompt",
        prompt,
        "--filename",
        outputPath,
        "--resolution",
        resolution || "1K",
        "-i",
        inputPath,
      ], { env, timeout: 120000 });

      let errorOutput = "";

      proc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to start generation: ${err.message}`));
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || "Image generation failed"));
        }
      });
    });

    // Read the generated image
    const fs = require("fs");
    
    if (!fs.existsSync(outputPath)) {
      return NextResponse.json(
        { error: "Generation failed", message: "The image was not generated. Please try again." },
        { status: 500 }
      );
    }

    const generatedImage = fs.readFileSync(outputPath);
    const base64Image = generatedImage.toString("base64");

    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn
      }
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { 
        error: "Generation failed", 
        message: error instanceof Error ? error.message : "An unexpected error occurred" 
      },
      { status: 500 }
    );
  }
}
