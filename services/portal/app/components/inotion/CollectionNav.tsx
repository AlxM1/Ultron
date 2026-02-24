// CollectionNav.tsx — Sidebar navigation for Outline collections

"use client";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  documentCount?: number;
  color?: string;
}

interface CollectionNavProps {
  collections: Collection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

// Minimal document icon SVG
function DocIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="text-zinc-400 dark:text-zinc-500 flex-shrink-0"
    >
      <path
        d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V6l-5-5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 1v5h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CollectionNav({ collections, activeId, onSelect }: CollectionNavProps) {
  return (
    <nav className="w-56 flex-shrink-0">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-3 mb-3">
        Collections
      </p>
      <ul className="space-y-0.5">
        {collections.map((col) => {
          const isActive = col.id === activeId;
          return (
            <li key={col.id}>
              <button
                onClick={() => onSelect(col.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors duration-150 ${
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <DocIcon />
                <span className="flex-1 truncate">{col.name}</span>
                {col.documentCount !== undefined && (
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                    {col.documentCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
