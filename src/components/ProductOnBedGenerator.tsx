"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

export default function ProductOnBedGenerator() {
  const [bedImage, setBedImage] = useState<File | null>(null);
  const [bedImagePreview, setBedImagePreview] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [productType, setProductType] = useState("pillow");
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

  const handleBedUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBedImage(file);
      const reader = new FileReader();
      reader.onload = () => setBedImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProductUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    if (!bedImage || !productImage) {
      setError("Please upload both bed and product images");
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
        formData.append("bedImage", bedImage);
        formData.append("productImage", productImage);
        formData.append("productType", productType);
        formData.append("prompt", prompt);
        formData.append("quality", quality);
        formData.append("aspectRatio", aspectRatio);
        formData.append("index", i.toString());

        const response = await fetch("/api/generate-product-bed", {
          method: "POST",
          body: formData,
        });

        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Request timed out or server error. Try fewer images or lower quality.");
        }

        if (!response.ok || !data.imageUrl) {
          throw new Error(data.message || `Failed to generate image ${i + 1}`);
        }

        const usedPrompt = data.usedPrompt || prompt || `Place a ${productType} on the bed`;
        newImages.push({
          id: `${Date.now()}-${i}`,
          url: data.imageUrl,
          prompt: usedPrompt,
        });
        
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
      link.download = `product-bed-${i + 1}.png`;
      link.click();
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Product on Bed Generator</h2>
        <p className="text-gray-600 mt-1">Place your product on a bed image with AI composition</p>
      </div>

      {progress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">{progress.message}</span>
            <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Bed Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Upload Bed Image (Base)</label>
            <div
              className={`drop-zone ${bedImagePreview ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("bed-image-input")?.click()}
            >
              {bedImagePreview ? (
                <div className="relative w-full h-32">
                  <Image src={bedImagePreview} alt="Bed" fill className="object-cover rounded" />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">🛏️</div>
                  <p className="text-gray-600">Click to upload bed image</p>
                </>
              )}
            </div>
            <input id="bed-image-input" type="file" accept="image/*" onChange={handleBedUpload} className="hidden" />
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">2. Upload Product Image</label>
            <div
              className={`drop-zone ${productImagePreview ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("product-image-input")?.click()}
            >
              {productImagePreview ? (
                <div className="relative w-full h-32">
                  <Image src={productImagePreview} alt="Product" fill className="object-contain rounded" />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-gray-600">Click to upload product</p>
                </>
              )}
            </div>
            <input id="product-image-input" type="file" accept="image/*" onChange={handleProductUpload} className="hidden" />
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Type</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Prompt (Optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want the product placed..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <div className="flex flex-wrap gap-2">
              {["1:1", "4:3", "3:4", "16:9", "9:16"].map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    aspectRatio === ratio ? "bg-primary-500 text-white" : "bg-gray-100"
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
                  className={`px-4 py-2 rounded-lg font-medium ${
                    quality === q ? "bg-primary-500 text-white" : "bg-gray-100"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateImages}
            disabled={loading || !bedImage || !productImage}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? "Generating..." : `🛏️ Generate ${count} Image${count > 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Generated ({generatedImages.length})</h3>
            {generatedImages.length > 0 && (
              <button onClick={downloadAll} className="btn-secondary text-sm">⬇️ Download All</button>
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
                  <div className="relative w-full aspect-video">
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-video">
              <Image src={selectedImage.url} alt="Generated" fill className="object-contain" />
            </div>
            <div className="p-4 border-t">
              <p className="text-sm text-gray-700 mb-3"><strong>Prompt:</strong> {selectedImage.prompt}</p>
              <div className="flex gap-2">
                <a href={selectedImage.url} download={`product-bed-${selectedImage.id}.png`} className="btn-primary">⬇️ Download</a>
                <button onClick={() => setSelectedImage(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
