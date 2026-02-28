"use client";

import { useEffect, useState } from "react";
import {
  Youtube, Search, Twitter, Rss, Mic, Brain, BarChart3, Bot,
  Database, FileText, MessageSquare, Tags, TrendingUp,
  Key, Download, Code, Upload, Volume2, Send,
  Clock, Cpu, CheckCircle2, ListChecks, Eye, RefreshCw,
  ChevronDown, ChevronUp, Activity,
} from "lucide-react";

/* ── Types ── */
interface Step {
  label: string;
  icon: React.ReactNode;
  status: "complete" | "in-progress" | "pending";
}

interface Workflow {
  id: string;
  title: string;
  description: string;
  steps: Step[];
  color: string;        // tailwind color name (rose, orange, sky, etc.)
  borderClass: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
  lineClass: string;
  status: string;
  frequency: string;
  stats: { label: string; value: string }[];
}

interface ApiStats {
  videos: number;
  transcripts: number;
  comments: number;
  redditPosts: number;
  xPosts: number;
  substackPosts: number;
}

/* ── Helpers ── */
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

const ICON_SIZE = 18;

function buildWorkflows(s: ApiStats | null): Workflow[] {
  const v = (n: number | undefined) => fmt(n ?? 0);
  return [
    {
      id: "youtube",
      title: "YouTube Intelligence Pipeline",
      description: "Discovers channels, scrapes video metadata, downloads captions, parses transcripts, and runs sentiment analysis.",
      color: "rose",
      borderClass: "border-rose-500/60",
      bgClass: "bg-rose-500/10",
      textClass: "text-rose-400",
      dotClass: "bg-rose-500",
      lineClass: "bg-rose-500",
      status: "Active",
      frequency: "Daily at 2 AM",
      steps: [
        { label: "Discover Channel", icon: <Youtube size={ICON_SIZE} />, status: "complete" },
        { label: "Scrape Videos", icon: <Download size={ICON_SIZE} />, status: "complete" },
        { label: "Download Captions", icon: <FileText size={ICON_SIZE} />, status: "complete" },
        { label: "Parse Transcripts", icon: <Code size={ICON_SIZE} />, status: "complete" },
        { label: "Store in DB", icon: <Database size={ICON_SIZE} />, status: "complete" },
        { label: "Tag Guests", icon: <Tags size={ICON_SIZE} />, status: "complete" },
        { label: "Sentiment Analysis", icon: <TrendingUp size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Videos", value: s ? v(s.videos) : "24,182" },
        { label: "Transcripts", value: s ? v(s.transcripts) : "7,408" },
        { label: "Comments", value: s ? v(s.comments) : "711K" },
      ],
    },
    {
      id: "reddit",
      title: "Reddit Intelligence Pipeline",
      description: "Searches keywords across subreddits, scrapes posts, classifies sentiment, and cross-references board members.",
      color: "orange",
      borderClass: "border-orange-500/60",
      bgClass: "bg-orange-500/10",
      textClass: "text-orange-400",
      dotClass: "bg-orange-500",
      lineClass: "bg-orange-500",
      status: "Active",
      frequency: "Every 6 hours",
      steps: [
        { label: "Search Keywords", icon: <Search size={ICON_SIZE} />, status: "complete" },
        { label: "Scrape Subreddits", icon: <Download size={ICON_SIZE} />, status: "complete" },
        { label: "Parse Posts", icon: <Code size={ICON_SIZE} />, status: "complete" },
        { label: "Store in DB", icon: <Database size={ICON_SIZE} />, status: "complete" },
        { label: "Sentiment Classification", icon: <TrendingUp size={ICON_SIZE} />, status: "complete" },
        { label: "Cross-ref Board Members", icon: <ListChecks size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Posts", value: s ? v(s.redditPosts) : "12,216" },
      ],
    },
    {
      id: "twitter",
      title: "X/Twitter Intelligence Pipeline",
      description: "Authenticates via cookies, fetches tweets using bird CLI, parses JSON, and upserts to the database.",
      color: "sky",
      borderClass: "border-sky-500/60",
      bgClass: "bg-sky-500/10",
      textClass: "text-sky-400",
      dotClass: "bg-sky-500",
      lineClass: "bg-sky-500",
      status: "Active",
      frequency: "Daily at 3 AM",
      steps: [
        { label: "Authenticate", icon: <Key size={ICON_SIZE} />, status: "complete" },
        { label: "Fetch Tweets", icon: <Twitter size={ICON_SIZE} />, status: "complete" },
        { label: "Parse JSON", icon: <Code size={ICON_SIZE} />, status: "complete" },
        { label: "Upsert to DB", icon: <Database size={ICON_SIZE} />, status: "complete" },
        { label: "Sentiment Classification", icon: <TrendingUp size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Tweets", value: s ? v(s.xPosts) : "551" },
      ],
    },
    {
      id: "substack",
      title: "Substack Intelligence Pipeline",
      description: "Fetches RSS feeds, parses Atom/XML, extracts content, and stores in the database.",
      color: "amber",
      borderClass: "border-amber-500/60",
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-400",
      dotClass: "bg-amber-500",
      lineClass: "bg-amber-500",
      status: "Active",
      frequency: "Daily at 6 AM",
      steps: [
        { label: "Fetch RSS Feeds", icon: <Rss size={ICON_SIZE} />, status: "complete" },
        { label: "Parse Atom/XML", icon: <Code size={ICON_SIZE} />, status: "complete" },
        { label: "Extract Content", icon: <FileText size={ICON_SIZE} />, status: "complete" },
        { label: "Store in DB", icon: <Database size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Posts", value: s ? v(s.substackPosts) : "111" },
      ],
    },
    {
      id: "voice",
      title: "Voice Cloning Pipeline",
      description: "Processes reference audio through XTTS v2, generates voice profiles, and serves cloned voices via API.",
      color: "violet",
      borderClass: "border-violet-500/60",
      bgClass: "bg-violet-500/10",
      textClass: "text-violet-400",
      dotClass: "bg-violet-500",
      lineClass: "bg-violet-500",
      status: "Active",
      frequency: "On-demand",
      steps: [
        { label: "Upload Audio", icon: <Upload size={ICON_SIZE} />, status: "complete" },
        { label: "XTTS v2 Processing", icon: <Cpu size={ICON_SIZE} />, status: "complete" },
        { label: "Generate Profile", icon: <Mic size={ICON_SIZE} />, status: "complete" },
        { label: "Store WAV", icon: <Database size={ICON_SIZE} />, status: "complete" },
        { label: "Serve via API", icon: <Volume2 size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Voice Profiles", value: "20" },
      ],
    },
    {
      id: "persona",
      title: "Persona Engine Pipeline",
      description: "Loads transcripts, builds context windows, generates responses via Ollama, with optional TTS delivery.",
      color: "amber",
      borderClass: "border-yellow-500/60",
      bgClass: "bg-yellow-500/10",
      textClass: "text-yellow-400",
      dotClass: "bg-yellow-500",
      lineClass: "bg-yellow-500",
      status: "Active",
      frequency: "On-demand",
      steps: [
        { label: "Load Transcripts", icon: <FileText size={ICON_SIZE} />, status: "complete" },
        { label: "Build Context", icon: <Brain size={ICON_SIZE} />, status: "complete" },
        { label: "Ollama (llama3.1:8b)", icon: <Cpu size={ICON_SIZE} />, status: "complete" },
        { label: "Generate Response", icon: <MessageSquare size={ICON_SIZE} />, status: "complete" },
        { label: "TTS (optional)", icon: <Volume2 size={ICON_SIZE} />, status: "complete" },
        { label: "Deliver", icon: <Send size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Personas", value: "20" },
      ],
    },
    {
      id: "sentiment",
      title: "Sentiment Analysis Pipeline",
      description: "Collects comments, classifies by keyword, scores sentiment, and aggregates by creator, topic, and timeline.",
      color: "emerald",
      borderClass: "border-emerald-500/60",
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-400",
      dotClass: "bg-emerald-500",
      lineClass: "bg-emerald-500",
      status: "Active",
      frequency: "Real-time on API call",
      steps: [
        { label: "Collect Comments", icon: <MessageSquare size={ICON_SIZE} />, status: "complete" },
        { label: "Keyword Classification", icon: <Tags size={ICON_SIZE} />, status: "complete" },
        { label: "Score Sentiment", icon: <BarChart3 size={ICON_SIZE} />, status: "complete" },
        { label: "Aggregate by Creator", icon: <ListChecks size={ICON_SIZE} />, status: "complete" },
        { label: "Aggregate by Topic", icon: <ListChecks size={ICON_SIZE} />, status: "complete" },
        { label: "Timeline Analysis", icon: <Clock size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Items Analyzed", value: s ? v(s.comments) : "724K+" },
      ],
    },
    {
      id: "coordinator",
      title: "Content Scraping Coordinator",
      description: "Checks task queues, identifies content gaps, spawns sub-agents, monitors progress, and verifies output.",
      color: "cyan",
      borderClass: "border-cyan-500/60",
      bgClass: "bg-cyan-500/10",
      textClass: "text-cyan-400",
      dotClass: "bg-cyan-500",
      lineClass: "bg-cyan-500",
      status: "Active",
      frequency: "Every 30 min",
      steps: [
        { label: "Task Queue Check", icon: <ListChecks size={ICON_SIZE} />, status: "complete" },
        { label: "Identify Gaps", icon: <Search size={ICON_SIZE} />, status: "complete" },
        { label: "Spawn Sub-agents", icon: <Bot size={ICON_SIZE} />, status: "complete" },
        { label: "Monitor Progress", icon: <Eye size={ICON_SIZE} />, status: "complete" },
        { label: "Verify Output", icon: <CheckCircle2 size={ICON_SIZE} />, status: "complete" },
        { label: "Update Queue", icon: <RefreshCw size={ICON_SIZE} />, status: "complete" },
      ],
      stats: [
        { label: "Agents Spawned", value: "60+" },
      ],
    },
  ];
}

/* ── Step Node ── */
function StepNode({ step, borderClass, bgClass, textClass }: {
  step: Step;
  borderClass: string;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
      <div className={`relative w-12 h-12 rounded-full border-2 ${borderClass} ${bgClass} flex items-center justify-center ${textClass}`}>
        {step.icon}
        {/* status dot */}
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-950 ${
          step.status === "complete" ? "bg-emerald-500" :
          step.status === "in-progress" ? "bg-amber-500" : "bg-zinc-600"
        }`} />
      </div>
      <span className="text-[10px] leading-tight text-center text-zinc-500 dark:text-zinc-400 max-w-[80px]">
        {step.label}
      </span>
    </div>
  );
}

/* ── Connector Line ── */
function Connector({ lineClass }: { lineClass: string }) {
  return (
    <div className="flex items-center self-start mt-[22px]">
      <div className={`w-6 sm:w-10 h-0.5 ${lineClass} opacity-40`} />
      {/* arrow */}
      <div className={`w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] ${lineClass.replace("bg-", "border-l-")} opacity-40`} />
    </div>
  );
}

/* ── Workflow Card ── */
function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {workflow.title}
            </h3>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
              <Activity size={10} />
              {workflow.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {workflow.description}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:block">
            {workflow.frequency}
          </span>
          {expanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
        </div>
      </button>

      {/* Pipeline visualization */}
      <div className={`px-5 overflow-x-auto transition-all ${expanded ? "pb-4" : "pb-4"}`}>
        <div className="flex items-start gap-0 py-2 min-w-max">
          {workflow.steps.map((step, i) => (
            <div key={i} className="flex items-start">
              <StepNode
                step={step}
                borderClass={workflow.borderClass}
                bgClass={workflow.bgClass}
                textClass={workflow.textClass}
              />
              {i < workflow.steps.length - 1 && (
                <Connector lineClass={workflow.lineClass} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {workflow.description}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {workflow.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  step.status === "complete" ? "bg-emerald-500" :
                  step.status === "in-progress" ? "bg-amber-500" : "bg-zinc-600"
                }`} />
                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{String(i + 1).padStart(2, "0")}</span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 flex-wrap">
        {workflow.stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{stat.label}</span>
            <span className="text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-200">{stat.value}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 sm:hidden">
          <Clock size={10} />
          {workflow.frequency}
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function WorkflowsPage() {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.stats) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const workflows = buildWorkflows(stats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Workflows
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Automated intelligence pipelines powering the platform
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">{workflows.length} pipelines active</span>
        </div>
        {loading && (
          <span className="text-zinc-400 dark:text-zinc-500 font-mono">Loading live stats...</span>
        )}
      </div>

      {/* Workflow cards */}
      <div className="space-y-4">
        {workflows.map((w) => (
          <WorkflowCard key={w.id} workflow={w} />
        ))}
      </div>
    </div>
  );
}
