import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const { image, productType, brandStyle, targetAudience, apiKey } = await request.json();

    // Check for OAuth token first, then fall back to API key
    let accessToken = request.cookies.get("openai_access_token")?.value;
    
    // If no OAuth token, try to refresh
    if (!accessToken) {
      const refreshResponse = await fetch(new URL("/api/auth/refresh", request.url).toString(), {
        method: "POST",
        cookies: request.cookies,
      });
      
      if (refreshResponse.ok) {
        accessToken = refreshResponse.cookies.get("openai_access_token")?.value;
      }
    }

    // Use OAuth token or API key
    let openai: OpenAI;
    
    if (accessToken) {
      openai = new OpenAI({ 
        apiKey: accessToken,
        // @ts-ignore - OpenAI SDK supports bearer token
        baseURL: "https://api.openai.com/v1",
      });
    } else if (apiKey) {
      openai = new OpenAI({ apiKey });
    } else {
      return NextResponse.json(
        { error: "OpenAI authentication required. Please connect via OAuth or enter API key in Settings." },
        { status: 401 }
      );
    }

    // Build the analysis prompt
    let analysisPrompt = `You are an expert e-commerce product photographer and AI image prompt engineer. `;

    if (productType && productType !== "general") {
      analysisPrompt += `Generate a detailed, high-quality AI image generation prompt for a ${productType} product. `;
    } else {
      analysisPrompt += `Generate a detailed, high-quality AI image generation prompt for this product. `;
    }

    if (brandStyle) {
      analysisPrompt += `The brand style is: ${brandStyle}. `;
    }

    if (targetAudience) {
      analysisPrompt += `The target audience is: ${targetAudience}. `;
    }

    analysisPrompt += `

Create a detailed prompt that includes:
1. Product positioning and composition
2. Lighting style (soft, dramatic, natural, studio)
3. Background setting (white, lifestyle, contextual, gradient)
4. Color mood and palette
5. Camera angle and perspective
6. Style modifiers (professional, commercial, e-commerce)
7. Technical quality (8k, ultra-detailed, professional photography)

Format the prompt as a single paragraph optimized for AI image generation.
`;

    // Call OpenAI to generate the prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: analysisPrompt,
        },
        {
          role: "user",
          content: image 
            ? "Please analyze this product image and generate an optimized AI image generation prompt." 
            : "Generate a professional AI image generation prompt based on the product type and brand information provided.",
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const prompt = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Error generating prompt:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prompt generation failed" },
      { status: 500 }
    );
  }
}
