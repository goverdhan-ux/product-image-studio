"use client";

import { useState, useEffect } from "react";

interface SettingsPanelProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  openAIKey: string;
  setOpenAIKey: (key: string) => void;
}

// OpenAI OAuth configuration
const OPENAI_CLIENT_ID = process.env.NEXT_PUBLIC_OPENAI_CLIENT_ID || "your-client-id";
const REDIRECT_URI = typeof window !== "undefined" 
  ? `${window.location.origin}/api/auth/openai/callback` 
  : "http://localhost:3000/api/auth/openai/callback";
const SCOPES = "openid email model";

export default function SettingsPanel({
  apiKey,
  setApiKey,
  openAIKey,
  setOpenAIKey,
}: SettingsPanelProps) {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localOpenAIKey, setLocalOpenAIKey] = useState(openAIKey);
  const [saved, setSaved] = useState(false);
  const [isOAuthConnected, setIsOAuthConnected] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Load from localStorage on mount
    const storedGemini = localStorage.getItem("gemini_api_key");
    const storedOpenAI = localStorage.getItem("openai_api_key");
    const storedOAuthToken = localStorage.getItem("openai_oauth_token");
    const storedUserEmail = localStorage.getItem("openai_user_email");
    
    if (storedGemini) setLocalApiKey(storedGemini);
    if (storedOpenAI) setLocalOpenAIKey(storedOpenAI);
    if (storedOAuthToken) {
      setIsOAuthConnected(true);
      setUserEmail(storedUserEmail || "");
    }
  }, []);

  const handleSave = () => {
    setApiKey(localApiKey);
    setOpenAIKey(localOpenAIKey);
    localStorage.setItem("gemini_api_key", localApiKey);
    localStorage.setItem("openai_api_key", localOpenAIKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleOAuthLogin = () => {
    // Generate state for security
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem("oauth_state", state);
    
    // Build OAuth URL
    const authUrl = new URL("https://auth.openai.com/authorize");
    authUrl.searchParams.set("client_id", OPENAI_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("state", state);
    
    // Redirect to OAuth
    window.location.href = authUrl.toString();
  };

  const handleOAuthLogout = () => {
    localStorage.removeItem("openai_oauth_token");
    localStorage.removeItem("openai_user_email");
    setIsOAuthConnected(false);
    setUserEmail("");
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

        {/* OpenAI OAuth */}
        <div className="bg-gray-50 rounded-xl p-6 border">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🤖</div>
            <div>
              <h3 className="font-semibold text-gray-900">OpenAI</h3>
              <p className="text-sm text-gray-600">For AI prompt assistant</p>
            </div>
          </div>
          
          {isOAuthConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-600">✓</div>
                <div className="text-sm text-green-800">
                  Connected as {userEmail || "OpenAI user"}
                </div>
              </div>
              <button
                onClick={handleOAuthLogout}
                className="btn-secondary w-full"
              >
                Disconnect OAuth
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleOAuthLogin}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                </svg>
                Connect with OpenAI
              </button>
              <p className="text-xs text-gray-500 text-center">
                Uses OAuth 2.0 for secure authentication
              </p>
            </div>
          )}
          
          {/* Fallback: Manual API Key */}
          {!isOAuthConnected && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Or enter API key manually:</p>
              <input
                type="password"
                value={localOpenAIKey}
                onChange={(e) => setLocalOpenAIKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
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
          <strong>Note:</strong> Your API keys are stored locally in your browser. 
          OAuth connection uses secure authentication - we never see your password.
        </div>
      </div>
    </div>
  );
}
