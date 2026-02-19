"use client";

import { useState, useEffect, useCallback } from "react";
import { services, type Service } from "./services";
import MenuBar from "./components/MenuBar";
import Dock from "./components/Dock";
import AppFrame from "./components/AppFrame";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import VoiceButton from "./components/VoiceButton";
import ChatPanel from "./components/ChatPanel";
import PersonaAvatar from "./components/PersonaAvatar";
import PersonaChatPanel from "./components/PersonaChatPanel";
import ServicesPage from "./pages/ServicesPage";
import ContentIntelPage from "./pages/ContentIntelPage";
import TimelinePage from "./pages/TimelinePage";
import WorkflowsPage from "./pages/WorkflowsPage";
import { useVoice } from "./hooks/useVoice";
import dynamic from "next/dynamic";

const JarvisHUD = dynamic(() => import("./components/JarvisHUD"), {
  ssr: false,
});

type PageView = "home" | "services" | "content-intel" | "timeline" | "workflows";

export default function Home() {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageView>("home");
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
      <MenuBar 
        activeService={activeService} 
        activePage={activePage}
        onHome={() => {
          setActiveApp(null);
          setActivePage("home");
        }}
        onNavigate={(page) => {
          setActiveApp(null);
          setActivePage(page);
        }}
      />

      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeApp === "settings" ? (
          <Settings />
        ) : activeApp && activeService?.url ? (
          <AppFrame service={activeService} />
        ) : activePage === "services" ? (
          <ServicesPage services={services} healthStatus={healthStatus} />
        ) : activePage === "content-intel" ? (
          <ContentIntelPage />
        ) : activePage === "timeline" ? (
          <TimelinePage />
        ) : activePage === "workflows" ? (
          <WorkflowsPage />
        ) : (
          <Dashboard
            services={services}
            healthStatus={healthStatus}
            onSelect={handleAppSelect}
            onNavigate={setActivePage}
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
