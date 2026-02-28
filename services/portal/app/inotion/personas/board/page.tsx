"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Mic, Square, Volume2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface Member {
  name: string;
  role: string;
  group: "board" | "advisor" | "bonus";
  transcripts: number;
  contentCount: number;
  voice: boolean;
  topics: string[];
  style: string;
  catchphrases: string[];
  quotes: string[];
  totalWords: number;
  profileUpdated: string | null;
}

interface Perspective {
  name: string;
  member?: string;
  response: string;
  source?: string;
}

interface BoardResponse {
  consensus?: string;
  board_perspectives?: Perspective[];
  perspectives?: Perspective[];
  error?: string;
}

interface HistoryEntry {
  question: string;
  perspectives: Perspective[];
  timestamp: number;
}

const EXAMPLE_QUESTIONS = [
  "Should I raise VC funding or bootstrap?",
  "What's the biggest opportunity in AI right now?",
  "How do I build a personal brand?",
];

/* ── Helpers ───────────────────────────────────────────── */

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
}

function avatarGradient(group: Member["group"]) {
  if (group === "advisor") return "from-cyan-600 to-cyan-400";
  return "from-amber-600 to-amber-400";
}

/* ── Voice Recording Hook ──────────────────────────────── */

function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      console.error("Mic access denied");
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state !== "recording") {
        resolve("");
        return;
      }
      mediaRecorder.current.onstop = async () => {
        setRecording(false);
        setTranscribing(true);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const res = await fetch("/api/personas/voice/stt", { method: "POST", body: formData });
          const data = await res.json();
          resolve(data.text || "");
        } catch {
          resolve("");
        } finally {
          setTranscribing(false);
          mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
        }
      };
      mediaRecorder.current.stop();
    });
  }, []);

  return { recording, transcribing, startRecording, stopRecording };
}

/* ── Audio Player Hook ─────────────────────────────────── */

function useAudioPlayer() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (name: string, text: string) => {
    setPlaying(name);
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(name)}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!res.ok) { setPlaying(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPlaying(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setPlaying(null);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(null);
  }, []);

  return { playing, playAudio, stop };
}

/* ── Component ─────────────────────────────────────────── */

export default function BoardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [visibleCards, setVisibleCards] = useState<number>(0);
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [memberResponse, setMemberResponse] = useState<{ name: string; text: string } | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const responsesRef = useRef<HTMLDivElement>(null);

  const boardVoice = useVoiceRecorder();
  const memberVoice = useVoiceRecorder();
  const audio = useAudioPlayer();

  // Load board members from API
  useEffect(() => {
    fetch("/api/personas/board/members")
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        setOnline(true);
      })
      .catch(() => setOnline(false))
      .finally(() => setMembersLoading(false));
  }, []);

  // Stagger card animations
  useEffect(() => {
    const perspectives = result?.board_perspectives || result?.perspectives || [];
    if (!perspectives.length) { setVisibleCards(0); return; }
    setVisibleCards(0);
    const total = perspectives.length;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCards(i);
      if (i >= total) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, [result]);

  async function askBoard(question?: string) {
    const q = question || query;
    if (!q.trim() || loading || !online) return;
    setLoading(true);
    setResult(null);
    setQuery(q);
    try {
      const res = await fetch("/api/personas/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setResult(data);
      const perspectives = data.board_perspectives || data.perspectives || [];
      if (perspectives.length) {
        setHistory((h) => [{ question: q, perspectives, timestamp: Date.now() }, ...h].slice(0, 5));
      }
      setTimeout(() => responsesRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch {
      setResult({ error: "Failed to reach Persona Engine" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRoundtableMic() {
    if (boardVoice.recording) {
      const text = await boardVoice.stopRecording();
      if (text) { setQuery(text); askBoard(text); }
    } else {
      boardVoice.startRecording();
    }
  }

  async function handleMemberMic(member: Member) {
    if (memberVoice.recording && activeMember === member.name) {
      const text = await memberVoice.stopRecording();
      if (text) {
        setMemberLoading(true);
        setMemberResponse(null);
        try {
          const res = await fetch(`/api/personas/${encodeURIComponent(member.name)}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: text }),
          });
          const data = await res.json();
          const responseText = data.response || data.text || JSON.stringify(data);
          setMemberResponse({ name: member.name, text: responseText });
          if (member.voice) { audio.playAudio(member.name, text); }
        } catch {
          setMemberResponse({ name: member.name, text: "Failed to get response." });
        } finally {
          setMemberLoading(false);
        }
      }
      setActiveMember(null);
    } else {
      setActiveMember(member.name);
      memberVoice.startRecording();
    }
  }

  async function playRoundtable() {
    const perspectives = result?.board_perspectives || result?.perspectives || [];
    for (const p of perspectives) {
      const member = members.find((m) => m.name === (p.name || p.member));
      if (member?.voice) {
        await new Promise<void>((resolve) => {
          audio.playAudio(p.name || p.member || "", p.response);
          const check = setInterval(() => {
            if (!audio.playing) { clearInterval(check); resolve(); }
          }, 500);
          setTimeout(() => { clearInterval(check); resolve(); }, 60000);
        });
      }
    }
  }

  const boardMembers = members.filter((m) => m.group === "board");
  const advisors = members.filter((m) => m.group === "advisor");
  const bonus = members.filter((m) => m.group === "bonus");
  const perspectives = result?.board_perspectives || result?.perspectives || [];
  const totalTranscripts = members.reduce((s, m) => s + m.transcripts, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto py-6 sm:py-10">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">Board of Directors</h1>
          <p className="text-zinc-400 text-lg">
            {membersLoading ? "Loading..." : `${members.length} personas. ${totalTranscripts.toLocaleString()} transcripts. Real perspectives.`}
          </p>
          <div className="mt-5 mx-auto w-48 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        </section>

        {membersLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={32} />
          </div>
        ) : (
          <>
            {/* ── Board Members Grid ───────────────────────── */}
            {boardMembers.length > 0 && <MemberSection title="Board Members" members={boardMembers} count={boardMembers.length} onMemberMic={handleMemberMic} activeMember={activeMember} memberVoice={memberVoice} audio={audio} memberLoading={memberLoading} />}
            {advisors.length > 0 && <MemberSection title="Advisors" members={advisors} count={advisors.length} onMemberMic={handleMemberMic} activeMember={activeMember} memberVoice={memberVoice} audio={audio} memberLoading={memberLoading} />}
            {bonus.length > 0 && <MemberSection title="Bonus" members={bonus} count={bonus.length} onMemberMic={handleMemberMic} activeMember={activeMember} memberVoice={memberVoice} audio={audio} memberLoading={memberLoading} />}
          </>
        )}

        {/* ── Individual Member Response ────────────────── */}
        {memberResponse && (
          <div className="max-w-3xl mx-auto mb-8 bg-zinc-900 border border-amber-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-400 flex items-center justify-center text-xs font-bold text-zinc-950">
                {initials(memberResponse.name)}
              </div>
              <h4 className="font-semibold text-amber-400">{memberResponse.name}</h4>
              {audio.playing === memberResponse.name && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Volume2 size={14} className="animate-pulse" />
                  <span className="text-xs">Speaking...</span>
                </div>
              )}
            </div>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{memberResponse.text}</p>
          </div>
        )}

        {/* ── Ask Section ──────────────────────────────── */}
        <section className="mt-16 mb-12">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-2xl font-semibold">Ask the Board</h2>
              <button
                onClick={handleRoundtableMic}
                disabled={loading || boardVoice.transcribing}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  boardVoice.recording
                    ? "bg-rose-500 text-white animate-pulse hover:bg-rose-400"
                    : boardVoice.transcribing
                    ? "bg-zinc-700 text-zinc-400 cursor-wait"
                    : "bg-zinc-800 text-zinc-400 hover:bg-amber-500/20 hover:text-amber-400"
                }`}
                title={boardVoice.recording ? "Stop recording" : "Ask with voice"}
              >
                {boardVoice.recording ? <Square size={16} /> : boardVoice.transcribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
              </button>
            </div>
            <p className="text-zinc-500 text-center mb-6">
              {boardVoice.recording ? "Listening... click to stop" : boardVoice.transcribing ? "Transcribing..." : "Ask a strategic question and get perspectives from every persona."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askBoard()}
                placeholder={online ? "Ask the Board a question..." : "Board offline"}
                disabled={!online}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 sm:px-5 py-3 sm:py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 focus:shadow-[0_0_0_1px_rgba(245,158,11,0.3)] transition disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => askBoard()}
                disabled={loading || !query.trim() || !online}
                className="px-6 py-3 sm:py-3.5 bg-amber-500 text-zinc-950 rounded-lg font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shrink-0"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Ask
              </button>
            </div>
            {loading && (
              <p className="text-zinc-500 text-sm text-center mt-3 animate-pulse">Querying board members...</p>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {result?.error && <p className="text-rose-400 text-center mb-6">{result.error}</p>}

        {/* ── Perspectives ── */}
        {perspectives.length > 0 && (
          <div ref={responsesRef} className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Board Responses</h3>
              <button onClick={playRoundtable} disabled={!!audio.playing} className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 transition">
                <Volume2 size={14} /> Play All Voices
              </button>
            </div>
            <div className="space-y-4">
              {perspectives.map((p, i) => {
                const name = p.name || p.member || "Unknown";
                const member = members.find((m) => m.name === name);
                const group = member?.group ?? "board";
                const isSpeaking = audio.playing === name;
                return (
                  <div key={name} className={`bg-zinc-900 border rounded-xl p-5 flex gap-4 transition-all duration-500 ${isSpeaking ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-zinc-800"} ${i < visibleCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(group)} flex items-center justify-center text-sm font-bold text-zinc-950 shrink-0 ${isSpeaking ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950" : ""}`}>
                      {initials(name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-amber-400">{name}</h4>
                        {isSpeaking && <Volume2 size={14} className="text-amber-400 animate-pulse" />}
                        {member?.voice && !isSpeaking && (
                          <button onClick={() => audio.playAudio(name, p.response)} className="text-zinc-600 hover:text-amber-400 transition" title="Play voice">
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{p.response}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Consensus ── */}
        {result?.consensus && (
          <div className="max-w-3xl mx-auto bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Consensus</h3>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.consensus}</p>
          </div>
        )}

        {/* ── Example Questions ── */}
        {!loading && !result && (
          <section className="max-w-3xl mx-auto mt-8">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 text-center">
              {history.length > 0 ? "Recent Questions" : "Example Questions"}
            </h3>
            <div className="grid gap-3">
              {history.length > 0
                ? history.slice(0, 3).map((h, i) => (
                    <button key={i} onClick={() => setQuery(h.question)} className="text-left bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-3 text-zinc-300 hover:border-amber-500/30 hover:text-zinc-100 transition">
                      {h.question}
                    </button>
                  ))
                : EXAMPLE_QUESTIONS.map((q, i) => (
                    <button key={i} onClick={() => setQuery(q)} className="text-left bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-3 text-zinc-300 hover:border-amber-500/30 hover:text-zinc-100 transition">
                      {q}
                    </button>
                  ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Member Section ────────────────────────────────────── */

interface MemberSectionProps {
  title: string;
  members: Member[];
  count: number;
  onMemberMic: (m: Member) => void;
  activeMember: string | null;
  memberVoice: { recording: boolean; transcribing: boolean };
  audio: { playing: string | null };
  memberLoading: boolean;
}

function MemberSection({ title, members, count, onMemberMic, activeMember, memberVoice, audio, memberLoading }: MemberSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-zinc-300">{title}</h2>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {members.map((m) => (
          <MemberCard key={m.name} member={m} onMic={() => onMemberMic(m)} isRecording={activeMember === m.name && memberVoice.recording} isTranscribing={activeMember === m.name && memberVoice.transcribing} isLoading={activeMember === m.name && memberLoading} isSpeaking={audio.playing === m.name} />
        ))}
      </div>
    </section>
  );
}

/* ── Member Card with Hover Popup ──────────────────────── */

interface MemberCardProps {
  member: Member;
  onMic: () => void;
  isRecording: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
}

function MemberCard({ member, onMic, isRecording, isTranscribing, isLoading, isSpeaking }: MemberCardProps) {
  const { name, role, transcripts, voice, group, topics, style, catchphrases } = member;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative bg-zinc-900 border rounded-xl p-4 hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-200 ${isSpeaking ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.12)]" : "border-zinc-800"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setHovered(!hovered)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(group)} flex items-center justify-center text-sm font-bold text-zinc-950 shrink-0 ${isSpeaking ? "ring-2 ring-amber-400" : ""}`}>
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-100 truncate text-sm">{name}</h3>
            <span className={`w-2 h-2 rounded-full shrink-0 ${voice ? "bg-emerald-400" : "bg-zinc-600"}`} />
          </div>
          <p className="text-xs text-zinc-500 truncate">{role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">{transcripts.toLocaleString()} transcripts</span>
        {voice && (
          <button
            onClick={(e) => { e.stopPropagation(); onMic(); }}
            disabled={isLoading}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isRecording ? "bg-rose-500 text-white animate-pulse" : isTranscribing || isLoading ? "bg-zinc-700 text-zinc-400" : "bg-zinc-800 text-zinc-500 hover:bg-amber-500/20 hover:text-amber-400"}`}
            title={isRecording ? "Stop" : `Talk to ${name}`}
          >
            {isRecording ? <Square size={10} /> : isTranscribing || isLoading ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
          </button>
        )}
      </div>

      {/* Hover Popup */}
      {hovered && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 sm:w-72 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(group)} flex items-center justify-center text-xs font-bold text-zinc-950`}>
              {initials(name)}
            </div>
            <div>
              <h4 className="font-semibold text-zinc-100 text-sm">{name}</h4>
              <p className="text-xs text-zinc-500">{role}</p>
            </div>
            <span className={`ml-auto w-2.5 h-2.5 rounded-full ${voice ? "bg-emerald-400" : "bg-zinc-600"}`} />
          </div>
          <div className="border-t border-zinc-800 pt-2 mt-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Transcripts</span>
              <span className="text-zinc-300 font-medium">{transcripts.toLocaleString()}</span>
            </div>
            {style && (
              <div>
                <span className="text-xs text-zinc-500">Style</span>
                <p className="text-xs text-zinc-300 mt-0.5">{style}</p>
              </div>
            )}
            {topics && topics.length > 0 && (
              <div>
                <span className="text-xs text-zinc-500">Top Topics</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {topics.map((t) => (
                    <span key={t} className="text-[10px] bg-amber-500/10 text-amber-400/80 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {catchphrases && catchphrases.length > 0 && (
              <div>
                <span className="text-xs text-zinc-500">Catchphrases</span>
                <div className="mt-0.5">
                  {catchphrases.map((c, i) => (
                    <p key={i} className="text-[10px] text-zinc-400 italic">"{c}"</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-zinc-700" />
        </div>
      )}
    </div>
  );
}
