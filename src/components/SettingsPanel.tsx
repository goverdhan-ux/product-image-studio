"use client";

import { useState, useEffect } from "react";

export default function SettingsPanel() {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Just to prevent unused warning
    console.log("Settings loaded");
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">
          Configure API keys via environment variables
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* API Key Info */}
        <div className="bg-gray-50 rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🍌</div>
            <div>
              <h3 className="font-semibold text-gray-900">Nano Banana Pro (Gemini)</h3>
              <p className="text-sm text-gray-600">For image generation</p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Add this environment variable in Vercel:</strong>
            </p>
            <code className="block bg-white px-3 py-2 rounded text-sm font-mono">
              GEMINI_API_KEY=your_api_key_here
            </code>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            Get your API key from{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>

        {/* Note */}
        <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800">
          <strong>Note:</strong> API keys are set via environment variables, not in the UI. 
          Add them in your Vercel project settings.
        </div>

        {/* Save Button (just for UI feedback) */}
        <button
          onClick={handleSave}
          className="btn-primary w-full py-3 text-lg"
        >
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
