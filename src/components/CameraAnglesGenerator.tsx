"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  angle: string;
}

// Predefined camera angles
const cameraAngles = [
  { id: "front", name: "Front", prompt: "Front view, straight on, professional product photography" },
  { id: "back", name: "Back", prompt: "Back view, looking at the rear, professional product photography" },
  { id: "side-left", name: "Left Side", prompt: "Left side view, 45 degree angle from left, professional photography" },
  { id: "side-right", name: "Right Side", prompt: "Right side view, 45 degree angle from right, professional photography" },
  { id: "corner-left", name: "Corner Left", prompt: "Corner view from left, 3/4 perspective, professional photography" },
  { id: "corner-right", name: "Corner Right", prompt: "Corner view from right, 3/4 perspective, professional photography" },
  { id: "top-down", name: "Top Down", prompt: "Top down view, bird's eye perspective, overhead shot" },
  { id: "low-angle", name: "Low Angle", prompt: "Low angle shot, looking up, dramatic perspective" },
  { id: "high-angle", name: "High Angle", prompt: "High angle shot, looking down, elevated perspective" },
  { id: "wide", name: "Wide", prompt: "Wide shot, showing full context and environment" },
  { id: "close-up", name: "Close Up", prompt: "Close-up shot, detailed view of product" },
  { id: "macro", name: "Macro", prompt: "Macro shot, extreme close-up, highly detailed" },
  { id: "panning-left", name: "Pan Left", prompt: "Panning shot from right to left, motion blur edges" },
  { id: "panning-right", name: "Pan Right", prompt: "Panning shot from left to right, motion blur edges" },
  { id: "zoom-in", name: "Zoom In", prompt: "Zoom in shot, dynamic perspective compression" },
];

export default function CameraAnglesGenerator({ apiKey }: { apiKey: string }) {
  const [lifestyleImage, setLifestyleImage] = useState<File | null>(null);
  const [lifestyleImagePreview, setLifestyleImagePreview] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(cameraAngles.slice(0, 10).map(a => a.id));
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("1K");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [storedApiKey, setStoredApiKey] = useState(apiKey);
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  useEffect(() => {
    const stored = localStorage.getItem("gemini_api_key");
    if (stored) setStoredApiKey(stored);
  }, [apiKey]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLifestyleImage(file);
      const reader = new FileReader();
      reader.onload = () => setLifestyleImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const toggleAngle = (angleId: string) => {
    setSelectedAngles(prev =>
      prev.includes(angleId)
        ? prev.filter(a => a !== angleId)
        : [...prev, angleId]
    );
  };

  const generateImages = async () => {
    const key = storedApiKey || apiKey;
    
    if (!key) {
      setError("Please set your API key in Settings tab first");
      return;
    }
    if (!lifestyleImage || selectedAngles.length === 0) {
      setError("Please upload an image and select at least one angle");
      return;
    }

    setLoading(true);
    setError("");
    setProgress({ current: 0, total: selectedAngles.length, message: "Starting generation..." });

    const newImages: GeneratedImage[] = [];

    try {
      for (let i = 0; i < selectedAngles.length; i++) {
        const angleId = selectedAngles[i];
        const angleObj = cameraAngles.find(a => a.id === angleId);
        
        setProgress({ 
          current: i + 1, 
          total: selectedAngles.length, 
          message: `Generating ${angleObj?.name || angleId} view...` 
        });

        const formData = new FormData();
        formData.append("image", lifestyleImage);
        formData.append("angle", angleId);
        formData.append("anglePrompt", angleObj?.prompt || "");
        formData.append("customPrompt", prompt);
        formData.append("quality", quality);
        formData.append("aspectRatio", aspectRatio);
        formData.append("index", i.toString());
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) formData.append("apiKey", storedKey);

        const response = await fetch("/api/generate-camera-angle", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.imageUrl) {
          throw new Error(data.message || `Failed to generate ${angleObj?.name} view`);
        }

        const fullPrompt = `${angleObj?.prompt || ""} ${prompt}`.trim();
        newImages.push({
          id: `${Date.now()}-${i}`,
          url: data.imageUrl,
          prompt: fullPrompt,
          angle: angleObj?.name || angleId,
        });
        
        setGeneratedImages(prev => [...newImages, ...prev]);
      }

      setProgress({ current: selectedAngles.length, total: selectedAngles.length, message: "All angles generated! ✅" });
      setCarouselIndex(0);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = () => {
    generatedImages.forEach((img) => {
      const link = document.createElement("a");
      link.href = img.url;
      link.download = `angle-${img.angle}-${img.id}.png`;
      link.click();
    });
  };

  const nextCarousel = () => setCarouselIndex(i => (i + 1) % generatedImages.length);
  const prevCarousel = () => setCarouselIndex(i => (i - 1 + generatedImages.length) % generatedImages.length);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Camera Angles Generator</h2>
        <p className="text-gray-600 mt-1">Generate 10-15 different camera angles from a single image</p>
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
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Lifestyle Image</label>
            <div
              className={`drop-zone ${lifestyleImagePreview ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("camera-angle-input")?.click()}
            >
              {lifestyleImagePreview ? (
                <div className="relative w-full h-48">
                  <Image src={lifestyleImagePreview} alt="Lifestyle" fill className="object-cover rounded" />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-600">Click to upload image</p>
                </>
              )}
            </div>
            <input id="camera-angle-input" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>

          {/* Angle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Angles ({selectedAngles.length} selected)
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {cameraAngles.map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => toggleAngle(angle.id)}
                  className={`p-2 rounded-lg border text-xs text-center transition-all ${
                    selectedAngles.includes(angle.id)
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {angle.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setSelectedAngles(cameraAngles.map(a => a.id))} className="text-xs text-primary-600">Select All</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setSelectedAngles([])} className="text-xs text-primary-600">Clear All</button>
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Style Prompt (Optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Maintain consistent lighting, professional photography style..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={2}
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
            disabled={loading || !lifestyleImage || selectedAngles.length === 0}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? "Generating..." : `📷 Generate ${selectedAngles.length} Angles`}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Generated Angles ({generatedImages.length})</h3>
            {generatedImages.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode("grid")} 
                  className={`text-sm ${viewMode === "grid" ? "text-primary-600 font-bold" : "text-gray-500"}`}
                >
                  Grid
                </button>
                <button 
                  onClick={() => { setViewMode("carousel"); setCarouselIndex(0); }} 
                  className={`text-sm ${viewMode === "carousel" ? "text-primary-600 font-bold" : "text-gray-500"}`}
                >
                  Carousel
                </button>
                <button onClick={downloadAll} className="btn-secondary text-sm">⬇️ All</button>
              </div>
            )}
          </div>
          
          {generatedImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p>No angles generated yet</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
              {generatedImages.map((img) => (
                <div 
                  key={img.id} 
                  className="relative border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="relative w-full aspect-square">
                    <Image src={img.url} alt={img.angle} fill className="object-cover" />
                  </div>
                  <div className="p-2 bg-gray-50 border-t text-center">
                    <span className="text-sm font-medium text-gray-700">{img.angle}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="relative w-full aspect-square">
                <Image 
                  src={generatedImages[carouselIndex].url} 
                  alt={generatedImages[carouselIndex].angle} 
                  fill 
                  className="object-contain" 
                />
              </div>
              <button onClick={prevCarousel} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow">←</button>
              <button onClick={nextCarousel} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow">→</button>
              <div className="text-center mt-2">
                <span className="font-medium">{generatedImages[carouselIndex].angle}</span>
                <span className="text-gray-500 text-sm ml-2">{carouselIndex + 1}/{generatedImages.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-square md:aspect-video">
              <Image src={selectedImage.url} alt={selectedImage.angle} fill className="object-contain" />
            </div>
            <div className="p-4 border-t">
              <p className="font-medium mb-1">{selectedImage.angle}</p>
              <p className="text-sm text-gray-600 mb-3"><strong>Prompt:</strong> {selectedImage.prompt}</p>
              <div className="flex gap-2">
                <a href={selectedImage.url} download={`angle-${selectedImage.angle}-${selectedImage.id}.png`} className="btn-primary">⬇️ Download</a>
                <button onClick={() => setSelectedImage(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
