"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, TrendingUp, HelpCircle, Flame, AlertTriangle, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import ThemeToggle from "../../components/inotion/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_COMMENTS_API || "/api/comments";
const AMBER = "#f59e0b";
const CYAN = "#06b6d4";

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent = "amber" }: { icon: React.ReactNode; label: string; value: string; accent?: "amber" | "cyan" }) {
  const colors = accent === "cyan"
    ? { bg: "bg-cyan-500/10", text: "text-cyan-500" }
    : { bg: "bg-amber-500/10", text: "text-amber-500" };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4 hover:border-zinc-700 transition-colors">
      <div className={`p-2.5 ${colors.bg} rounded-lg ${colors.text}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-zinc-100 tabular-nums">{value}</div>
        <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-zinc-300 font-medium mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="text-zinc-100 font-medium">
            {typeof p.value === "number" ? (p.value < 1 ? (p.value * 100).toFixed(1) + "%" : p.value.toLocaleString()) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [painPoints, setPainPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sentRes, qRes, ppRes] = await Promise.allSettled([
          fetch(`${API_BASE}/sentiment`).then(r => r.json()),
          fetch(`${API_BASE}/questions`).then(r => r.json()),
          fetch(`${API_BASE}/pain-points`).then(r => r.json()),
        ]);
        if (sentRes.status === "fulfilled" && !sentRes.value.error) {
          setSentimentData(sentRes.value.trend || []);
          if (sentRes.value.stats) setStats(sentRes.value.stats);
        }
        if (qRes.status === "fulfilled" && !qRes.value.error) {
          setQuestions(qRes.value.questions?.slice(0, 10) || []);
        }
        if (ppRes.status === "fulfilled" && !ppRes.value.error) {
          setPainPoints(ppRes.value.painPoints || []);
        }
      } catch {
        // API unavailable
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading comment intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/inotion" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} />
              INotion
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-sm font-semibold text-amber-500">Comment Intelligence</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <Link href="/inotion/comments/opportunities" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Opportunities
              </Link>
              <Link href="/inotion/comments/compare" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Compare
              </Link>
              <Link href="/inotion/comments/trending" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Trending
              </Link>
              <Link href="/inotion/comments/keywords" className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors border border-zinc-700">
                Keywords
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-10">
        {/* Hero Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<MessageSquare size={18} />} label="Total Comments Analyzed" value={stats?.totalComments?.toLocaleString() || "--"} />
          <StatCard icon={<TrendingUp size={18} />} label="Avg Sentiment" value={stats?.avgSentiment || "--"} accent="cyan" />
          <StatCard icon={<HelpCircle size={18} />} label="Questions Found" value={stats?.questionsFound?.toLocaleString() || "--"} />
          <StatCard icon={<Flame size={18} />} label="Trending Topics" value={stats?.trendingTopics || "--"} accent="cyan" />
        </div>

        {/* Sentiment Trend Chart */}
        <section>
          <SectionHeader title="Sentiment Trend" subtitle="30-day rolling sentiment across all tracked creators" />
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {sentimentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sentimentData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} dot={false} name="Positive" />
                    <Line type="monotone" dataKey="neutral" stroke={AMBER} strokeWidth={2} dot={false} name="Neutral" />
                    <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Negative" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-3 justify-center">
                  {[{ label: "Positive", color: "#22c55e" }, { label: "Neutral", color: AMBER }, { label: "Negative", color: "#ef4444" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">No sentiment data available</div>
            )}
          </div>
        </section>

        {/* Two Column Layout: Opportunities + Pain Points */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top 10 Content Opportunities */}
          <section>
            <SectionHeader
              title="Top Content Opportunities"
              subtitle="Questions audiences keep asking"
              action={
                <Link href="/inotion/comments/opportunities" className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
                  View All
                </Link>
              }
            />
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {questions.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-zinc-500 uppercase tracking-wider font-medium">#</th>
                      <th className="text-left px-4 py-3 text-zinc-500 uppercase tracking-wider font-medium">Question Theme</th>
                      <th className="text-right px-4 py-3 text-zinc-500 uppercase tracking-wider font-medium">Frequency</th>
                      <th className="text-right px-4 py-3 text-zinc-500 uppercase tracking-wider font-medium">Creators</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => (
                      <tr key={i} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/50"}`}>
                        <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-2.5 text-zinc-200">{q.theme}</td>
                        <td className="px-4 py-2.5 text-right text-amber-500 font-medium tabular-nums">{q.count.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{q.creators}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">No question data available</div>
              )}
            </div>
          </section>

          {/* Pain Points */}
          <section>
            <SectionHeader title="Pain Point Radar" subtitle="Top audience frustrations by intensity" />
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              {painPoints.length > 0 ? (
                <div className="space-y-4">
                  {painPoints.map((pp, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={12} className={pp.intensity > 80 ? "text-red-400" : pp.intensity > 60 ? "text-amber-400" : "text-zinc-500"} />
                          <span className="text-xs text-zinc-200">{pp.topic}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 tabular-nums">{pp.mentions.toLocaleString()} mentions</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pp.intensity}%`,
                            background: pp.intensity > 80
                              ? "linear-gradient(to right, #ef4444, #dc2626)"
                              : pp.intensity > 60
                              ? `linear-gradient(to right, ${AMBER}, #d97706)`
                              : `linear-gradient(to right, ${CYAN}, #0891b2)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">No pain point data available</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
