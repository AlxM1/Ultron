"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";

interface SettingsData {
  cortexApiKey: string;
  cortexUrl: string;
  agentsmithUrl: string;
  contentIntelUrl: string;
  theme: "dark" | "light";
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    cortexApiKey: "",
    cortexUrl: "http://localhost:3011",
    agentsmithUrl: "http://localhost:4000",
    contentIntelUrl: "http://localhost:3012",
    theme: "dark",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("portal-settings");
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    }
  }, []);

  function handleSave() {
    localStorage.setItem("portal-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleChange(key: keyof SettingsData, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-black">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white/90">Settings</h1>
        <p className="text-white/50 mb-8">Configure your Portal instance</p>

        <div className="space-y-6">
          {/* Theme */}
          <div className="glass-heavy rounded-panel p-6">
            <h2 className="text-xl font-semibold mb-4 text-white/90">Appearance</h2>
            <div className="flex items-center gap-4">
              <label className="text-sm text-white/70">Theme</label>
              <button
                onClick={() => handleChange("theme", settings.theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-2 px-4 py-2 rounded-button bg-white/5 hover:bg-white/10 transition-colors"
              >
                {settings.theme === "dark" ? (
                  <>
                    <Moon size={16} />
                    <span className="text-sm">Dark</span>
                  </>
                ) : (
                  <>
                    <Sun size={16} />
                    <span className="text-sm">Light</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* API Keys */}
          <div className="glass-heavy rounded-panel p-6">
            <h2 className="text-xl font-semibold mb-4 text-white/90">API Keys</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Cortex API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings.cortexApiKey}
                    onChange={(e) => handleChange("cortexApiKey", e.target.value)}
                    placeholder="Enter API key..."
                    className="flex-1 px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-3 py-2 rounded-button bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Service URLs */}
          <div className="glass-heavy rounded-panel p-6">
            <h2 className="text-xl font-semibold mb-4 text-white/90">Service URLs</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Cortex URL</label>
                <input
                  type="text"
                  value={settings.cortexUrl}
                  onChange={(e) => handleChange("cortexUrl", e.target.value)}
                  className="w-full px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">AgentSmith URL</label>
                <input
                  type="text"
                  value={settings.agentsmithUrl}
                  onChange={(e) => handleChange("agentsmithUrl", e.target.value)}
                  className="w-full px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Content Intel URL</label>
                <input
                  type="text"
                  value={settings.contentIntelUrl}
                  onChange={(e) => handleChange("contentIntelUrl", e.target.value)}
                  className="w-full px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-button font-medium transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-accent text-black hover:bg-accent/80"
            }`}
          >
            {saved ? "✓ Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
