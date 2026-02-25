"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2, FileText, ExternalLink } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  collectionName: string;
  url: string | null;
  updatedAt: string | null;
}

function formatAge(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("Search unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  }

  function openSearch() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError(null);
  }

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) closeSearch();
        else openSearch();
      }
      if (e.key === "Escape" && open) closeSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={openSearch}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all text-sm"
      >
        <Search size={13} />
        <span className="hidden sm:inline text-xs">Search docs...</span>
        <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-zinc-400 dark:text-zinc-500">
          ⌘K
        </kbd>
      </button>

      {/* Search overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}
        >
          <div className="w-full max-w-2xl mx-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              {loading ? (
                <Loader2 size={16} className="text-zinc-400 animate-spin flex-shrink-0" />
              ) : (
                <Search size={16} className="text-zinc-400 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Search knowledge base..."
                className="flex-1 text-sm bg-transparent outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X size={14} />
                </button>
              )}
              <button
                onClick={closeSearch}
                className="text-[10px] px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-mono"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {error && (
                <div className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                  {error} — Check Outline connectivity
                </div>
              )}

              {!loading && query && results.length === 0 && !error && (
                <div className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {!query && (
                <div className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  Type to search transcripts, documents, and creator profiles
                </div>
              )}

              {results.map((result) => (
                <a
                  key={result.id}
                  href={result.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeSearch}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0 group"
                >
                  <FileText size={14} className="text-zinc-300 dark:text-zinc-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors line-clamp-1">
                        {result.title}
                      </span>
                      <ExternalLink size={10} className="text-zinc-300 dark:text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {result.collectionName && (
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">{result.collectionName}</div>
                    )}
                    {result.snippet && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">{result.snippet}</p>
                    )}
                  </div>
                  {result.updatedAt && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono flex-shrink-0 mt-0.5">
                      {formatAge(result.updatedAt)}
                    </span>
                  )}
                </a>
              ))}
            </div>

            {results.length > 0 && (
              <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
                {results.length} result{results.length !== 1 ? "s" : ""} from Outline knowledge base
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
