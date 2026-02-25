"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

export default function AIPromptAssistant({ apiKey }: { apiKey: string }) {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productType, setProductType] = useState("general");
  const [brandStyle, setBrandStyle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProductImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const generatePrompt = async () => {
    if (!apiKey) {
      setError("Please set your OpenAI API key in Settings tab first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: productImage,
          productType,
          brandStyle,
          targetAudience,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate prompt");
      }

      const data = await response.json();
      setGeneratedPrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
  };

  const presetPrompts = {
    hero: "Professional studio product photography, clean white background, soft lighting, product shot, commercial advertising style",
    lifestyle: "Lifestyle product photography, natural lighting, authentic场景, warm and inviting atmosphere, professional commercial photography",
    flat: "Flat lay product photography, clean minimal background, top-down view, organized composition, e-commerce product shot",
    contextual: "Product in context, realistic environment, natural placement, lifestyle setting, professional photography",
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">AI Prompt Assistant</h2>
        <p className="text-gray-600 mt-1">
          Analyze your product image and generate optimized AI prompts
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Product Image (Optional)
            </label>
            <div
              className={`drop-zone ${productImage ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("prompt-image-input")?.click()}
            >
              {productImage ? (
                <div className="relative w-full h-40">
                  <Image
                    src={productImage}
                    alt="Product"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">🤖</div>
                  <p className="text-gray-600">Click to upload product image for AI analysis</p>
                </>
              )}
            </div>
            <input
              id="prompt-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Category
            </label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="general">General Product</option>
              <option value="bedding">Bedding & Linens</option>
              <option value="furniture">Furniture</option>
              <option value="apparel">Apparel & Fashion</option>
              <option value="electronics">Electronics</option>
              <option value="home">Home & Decor</option>
            </select>
          </div>

          {/* Brand Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Style (Optional)
            </label>
            <input
              type="text"
              value={brandStyle}
              onChange={(e) => setBrandStyle(e.target.value)}
              placeholder="e.g., Minimalist, Luxury, Eco-friendly, Modern"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience (Optional)
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Young professionals, Parents, Luxury shoppers"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generatePrompt}
            disabled={loading}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              "🤖 Generate AI Prompt"
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Generated Prompt</h3>
          
          {generatedPrompt ? (
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 border rounded-lg">
                <p className="text-gray-800 whitespace-pre-wrap">{generatedPrompt}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="btn-secondary flex-1">
                  📋 Copy Prompt
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedPrompt + " --ar 4:5 --style raw")}
                  className="btn-secondary flex-1"
                >
                  📋 Copy for Midjourney
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💡</div>
                <p>No prompt generated yet</p>
              </div>

              {/* Quick Prompts */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Quick Prompt Templates</h4>
                <div className="space-y-2">
                  {Object.entries(presetPrompts).map(([key, prompt]) => (
                    <button
                      key={key}
                      onClick={() => setGeneratedPrompt(prompt)}
                      className="w-full p-3 text-left text-sm bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium capitalize">{key}:</span>{" "}
                      <span className="text-gray-600">{prompt.slice(0, 50)}...</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
