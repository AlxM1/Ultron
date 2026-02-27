"use client";

import { useEffect, useState } from "react";

interface Container {
  name: string;
  status: string;
  image: string;
  ports: string;
}

export default function InfrastructurePage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/infrastructure");
      const data = await res.json();
      if (data.error) setError(data.error);
      setContainers(data.containers || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const isUp = (status: string) => status.toLowerCase().includes("up");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Infrastructure</h1>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : (
          <div className="grid gap-3">
            {containers.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isUp(c.status) ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-zinc-500">{c.image}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-400">{c.status}</p>
                  {c.ports && (
                    <p className="text-xs text-zinc-600 font-mono">{c.ports}</p>
                  )}
                </div>
              </div>
            ))}
            {containers.length === 0 && !error && (
              <p className="text-zinc-500">No containers found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
