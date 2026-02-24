// CollectionCard.tsx — Collection summary card for INotion dashboard

interface CollectionCardProps {
  name: string;
  description?: string;
  documentCount?: number;
  updatedAt?: string;
  color?: string;
  onClick?: () => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CollectionCard({
  name,
  description,
  documentCount,
  updatedAt,
  color,
  onClick,
}: CollectionCardProps) {
  const accentColor = color || "#6366f1";

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-white dark:bg-zinc-900
        border border-zinc-200 dark:border-zinc-800
        rounded-xl p-5 shadow-sm
        transition-all duration-200
        ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}
      `}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-70"
        style={{ backgroundColor: accentColor }}
      />

      <div className="pl-3">
        {/* Name */}
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate mb-1">
          {name}
        </p>

        {/* Description */}
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
            {documentCount !== undefined ? (
              <>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {documentCount}
                </span>{" "}
                {documentCount === 1 ? "doc" : "docs"}
              </>
            ) : (
              "—"
            )}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {formatDate(updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
