"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  angle?: string;
}

export default function HeroImageGenerator() {
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("1K");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  useEffect(() => {
    // Placeholder
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = () => setProductImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const generateImages = async () => {
    // API key is now handled server-side via GEMINI_API_KEY env variable
    
    if (!productImage || !prompt) {
      setError("Please upload a product image and enter a prompt");
      return;
    }

    setLoading(true);
    setError("");
    setProgress({ current: 0, total: count, message: "Starting generation..." });

    const newImages: GeneratedImage[] = [];

    try {
      for (let i = 0; i < count; i++) {
        setProgress({ 
          current: i + 1, 
          total: count, 
          message: `Generating image ${i + 1} of ${count}...` 
        });

        const formData = new FormData();
        formData.append("image", productImage);
        formData.append("prompt", prompt);
        formData.append("quality", quality);
        formData.append("aspectRatio", aspectRatio);
        formData.append("index", i.toString());

        const response = await fetch("/api/generate-hero", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.imageUrl) {
          throw new Error(data.message || `Failed to generate image ${i + 1}`);
        }

        newImages.push({
          id: `${Date.now()}-${i}`,
          url: data.imageUrl,
          prompt: data.usedPrompt || prompt,
        });
        
        // Update immediately for real-time feedback
        setGeneratedImages(prev => [...newImages, ...prev]);
      }

      setProgress({ current: count, total: count, message: "All images generated! ✅" });
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = () => {
    generatedImages.forEach((img, i) => {
      const link = document.createElement("a");
      link.href = img.url;
      link.download = `hero-image-${i + 1}.png`;
      link.click();
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Hero Image Creator</h2>
        <p className="text-gray-600 mt-1">Generate professional studio-quality product photos</p>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">{progress.message}</span>
            <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Product Image</label>
            <div
              className={`drop-zone ${productImagePreview ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("hero-image-input")?.click()}
            >
              {productImagePreview ? (
                <div className="relative w-full h-48">
                  <Image src={productImagePreview} alt="Product" fill className="object-contain" />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📤</div>
                  <p className="text-gray-600">Click to upload product image</p>
                </>
              )}
            </div>
            <input id="hero-image-input" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enhancement Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Professional studio product photography, white background, soft lighting"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={4}
            />
          </div>

          {/* Batch Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Images (1-20)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {["1:1", "4:3", "3:4", "16:9", "9:16"].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    aspectRatio === ratio ? "bg-primary-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
            <div className="flex gap-2">
              {["1K", "2K", "4K"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    quality === q ? "bg-primary-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateImages}
            disabled={loading || !productImage || !prompt}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? "Generating..." : `✨ Generate ${count} Image${count > 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Generated Images ({generatedImages.length})</h3>
            {generatedImages.length > 0 && (
              <button onClick={downloadAll} className="btn-secondary text-sm">
                ⬇️ Download All
              </button>
            )}
          </div>
          
          {generatedImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p>No images generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
              {generatedImages.map((img) => (
                <div 
                  key={img.id} 
                  className="relative border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="relative w-full aspect-square">
                    <Image src={img.url} alt="Generated" fill className="object-cover" />
                  </div>
                  <div className="p-2 bg-gray-50 border-t text-xs text-gray-600">
                    <p className="line-clamp-2">{img.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-square md:aspect-video">
              <Image src={selectedImage.url} alt="Generated" fill className="object-contain" />
            </div>
            <div className="p-4 border-t">
              <p className="text-sm text-gray-700 mb-3"><strong>Prompt:</strong> {selectedImage.prompt}</p>
              <div className="flex gap-2">
                <a href={selectedImage.url} download={`hero-${selectedImage.id}.png`} className="btn-primary">
                  ⬇️ Download
                </a>
                <button onClick={() => setSelectedImage(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
