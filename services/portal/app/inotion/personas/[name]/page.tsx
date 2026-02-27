"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, MessageSquare, Quote } from "lucide-react";

interface Profile {
  name?: string;
  transcript_count?: number;
  communication_style?: string;
  top_topics?: string[];
  catchphrases?: string[];
  top_quotes?: string[];
  worldview?: string;
  decision_framework?: string;
  [key: string]: unknown;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export default function PersonaDetailPage() {
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch(`/api/personas/${encodeURIComponent(name)}/profile`)
      .then((r) => r.json())
      .then((data) => setProfile(data))
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [name]);

  async function askPersona() {
    if (!query.trim() || chatLoading) return;
    const q = query;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(name)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.response || data.message || JSON.stringify(data) }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Error reaching persona engine." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href="/inotion/personas" className="text-zinc-500 hover:text-amber-400 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid gap-6">
        {loading && <p className="text-zinc-500 animate-pulse">Loading profile...</p>}
        {error && <p className="text-rose-400">{error}</p>}

        {profile && (
          <>
            {/* Profile Overview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-amber-400">{profile.name || name}</h2>
                {profile.transcript_count !== undefined && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                    <MessageSquare className="inline mr-1" size={12} />
                    {profile.transcript_count} transcripts
                  </span>
                )}
              </div>
              {profile.communication_style && (
                <div className="mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Communication Style</h3>
                  <p className="text-zinc-300 text-sm">{profile.communication_style}</p>
                </div>
              )}
              {profile.worldview && (
                <div className="mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Worldview</h3>
                  <p className="text-zinc-300 text-sm">{profile.worldview}</p>
                </div>
              )}
              {profile.decision_framework && (
                <div className="mb-4">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Decision Framework</h3>
                  <p className="text-zinc-300 text-sm">{profile.decision_framework}</p>
                </div>
              )}
            </div>

            {/* Topics */}
            {profile.top_topics && profile.top_topics.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.top_topics.map((t) => (
                    <span key={t} className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg text-sm">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Catchphrases */}
            {profile.catchphrases && profile.catchphrases.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  <Quote className="inline mr-1.5" size={14} />Catchphrases
                </h3>
                <div className="grid gap-2">
                  {profile.catchphrases.map((c, i) => (
                    <p key={i} className="text-zinc-300 text-sm italic border-l-2 border-amber-500/30 pl-3">"{c}"</p>
                  ))}
                </div>
              </div>
            )}

            {/* Top Quotes */}
            {profile.top_quotes && profile.top_quotes.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Quotes</h3>
                <div className="grid gap-2">
                  {profile.top_quotes.map((q, i) => (
                    <p key={i} className="text-zinc-300 text-sm border-l-2 border-zinc-700 pl-3">"{q}"</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Chat with Persona */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Ask {name}
          </h3>
          {messages.length > 0 && (
            <div className="mb-4 max-h-80 overflow-y-auto space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === "user" ? "text-zinc-400" : "text-zinc-200"}`}>
                  <span className={`font-semibold ${m.role === "user" ? "text-zinc-500" : "text-amber-400"}`}>
                    {m.role === "user" ? "You" : name}:
                  </span>{" "}
                  <span className="whitespace-pre-wrap">{m.text}</span>
                </div>
              ))}
              {chatLoading && <Loader2 className="animate-spin text-amber-400" size={16} />}
            </div>
          )}
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askPersona()}
              placeholder={`Ask ${name} a question...`}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
            />
            <button
              onClick={askPersona}
              disabled={chatLoading || !query.trim()}
              className="px-4 py-2.5 bg-amber-500 text-zinc-950 rounded-lg font-medium hover:bg-amber-400 disabled:opacity-40 transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
