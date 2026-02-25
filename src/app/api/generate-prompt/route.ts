import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

    const { image, productType, brandStyle, targetAudience, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required", message: "Please set your OpenAI API key in Settings" },
        { status: 401 }
      );
    }

    // Validate OpenAI API key format
    if (!apiKey.startsWith("sk-")) {
      return NextResponse.json(
        { error: "Invalid API key", message: "Please check your OpenAI API key in Settings (should start with sk-)" },
        { status: 401 }
      );
    }

    let openai: OpenAI;
    try {
      openai = new OpenAI({ apiKey });
    } catch {
      return NextResponse.json(
        { error: "Invalid API key", message: "Could not initialize OpenAI with the provided key" },
        { status: 401 }
      );
    }

    let analysisPrompt = `You are an expert e-commerce product photographer and AI image prompt engineer. `;

    if (productType && productType !== "general") {
      analysisPrompt += `Generate a detailed, high-quality AI image generation prompt for a ${productType} product. `;
    } else {
      analysisPrompt += `Generate a detailed, high-quality AI image generation prompt for this product. `;
    }

    if (brandStyle) analysisPrompt += `The brand style is: ${brandStyle}. `;
    if (targetAudience) analysisPrompt += `The target audience is: ${targetAudience}. `;

    analysisPrompt += `
Create a detailed prompt that includes:
1. Product positioning and composition
2. Lighting style (soft, dramatic, natural, studio)
3. Background setting (white, lifestyle, contextual, gradient)
4. Color mood and palette
5. Camera angle and perspective
6. Style modifiers (professional, commercial, e-commerce)
7. Technical quality (8k, ultra-detailed, professional photography)
Format the prompt as a single paragraph optimized for AI image generation.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: analysisPrompt },
          { 
            role: "user", 
            content: image 
              ? "Please analyze this product image and generate an optimized AI image generation prompt." 
              : "Generate a professional AI image generation prompt based on the product type and brand information provided." 
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const prompt = completion.choices[0]?.message?.content || "";

      if (!prompt) {
        return NextResponse.json(
          { error: "Empty response", message: "The AI returned an empty prompt. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        prompt,
        rateLimit: { remaining: rateLimit.remaining, resetIn: rateLimit.resetIn }
      });
    } catch (openaiError: any) {
      console.error("OpenAI error:", openaiError);
      
      if (openaiError.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key", message: "Your OpenAI API key is invalid or expired" },
          { status: 401 }
        );
      }
      
      if (openaiError.status === 429) {
        return NextResponse.json(
          { error: "Rate limit", message: "OpenAI rate limit exceeded. Please wait and try again." },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "OpenAI error", 
          message: openaiError.message || "Failed to generate prompt" 
        },
        { status: 500 }
      );
    }
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
