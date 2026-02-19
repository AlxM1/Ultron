"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  open: boolean;
  messages: Message[];
  model: string;
  onModelChange: (model: string) => void;
  onSend: (message: string) => void;
  onClose: () => void;
}

export default function ChatPanel({
  open,
  messages,
  onSend,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed right-6 bottom-28 w-96 h-[500px] glass-heavy rounded-panel flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-semibold text-white/90">Voice Assistant</h3>
        <button
          onClick={onClose}
          className="hover:bg-white/10 p-1 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-white/30 mt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-accent text-black"
                    : "bg-white/5 text-white/90"
                }`}
              >
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs opacity-50 mt-1">
                  {msg.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-button bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-button bg-accent text-black hover:bg-accent/80 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
