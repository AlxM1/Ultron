"use client";

import { useState, useEffect, useCallback } from "react";
import { services, type Service } from "./services";
import MenuBar from "./components/MenuBar";
import Dock from "./components/Dock";
import AppFrame from "./components/AppFrame";
const Dashboard = dynamic(() => import("./components/Dashboard"), {
  ssr: false,
});
import Settings from "./components/Settings";
import VoiceButton from "./components/VoiceButton";
import ChatPanel from "./components/ChatPanel";
import PersonaAvatar from "./components/PersonaAvatar";
import PersonaChatPanel from "./components/PersonaChatPanel";
import { useVoice } from "./hooks/useVoice";
import dynamic from "next/dynamic";

const JarvisHUD = dynamic(() => import("./components/JarvisHUD"), {
  ssr: false,
});

export default function Home() {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
  const [bootComplete, setBootComplete] = useState(false);
  const [personaChatOpen, setPersonaChatOpen] = useState(false);

  const activeService = services.find((s) => s.id === activeApp) ?? null;

  function handleAppSelect(id: string) {
    if (id === activeApp) {
      setActiveApp(null);
      return;
    }
    setActiveApp(id);
  }

  // Voice assistant
  const voice = useVoice(handleAppSelect);

  // Listen for jarvis-open-app events
  useEffect(() => {
    function handleJarvisOpen(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") handleAppSelect(detail);
    }
    window.addEventListener("jarvis-open-app", handleJarvisOpen);
    return () => window.removeEventListener("jarvis-open-app", handleJarvisOpen);
  }, []);

  const checkAllHealth = useCallback(async () => {
    const results: Record<string, boolean> = {};
    await Promise.all(
      services
        .filter((s) => s.url)
        .map(async (s) => {
          try {
            const target = s.healthUrl || s.url!;
            const res = await fetch(
              `/api/health-check?url=${encodeURIComponent(target)}`
            );
            const data = await res.json();
            results[s.id] = data.online === true;
          } catch {
            results[s.id] = false;
          }
        })
    );
    setHealthStatus(results);
  }, []);

  useEffect(() => {
    checkAllHealth();
    const interval = setInterval(checkAllHealth, 60000);
    return () => clearInterval(interval);
  }, [checkAllHealth]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          setActiveApp(null);
        }
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
        }
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const s = services[num - 1];
          if (s) handleAppSelect(s.id);
        }
      }
      if (e.key === "Escape") {
        setActiveApp(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <JarvisHUD voiceState={voice.state} onBootComplete={() => setBootComplete(true)} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "relative",
          zIndex: 1,
          opacity: bootComplete ? 1 : 0,
          pointerEvents: bootComplete ? "auto" : "none",
          transition: "opacity 0.5s ease",
        }}
      >
      <MenuBar activeService={activeService} onHome={() => setActiveApp(null)} />

      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeApp === "settings" ? (
          <Settings />
        ) : activeApp && activeService?.url ? (
          <AppFrame service={activeService} />
        ) : (
          <Dashboard
            services={services}
            healthStatus={healthStatus}
            onSelect={handleAppSelect}
            bootComplete={bootComplete}
          />
        )}
      </main>

      {/* Voice assistant */}
      <VoiceButton
        state={voice.state}
        continuousMode={voice.continuousMode}
        wakeWordEnabled={voice.wakeWordEnabled}
        onPress={voice.handlePress}
        onRelease={voice.handleRelease}
        onToggleChat={() => voice.setChatOpen(!voice.chatOpen)}
        onToggleWakeWord={voice.toggleWakeWord}
        analyser={voice.analyser}
      />

      <ChatPanel
        open={voice.chatOpen}
        messages={voice.messages}
        model={voice.model}
        onModelChange={voice.setModel}
        onSend={voice.sendText}
        onClose={() => voice.setChatOpen(false)}
      />

      {/* Persona */}
      <PersonaAvatar
        active={personaChatOpen}
        onClick={() => setPersonaChatOpen(!personaChatOpen)}
      />
      <PersonaChatPanel
        open={personaChatOpen}
        onClose={() => setPersonaChatOpen(false)}
      />

      <Dock
        services={services}
        activeApp={activeApp}
        onSelect={handleAppSelect}
        healthStatus={healthStatus}
      />
      </div>
    </>
  );
}
