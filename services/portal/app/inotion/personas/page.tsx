"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, MessageSquare, Brain } from "lucide-react";

interface Persona {
  name: string;
  transcript_count?: number;
  top_topics?: string[];
  communication_style?: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/personas/")
      .then((r) => r.json())
      .then((data) => {
        setPersonas(Array.isArray(data) ? data : data.creators || data.personas || []);
      })
      .catch(() => setError("Failed to reach Persona Engine"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          <Users className="inline mr-2 text-amber-400" size={20} />
          Persona Engine
        </h1>
        <Link
          href="/inotion/personas/board"
          className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 transition text-sm font-medium"
        >
          <Brain className="inline mr-1.5" size={16} />
          Board of Directors
        </Link>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {loading && <p className="text-zinc-500 animate-pulse">Loading personas...</p>}
        {error && <p className="text-rose-400">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((p) => (
            <Link
              key={p.name}
              href={`/inotion/personas/${encodeURIComponent(p.name)}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-amber-500/40 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-amber-400 transition">
                  {p.name}
                </h3>
                {p.transcript_count !== undefined && (
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                    <MessageSquare className="inline mr-1" size={12} />
                    {p.transcript_count}
                  </span>
                )}
              </div>
              {p.communication_style && (
                <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{p.communication_style}</p>
              )}
              {p.top_topics && p.top_topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.top_topics.slice(0, 5).map((t) => (
                    <span key={t} className="text-xs bg-amber-500/10 text-amber-400/80 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {!loading && !error && personas.length === 0 && (
          <p className="text-zinc-600 text-center mt-12">No personas found. Ingest some transcripts first.</p>
        )}
      </div>
    </div>
  );
}
