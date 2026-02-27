"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Send, Loader2 } from "lucide-react";

interface BoardResponse {
  consensus?: string;
  perspectives?: { name: string; response: string }[];
  error?: string;
}

export default function BoardPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function askBoard() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/personas/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Failed to reach Persona Engine" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href="/inotion/personas" className="text-zinc-500 hover:text-amber-400 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          <Brain className="inline mr-2 text-amber-400" size={20} />
          Board of Directors
        </h1>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Query Input */}
        <div className="flex gap-3 mb-8">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askBoard()}
            placeholder="Ask the Board a question..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition"
          />
          <button
            onClick={askBoard}
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-amber-500 text-zinc-950 rounded-lg font-medium hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Ask
          </button>
        </div>

        {result?.error && <p className="text-rose-400 mb-4">{result.error}</p>}

        {/* Consensus */}
        {result?.consensus && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Consensus</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.consensus}</p>
          </div>
        )}

        {/* Perspectives */}
        {result?.perspectives && (
          <div className="grid gap-4">
            {result.perspectives.map((p) => (
              <div key={p.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-amber-400 font-semibold mb-2">{p.name}</h3>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{p.response}</p>
              </div>
            ))}
          </div>
        )}

        {!result && !loading && (
          <p className="text-zinc-600 text-center mt-16">
            Ask a strategic question and get perspectives from every persona in the board.
          </p>
        )}
      </div>
    </div>
  );
}
