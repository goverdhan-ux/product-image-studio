"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

interface GeneratedImage {
  id: string;
  url: string;
  angle: string;
}

const angles = [
  { id: "front", name: "Front View", icon: "📷" },
  { id: "side-left", name: "Left Side", icon: "👈" },
  { id: "side-right", name: "Right Side", icon: "👉" },
  { id: "back", name: "Back View", icon: "🔙" },
  { id: "top-down", name: "Top Down", icon: "⬆️" },
  { id: "corner", name: "Corner View", icon: "📐" },
];

export default function MultiAngleGenerator({ apiKey }: { apiKey: string }) {
  const [lifestyleImage, setLifestyleImage] = useState<File | null>(null);
  const [lifestyleImagePreview, setLifestyleImagePreview] = useState<string | null>(null);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(["front"]);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1024x1024");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [storedApiKey, setStoredApiKey] = useState(apiKey);
  
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
    setSelectedAngles((prev) =>
      prev.includes(angleId)
        ? prev.filter((a) => a !== angleId)
        : [...prev, angleId]
    );
  };

  const generateMultiAngle = async () => {
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

    try {
      const formData = new FormData();
      formData.append("image", lifestyleImage);
      formData.append("angles", JSON.stringify(selectedAngles));
      formData.append("prompt", prompt);
      formData.append("resolution", resolution);
      formData.append("apiKey", key);

      const response = await fetch("/api/generate-multi-angle", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error) {
          setError(`${data.error}: ${data.message}`);
        } else {
          throw new Error(data.message || "Failed to generate");
        }
        return;
      }

      const newImages: GeneratedImage[] = data.images
        .filter((img: { url: string }) => img.url)
        .map((img: { url: string; angle: string }, idx: number) => ({
          id: (Date.now() + idx).toString(),
          url: img.url,
          angle: img.angle,
        }));
      
      setGeneratedImages([...newImages, ...generatedImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Multi-Angle Generator</h2>
        <p className="text-gray-600 mt-1">
          Generate consistent multiple camera angles from a single lifestyle image
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Lifestyle Image
            </label>
            <div
              className={`drop-zone ${lifestyleImagePreview ? "border-primary-500 bg-primary-50" : ""}`}
              onClick={() => document.getElementById("lifestyle-image-input")?.click()}
            >
              {lifestyleImagePreview ? (
                <div className="relative w-full h-48">
                  <Image
                    src={lifestyleImagePreview}
                    alt="Lifestyle"
                    fill
                    className="object-cover rounded"
                  />
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-gray-600">Click to upload lifestyle image</p>
                </>
              )}
            </div>
            <input
              id="lifestyle-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Angle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Angles ({selectedAngles.length} selected)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {angles.map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => toggleAngle(angle.id)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedAngles.includes(angle.id)
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-1">{angle.icon}</div>
                  <div className="text-xs font-medium">{angle.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style Consistency Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Maintain consistent lighting, same time of day, professional product photography style"
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
              {["1024x1024", "1024x1536", "1536x1024"].map((res) => (
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
            onClick={generateMultiAngle}
            disabled={loading || !lifestyleImage || selectedAngles.length === 0}
            className="btn-primary w-full py-3 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating {selectedAngles.length} angles...
              </span>
            ) : (
              `🎬 Generate ${selectedAngles.length} Angle${selectedAngles.length > 1 ? "s" : ""}`
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">
            Generated Angles ({generatedImages.length})
          </h3>
          {generatedImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p>No images generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {generatedImages.map((img) => (
                <div key={img.id} className="relative border rounded-lg overflow-hidden">
                  <div className="relative w-full aspect-square">
                    <Image
                      src={img.url}
                      alt={img.angle}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 bg-gray-50 border-t text-center">
                    <span className="text-sm font-medium text-gray-700">{img.angle}</span>
                    <a
                      href={img.url}
                      download={`angle-${img.angle}-${img.id}.png`}
                      className="block mt-1 text-xs text-primary-600 hover:text-primary-700"
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
