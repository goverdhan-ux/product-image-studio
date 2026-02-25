"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

export default function ProductOnBedGenerator({ apiKey }: { apiKey: string }) {
  const [bedImage, setBedImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productType, setProductType] = useState("pillow");
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");

  const handleBedUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProductUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setProductImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const generateProductOnBed = async () => {
    if (!apiKey) {
      setError("Please set your API key in Settings tab first");
      return;
    }
    if (!bedImage || !productImage) {
      setError("Please upload both bed and product images");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const base64Bed = bedImage.split(",")[1];
      const base64Product = productImage.split(",")[1];
      
      const response = await fetch("/api/generate-product-bed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedImage: base64Bed,
          productImage: base64Product,
          productType,
          prompt: prompt || `Place a ${productType} naturally on the bed, properly aligned and positioned`,
          resolution,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();
      
      setGeneratedImages([
        {
          id: Date.now().toString(),
          url: data.imageUrl,
          prompt: prompt || `Place a ${productType} on the bed`,
        },
        ...generatedImages,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Product on Bed Generator</h2>
        <p className="text-gray-600 mt-1">
          Place your product on a bed image with AI-powered composition
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Bed Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Upload Bed Image (Base)
            </label>
            <div
              className={`drop-zone ${bedImage ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("bed-image-input")?.click()}
            >
              {bedImage ? (
                <div className="relative w-full h-32">
                  <Image
                    src={bedImage}
                    alt="Bed"
                    fill
                    className="object-cover rounded"
                  />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">🛏️</div>
                  <p className="text-gray-600">Click to upload bed image</p>
                </>
              )}
            </div>
            <input
              id="bed-image-input"
              type="file"
              accept="image/*"
              onChange={handleBedUpload}
              className="hidden"
            />
          </div>

          {/* Product Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Upload Product Image
            </label>
            <div
              className={`drop-zone ${productImage ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("product-image-input")?.click()}
            >
              {productImage ? (
                <div className="relative w-full h-32">
                  <Image
                    src={productImage}
                    alt="Product"
                    fill
                    className="object-contain rounded"
                  />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-gray-600">Click to upload product</p>
                </>
              )}
            </div>
            <input
              id="product-image-input"
              type="file"
              accept="image/*"
              onChange={handleProductUpload}
              className="hidden"
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type
            </label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="pillow">Pillow</option>
              <option value="mattress protector">Mattress Protector</option>
              <option value="duvet">Duvet/Comforter</option>
              <option value="sheet set">Sheet Set</option>
              <option value="mattress">Mattress</option>
              <option value="blanket">Blanket</option>
            </select>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Prompt (Optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want the product placed..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution
            </label>
            <div className="flex gap-2">
              {(["1K", "2K", "4K"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    resolution === res
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateProductOnBed}
            disabled={loading || !bedImage || !productImage}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : (
              "🛏️ Generate Product on Bed"
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
          <h3 className="font-semibold text-gray-900">Generated Images</h3>
          {generatedImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p>No images generated yet</p>
              <p className="text-sm mt-1">Upload a bed and product to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {generatedImages.map((img) => (
                <div key={img.id} className="relative border rounded-lg overflow-hidden">
                  <div className="relative w-full aspect-video">
                    <Image
                      src={img.url}
                      alt="Generated"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="p-3 bg-gray-50 border-t">
                    <p className="text-sm text-gray-600 line-clamp-2">{img.prompt}</p>
                    <a
                      href={img.url}
                      download
                      className="mt-2 btn-secondary inline-block text-sm"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
