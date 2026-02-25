import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { writeFile, unlink, readFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { image, angles, prompt, resolution, apiKey } = await request.json();

    if (!image || !angles || !apiKey || !Array.isArray(angles)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const results: { url: string; angle: string }[] = [];

    // Save input image
    const inputPath = path.join("/tmp", `input-${uuidv4()}.png`);
    const imageBuffer = Buffer.from(image, "base64");
    await writeFile(inputPath, imageBuffer);

    // Generate each angle
    for (const angle of angles) {
      const outputPath = path.join("/tmp", `output-${angle}-${uuidv4()}.png`);
      
      const anglePrompts: Record<string, string> = {
        "front": "Front view of this product, straight on, professional photography",
        "side-left": "Left side view of this product, 45 degree angle from left, professional photography",
        "side-right": "Right side view of this product, 45 degree angle from right, professional photography",
        "back": "Back view of this product, looking at the rear, professional photography",
        "top-down": "Top down view of this product, bird's eye perspective, professional photography",
        "corner": "Corner view of this product, 3/4 perspective, professional photography",
      };

      const fullPrompt = prompt 
        ? `${prompt}. ${anglePrompts[angle] || `Create a ${angle} perspective`}`
        : `${anglePrompts[angle] || `Create a ${angle} perspective`}. Maintain consistent lighting and style with the original image.`;

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
          fullPrompt,
          "--filename",
          outputPath,
          "--resolution",
          resolution || "1K",
          "-i",
          inputPath,
        ], { env });

        let errorOutput = "";

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

      // Read generated image
      const generatedImage = await readFile(outputPath);
      const base64Image = generatedImage.toString("base64");
      
      results.push({
        url: `data:image/png;base64,${base64Image}`,
        angle,
      });

      // Clean up
      await unlink(outputPath).catch(() => {});
    }

    // Clean up input
    await unlink(inputPath).catch(() => {});

    return NextResponse.json({ images: results });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
