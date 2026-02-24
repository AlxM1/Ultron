// KPICard.tsx — Clean metric cards for INotion dashboard

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export default function KPICard({ label, value, sub, trend, trendValue }: KPICardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-500 dark:text-zinc-400";

  const trendSign = trend === "up" ? "+" : trend === "down" ? "-" : "";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:-translate-y-px hover:shadow-md transition-all duration-200">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
        {label}
      </p>
      <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none mb-2">
        {value}
      </p>
      {(sub || trendValue) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</span>
          )}
          {trendValue && (
            <span className={`text-xs font-medium font-mono ${trendColor}`}>
              {trendSign}{trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
