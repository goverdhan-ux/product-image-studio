"use client";

import { useState, useEffect } from "react";

interface SettingsPanelProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  openAIKey: string;
  setOpenAIKey: (key: string) => void;
}

export default function SettingsPanel({
  apiKey,
  setApiKey,
  openAIKey,
  setOpenAIKey,
}: SettingsPanelProps) {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localOpenAIKey, setLocalOpenAIKey] = useState(openAIKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const storedGemini = localStorage.getItem("gemini_api_key");
    const storedOpenAI = localStorage.getItem("openai_api_key");
    if (storedGemini) setLocalApiKey(storedGemini);
    if (storedOpenAI) setLocalOpenAIKey(storedOpenAI);
  }, []);

  const handleSave = () => {
    setApiKey(localApiKey);
    setOpenAIKey(localOpenAIKey);
    localStorage.setItem("gemini_api_key", localApiKey);
    localStorage.setItem("openai_api_key", localOpenAIKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">
          Configure your API keys for image generation
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Nano Banana Pro API */}
        <div className="bg-gray-50 rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🍌</div>
            <div>
              <h3 className="font-semibold text-gray-900">Nano Banana Pro (Gemini)</h3>
              <p className="text-sm text-gray-600">For image generation</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-500 mt-2">
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

        {/* OpenAI API */}
        <div className="bg-gray-50 rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🤖</div>
            <div>
              <h3 className="font-semibold text-gray-900">OpenAI</h3>
              <p className="text-sm text-gray-600">For AI prompt assistant</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={localOpenAIKey}
            onChange={(e) => setLocalOpenAIKey(e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="btn-primary w-full py-3 text-lg"
        >
          {saved ? "✓ Saved!" : "Save Settings"}
        </button>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <strong>Note:</strong> Your API keys are stored locally in your browser and
          are never sent to our servers. They are only used when generating images.
        </div>
      </div>
    </div>
  );
}
