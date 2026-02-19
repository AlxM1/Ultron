"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PersonaMessage {
  id: string;
  role: "user" | "persona";
  text: string;
  timestamp: number;
}

export default function PersonaChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<PersonaMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [personaName, setPersonaName] = useState("Jason Calacanis");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const infoFetched = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Fetch persona info on first open
  useEffect(() => {
    if (!open || infoFetched.current) return;
    infoFetched.current = true;
    fetch("/api/persona/info")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setPersonaName(data.name);
      })
      .catch(() => {});
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: PersonaMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/persona/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        const reply: PersonaMessage = {
          id: `p-${Date.now()}`,
          role: "persona",
          text: data.response || data.error || "No response.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "persona",
            text: "Connection error. Persona pipeline may be offline.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = inputRef.current?.value.trim();
    if (!val || loading) return;
    sendMessage(val);
    if (inputRef.current) inputRef.current.value = "";
  }

  const AMBER = "#f59e0b";

  return (
    <div
      style={{
        position: "fixed",
        top: 36,
        left: 0,
        bottom: 0,
        width: 360,
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(40px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        zIndex: 120,
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 300ms ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${AMBER}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 32 32"
            fill="none"
            stroke={AMBER}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="16" cy="11" rx="6" ry="7" />
            <path d="M13 17.5C8 18.5 5 22 5 27h22c0-5-3-8.5-8-9.5" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500, color: AMBER }}>
            {personaName}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            all: "unset",
            cursor: "pointer",
            fontSize: 18,
            color: "var(--text-secondary)",
            padding: "0 4px",
          }}
        >
          {"\u00D7"}
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 40,
            }}
          >
            Ask about startups, investing, or tech.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.5,
                background:
                  msg.role === "user" ? "#6c5ce7" : "#1a1a1a",
                border:
                  msg.role === "persona"
                    ? `1px solid ${AMBER}33`
                    : "none",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                fontSize: 13,
                background: "#1a1a1a",
                border: `1px solid ${AMBER}33`,
                color: "var(--text-secondary)",
              }}
            >
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Message Jason Calacanis..."
          disabled={loading}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            opacity: loading ? 0.5 : 1,
          }}
        />
      </form>
    </div>
  );
}
