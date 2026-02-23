"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface JarvisHUDProps {
  voiceState: "idle" | "listening" | "processing" | "speaking";
  onBootComplete: () => void;
}

const BOOT_PHASES = [
  { delay: 400,  duration: 600,  label: "phase-reactor" },
  { delay: 1000, duration: 800,  label: "phase-rings" },
  { delay: 1800, duration: 600,  label: "phase-brackets" },
  { delay: 2400, duration: 2400, label: "phase-text" },
  { delay: 4800, duration: 800,  label: "phase-reveal" },
];

const BOOT_MESSAGES = [
  { text: "JARVIS SYSTEM v4.6.2", suffix: " ONLINE", delay: 0 },
  { text: "Neural interface:", suffix: " CONNECTED", delay: 380 },
  { text: "Arc reactor:", suffix: " NOMINAL", delay: 760 },
  { text: "Service mesh:", suffix: " 19/19 ACTIVE", delay: 1140 },
  { text: "Threat level:", suffix: " NOMINAL", delay: 1520 },
  { text: "Welcome back, sir.", suffix: "", delay: 1900 },
];

/* ─── Sound Effects Engine (Web Audio API) ────────────────────── */
class BootSoundEngine {
  private ctx: AudioContext | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
  }

  // Mechanical click/tick sound
  tick(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    // Short noise burst for click
    const bufferSize = ctx.sampleRate * 0.02;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 4000;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    source.stop(t + 0.05);
  }

  // Power-up hum/whoosh
  powerUp(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const duration = 1.2;

    // Low frequency sweep
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + duration * 0.7);
    osc.frequency.exponentialRampToValueAtTime(80, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.05, t + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);

    // High harmonic shimmer
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(800, t);
    osc2.frequency.exponentialRampToValueAtTime(2000, t + duration * 0.5);
    osc2.frequency.exponentialRampToValueAtTime(1200, t + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.015, t + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + duration);
  }

  // Ring activation sound — rising tone
  ringActivate(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);

    // Add a click at the start
    this.tick(delay);
  }

  // Data/text blip sound
  dataBlip(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000;

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // System online confirmation tone
  confirmTone(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    // Two-tone confirmation (like JARVIS acknowledgement)
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.05, t + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.25);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    });
  }

  // Final sweep/whoosh for reveal
  revealSweep(delay: number = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    // White noise sweep
    const bufferSize = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(6000, t + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    source.stop(t + 0.8);
  }
}

function ArcReactor({ phase }: { phase: number }) {
  const visible = phase >= 1;
  const ringsVisible = phase >= 2;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ pointerEvents: "none" }}
    >
      <svg
        viewBox="0 0 300 300"
        width="300"
        height="300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0)",
          transition: "opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: "drop-shadow(0 0 20px #4af3ff) drop-shadow(0 0 60px #0088cc)",
        }}
      >
        {ringsVisible && (
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(74,243,255,0.06)" strokeWidth="1" strokeDasharray="8 4" style={{ animation: "ring-rotate 20s linear infinite" }} />
        )}
        {ringsVisible && (
          <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(74,243,255,0.15)" strokeWidth="1" strokeDasharray="4 8" style={{ animation: "ring-rotate-reverse 12s linear infinite", transformOrigin: "150px 150px" }} />
        )}
        {ringsVisible && (
          <circle cx="150" cy="150" r="100" fill="none" stroke="rgba(74,243,255,0.25)" strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "ring-rotate 8s linear infinite", transformOrigin: "150px 150px" }} />
        )}
        {ringsVisible && (
          <circle cx="150" cy="150" r="78" fill="none" stroke="rgba(74,243,255,0.4)" strokeWidth="1" />
        )}
        {ringsVisible && [0, 60, 120, 180, 240, 300].map((deg) => (
          <line key={deg} x1="150" y1="72" x2="150" y2="80" stroke="rgba(74,243,255,0.5)" strokeWidth="1.5" style={{ transformOrigin: "150px 150px", transform: `rotate(${deg}deg)` }} />
        ))}
        <circle cx="150" cy="150" r="54" fill="rgba(74,243,255,0.03)" stroke="rgba(74,243,255,0.5)" strokeWidth="1.5" style={{ animation: "arc-reactor-pulse 2s ease-in-out infinite" }} />
        {ringsVisible && [0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="144" y="108" width="12" height="6" rx="1" fill="rgba(74,243,255,0.3)" style={{ transformOrigin: "150px 150px", transform: `rotate(${deg}deg)`, animation: "arc-reactor-pulse 2s ease-in-out infinite", animationDelay: `${deg * 0.005}s` }} />
        ))}
        <circle cx="150" cy="150" r="28" fill="rgba(74,243,255,0.08)" stroke="rgba(74,243,255,0.7)" strokeWidth="2" style={{ animation: "arc-reactor-pulse 1.5s ease-in-out infinite" }} />
        <polygon points="150,126 168,162 132,162" fill="none" stroke="rgba(74,243,255,0.8)" strokeWidth="1.5" style={{ animation: "arc-reactor-pulse 1.5s ease-in-out infinite" }} />
        <polygon points="150,174 132,138 168,138" fill="none" stroke="rgba(74,243,255,0.5)" strokeWidth="1" style={{ animation: "arc-reactor-pulse 1.5s ease-in-out infinite" }} />
        <circle cx="150" cy="150" r="6" fill="#4af3ff" style={{ animation: "arc-reactor-pulse 1s ease-in-out infinite" }} />
      </svg>
    </div>
  );
}

function HUDBrackets({ visible }: { visible: boolean }) {
  const style = (anim: string): React.CSSProperties => ({
    position: "absolute",
    width: 32,
    height: 32,
    opacity: visible ? 1 : 0,
    animation: visible ? `${anim} 0.4s ease-out forwards` : "none",
  });

  const line = (pos: React.CSSProperties, bw: string): React.CSSProperties => ({
    position: "absolute",
    ...pos,
    border: "2px solid rgba(74,243,255,0.7)",
    ...parseBorderWidth(bw),
  });

  return (
    <>
      <div style={{ ...style("bracket-tl"), top: 24, left: 24 }}>
        <div style={line({ top: 0, left: 0, width: 32, height: 32 }, "2px 0 0 2px")} />
      </div>
      <div style={{ ...style("bracket-tr"), top: 24, right: 24 }}>
        <div style={line({ top: 0, right: 0, width: 32, height: 32 }, "2px 2px 0 0")} />
      </div>
      <div style={{ ...style("bracket-bl"), bottom: 24, left: 24 }}>
        <div style={line({ bottom: 0, left: 0, width: 32, height: 32 }, "0 0 2px 2px")} />
      </div>
      <div style={{ ...style("bracket-br"), bottom: 24, right: 24 }}>
        <div style={line({ bottom: 0, right: 0, width: 32, height: 32 }, "0 2px 2px 0")} />
      </div>
      {visible && (
        <>
          <div style={{ position: "absolute", top: "50%", left: 24, width: 60, height: 1, background: "linear-gradient(to right, rgba(74,243,255,0.6), transparent)", animation: "fade-in 0.4s ease-out 0.2s both" }} />
          <div style={{ position: "absolute", top: "50%", right: 24, width: 60, height: 1, background: "linear-gradient(to left, rgba(74,243,255,0.6), transparent)", animation: "fade-in 0.4s ease-out 0.2s both" }} />
          <div style={{ position: "absolute", left: "50%", top: 24, width: 1, height: 60, background: "linear-gradient(to bottom, rgba(74,243,255,0.6), transparent)", animation: "fade-in 0.4s ease-out 0.2s both" }} />
          <div style={{ position: "absolute", left: "50%", bottom: 24, width: 1, height: 60, background: "linear-gradient(to top, rgba(74,243,255,0.6), transparent)", animation: "fade-in 0.4s ease-out 0.2s both" }} />
        </>
      )}
    </>
  );
}

function parseBorderWidth(bw: string): React.CSSProperties {
  const [top, right, bottom, left] = bw.split(" ");
  return { borderTopWidth: top, borderRightWidth: right, borderBottomWidth: bottom, borderLeftWidth: left };
}

function BootText({ visible, soundEngine }: { visible: boolean; soundEngine: BootSoundEngine | null }) {
  const [shown, setShown] = useState<number>(0);

  useEffect(() => {
    if (!visible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_MESSAGES.forEach((msg, idx) => {
      const t = setTimeout(() => {
        setShown(idx + 1);
        // Play data blip for each line
        soundEngine?.dataBlip();
        // Play confirm tone on last message
        if (idx === BOOT_MESSAGES.length - 1) {
          soundEngine?.confirmTone(0.1);
        }
      }, msg.delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [visible, soundEngine]);

  if (!visible) return null;

  return (
    <div style={{ position: "absolute", bottom: 120, left: "50%", transform: "translateX(-50%)", width: 480, fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace", fontSize: 13, lineHeight: 1.7 }}>
      {BOOT_MESSAGES.slice(0, shown).map((msg, i) => (
        <div key={i} style={{ animation: "fade-up 0.3s ease-out", display: "flex", gap: 4 }}>
          <span style={{ color: "rgba(74,243,255,0.4)" }}>&gt;&nbsp;</span>
          <span style={{ color: "rgba(74,243,255,0.7)" }}>{msg.text}</span>
          <span style={{ color: "#4af3ff", textShadow: "0 0 8px #4af3ff" }}>{msg.suffix}</span>
          {i === shown - 1 && msg.suffix && (
            <span style={{ display: "inline-block", width: 2, height: "1em", background: "#4af3ff", marginLeft: 2, animation: "cursor-blink 0.8s step-end infinite", verticalAlign: "middle" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function JarvisHUD({ voiceState, onBootComplete }: JarvisHUDProps) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);
  const soundEngineRef = useRef<BootSoundEngine | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);

  // Initialize sound engine on first user interaction (browser autoplay policy)
  const initAudio = useCallback(() => {
    if (soundEngineRef.current) return;
    const engine = new BootSoundEngine();
    engine.init();
    soundEngineRef.current = engine;
    setUserInteracted(true);
  }, []);

  // Try to init audio immediately and on any interaction
  useEffect(() => {
    // Try immediately (may work if user already interacted with page)
    try {
      initAudio();
    } catch {}

    const handler = () => initAudio();
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    // Also try on mousemove after a short delay
    const moveHandler = () => { initAudio(); window.removeEventListener("mousemove", moveHandler); };
    window.addEventListener("mousemove", moveHandler);

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousemove", moveHandler);
    };
  }, [initAudio]);

  useEffect(() => {
    const engine = soundEngineRef.current;

    // Phase 1: Reactor appears — power up sound
    const t1 = setTimeout(() => {
      setPhase(1);
      engine?.powerUp();
    }, 400);

    // Phase 2: Rings draw — ring activation sounds
    const t2 = setTimeout(() => {
      setPhase(2);
      engine?.ringActivate();
      // Staggered ticks for each ring
      engine?.tick(0.2);
      engine?.tick(0.4);
      engine?.ringActivate(0.3);
    }, 1000);

    // Phase 3: Brackets appear — mechanical clicks
    const t3 = setTimeout(() => {
      setPhase(3);
      engine?.tick(0);
      engine?.tick(0.1);
      engine?.tick(0.2);
      engine?.tick(0.3);
    }, 1800);

    // Phase 4: Text types in (sound handled in BootText component)
    const t4 = setTimeout(() => setPhase(4), 2400);

    // Play Jarvis voice greeting when "Welcome back" line appears
    const tVoice = setTimeout(() => {
      const audio = new Audio("/jarvis-welcome.ogg");
      audio.volume = 0.7;
      audio.play().catch(() => {}); // Silently fail if autoplay blocked
    }, 2400 + 1900); // Phase 4 start + Welcome message delay

    // Phase 5: Exit sweep
    const t5 = setTimeout(() => {
      engine?.revealSweep();
      setExiting(true);
      setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onBootComplete();
        }
      }, 800);
    }, 5200);

    return () => [t1, t2, t3, t4, t5, tVoice].forEach(clearTimeout);
  }, [onBootComplete]);

  if (phase === 0 && !exiting) {
    return <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100 }} />;
  }

  return (
    <div
      onClick={initAudio}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000010",
        zIndex: 100,
        overflow: "hidden",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.8s ease-in" : "none",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74,243,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="hex-grid-bg" />
      <div className="scanline-overlay" />
      <ArcReactor phase={phase} />
      <HUDBrackets visible={phase >= 3} />
      <BootText visible={phase >= 4} soundEngine={soundEngineRef.current} />
      {phase >= 2 && (
        <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", textAlign: "center", animation: "fade-up 0.5s ease-out" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "rgba(74,243,255,0.5)", fontFamily: "'SF Mono', monospace", textTransform: "uppercase" }}>
            00raiser &nbsp;/&nbsp; Portal
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(74,243,255,0.25)", fontFamily: "'SF Mono', monospace", marginTop: 4 }}>
            JARVIS INTERFACE ACTIVE
          </div>
        </div>
      )}
      {phase >= 3 && (
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 24, animation: "fade-up 0.4s ease-out" }}>
          {["SHIELD", "CORTEX", "MESH", "NEURAL"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4af3ff", animation: "status-online 2s ease-in-out infinite", boxShadow: "0 0 6px #4af3ff" }} />
              <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "rgba(74,243,255,0.4)", fontFamily: "'SF Mono', monospace" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
