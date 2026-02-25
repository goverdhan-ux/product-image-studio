import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, resolution, apiKey } = await request.json();

    if (!image || !prompt || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save input image temporarily
    const inputPath = path.join("/tmp", `input-${uuidv4()}.png`);
    const outputPath = path.join("/tmp", `output-${uuidv4()}.png`);

    // Decode base64 and save
    const imageBuffer = Buffer.from(image, "base64");
    await writeFile(inputPath, imageBuffer);

    // Run the generation script
    await new Promise<void>((resolve, reject) => {
      const scriptPath = path.join(
        process.cwd(),
        "scripts",
        "generate_image.py"
      );

      const env = {
        ...process.env,
        GEMINI_API_KEY: apiKey,
      };

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
      ], { env });

      let output = "";
      let errorOutput = "";

      proc.stdout.on("data", (data) => {
        output += data.toString();
      });

      proc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput || "Generation failed"));
        }
      });
    });

    // Read the generated image
    const fs = require("fs");
    const generatedImage = fs.readFileSync(outputPath);
    const base64Image = generatedImage.toString("base64");

    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
