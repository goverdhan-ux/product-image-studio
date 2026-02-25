"use client";

import { useState } from "react";
import HeroImageGenerator from "@/components/HeroImageGenerator";
import ProductOnBedGenerator from "@/components/ProductOnBedGenerator";
import MultiAngleGenerator from "@/components/MultiAngleGenerator";
import AI PromptAssistant from "@/components/AIPromptAssistant";
import SettingsPanel from "@/components/SettingsPanel";

type TabId = "hero" | "product-bed" | "multi-angle" | "ai-prompt" | "settings";

interface Tab {
  id: TabId;
  name: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "hero", name: "Hero Image", icon: "📸" },
  { id: "product-bed", name: "Product on Bed", icon: "🛏️" },
  { id: "multi-angle", name: "Multi-Angle", icon: "🎬" },
  { id: "ai-prompt", name: "AI Prompt", icon: "🤖" },
  { id: "settings", name: "Settings", icon: "⚙️" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("hero");
  const [apiKey, setApiKey] = useState("");
  const [openAIKey, setOpenAIKey] = useState("");

  const renderContent = () => {
    switch (activeTab) {
      case "hero":
        return <HeroImageGenerator apiKey={apiKey} />;
      case "product-bed":
        return <ProductOnBedGenerator apiKey={apiKey} />;
      case "multi-angle":
        return <MultiAngleGenerator apiKey={apiKey} />;
      case "ai-prompt":
        return <AI PromptAssistant apiKey={openAIKey} />;
      case "settings":
        return (
          <SettingsPanel
            apiKey={apiKey}
            setApiKey={setApiKey}
            openAIKey={openAIKey}
            setOpenAIKey={setOpenAIKey}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border p-2">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {renderContent()}
      </div>
    </div>
  );
}
