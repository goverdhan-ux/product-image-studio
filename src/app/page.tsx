"use client";

import { useState } from "react";
import HeroImageGenerator from "@/components/HeroImageGenerator";
import ProductOnBedGenerator from "@/components/ProductOnBedGenerator";
import CameraAnglesGenerator from "@/components/CameraAnglesGenerator";
import SettingsPanel from "@/components/SettingsPanel";

type TabId = "hero" | "product-bed" | "camera-angles" | "settings";

interface Tab {
  id: TabId;
  name: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "hero", name: "Hero Image", icon: "📸" },
  { id: "product-bed", name: "Product on Bed", icon: "🛏️" },
  { id: "camera-angles", name: "Camera Angles", icon: "📷" },
  { id: "settings", name: "Settings", icon: "⚙️" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("hero");

  const renderContent = () => {
    switch (activeTab) {
      case "hero":
        return <HeroImageGenerator />;
      case "product-bed":
        return <ProductOnBedGenerator />;
      case "camera-angles":
        return <CameraAnglesGenerator />;
      case "settings":
        return <SettingsPanel />;
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
