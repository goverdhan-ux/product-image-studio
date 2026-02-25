import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { bedImage, productImage, productType, prompt, resolution, apiKey } = await request.json();

    if (!bedImage || !productImage || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save input images temporarily
    const bedPath = path.join("/tmp", `bed-${uuidv4()}.png`);
    const productPath = path.join("/tmp", `product-${uuidv4()}.png`);
    const outputPath = path.join("/tmp", `output-${uuidv4()}.png`);

    // Decode base64 and save
    const bedBuffer = Buffer.from(bedImage, "base64");
    const productBuffer = Buffer.from(productImage, "base64");
    await writeFile(bedPath, bedBuffer);
    await writeFile(productPath, productBuffer);

    // Run the generation script with both images
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

      const fullPrompt = prompt || `Place a ${productType} naturally on the bed in the image, properly aligned, realistic composition, professional product photography`;

      const proc = spawn("uv", [
        "run",
        scriptPath,
        "--prompt",
        fullPrompt,
        "--filename",
        outputPath,
        "--resolution",
        resolution || "1K",
        "-i",
        bedPath,
        "-i",
        productPath,
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
    const generatedImage = await readFile(outputPath);
    const base64Image = generatedImage.toString("base64");

    // Clean up temp files
    await unlink(bedPath).catch(() => {});
    await unlink(productPath).catch(() => {});
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
