"use client";

import { Mic, MessageSquare } from "lucide-react";

interface VoiceButtonProps {
  state: "idle" | "listening" | "processing";
  continuousMode: boolean;
  wakeWordEnabled: boolean;
  onPress: () => void;
  onRelease: () => void;
  onToggleChat: () => void;
  onToggleWakeWord: () => void;
  analyser: AnalyserNode | null;
}

export default function VoiceButton({
  state,
  onPress,
  onToggleChat,
}: VoiceButtonProps) {
  return (
    <div className="fixed bottom-28 right-6 flex flex-col gap-3 z-40">
      <button
        onClick={onToggleChat}
        className="w-14 h-14 rounded-full glass-heavy flex items-center justify-center hover:bg-accent/10 transition-all"
        title="Open Chat"
      >
        <MessageSquare size={24} className="text-accent" />
      </button>
      <button
        onMouseDown={onPress}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
          state === "listening"
            ? "bg-accent text-black scale-110 shadow-lg shadow-accent/50"
            : state === "processing"
            ? "bg-accent/50 text-black animate-pulse"
            : "glass-heavy hover:bg-accent/10"
        }`}
        title="Voice Assistant"
      >
        <Mic size={24} className={state === "idle" ? "text-accent" : ""} />
      </button>
    </div>
  );
}
