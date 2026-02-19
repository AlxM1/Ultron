"use client";

import { useEffect, useState } from "react";

interface JarvisHUDProps {
  voiceState: "idle" | "listening" | "processing";
  onBootComplete: () => void;
}

export default function JarvisHUD({ voiceState, onBootComplete }: JarvisHUDProps) {
  const [bootProgress, setBootProgress] = useState(0);
  const [bootMessages, setBootMessages] = useState<string[]>([]);

  useEffect(() => {
    const messages = [
      "Initializing 00raiser Portal...",
      "Loading service registry...",
      "Connecting to Cortex...",
      "Checking system health...",
      "Ready.",
    ];

    let currentMessage = 0;
    const interval = setInterval(() => {
      if (currentMessage < messages.length) {
        setBootMessages((prev) => [...prev, messages[currentMessage]]);
        setBootProgress(((currentMessage + 1) / messages.length) * 100);
        currentMessage++;
      } else {
        clearInterval(interval);
        setTimeout(() => onBootComplete(), 500);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [onBootComplete]);

  if (bootProgress >= 100) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      <div className="max-w-2xl w-full px-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-accent to-accent-deep bg-clip-text text-transparent mb-4">
            00raiser
          </h1>
          <p className="text-white/50">Portal Initialization</p>
        </div>

        <div className="space-y-2 mb-8 h-32 overflow-hidden">
          {bootMessages.map((msg, i) => (
            <div
              key={i}
              className="text-accent/70 text-sm font-mono animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              &gt; {msg}
            </div>
          ))}
        </div>

        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-deep transition-all duration-300"
            style={{ width: `${bootProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
