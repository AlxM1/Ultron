"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { BuiltInKeyword, PorcupineWorker } from "@picovoice/porcupine-web";
import { WebVoiceProcessor } from "@picovoice/web-voice-processor";
import type { ChatMessage } from "../components/ChatPanel";

type VoiceState = "idle" | "listening" | "processing" | "speaking";
type ModelChoice = "auto" | "claude" | "grok" | "ollama";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STOP_PHRASES = [
  "stop listening",
  "stop",
  "that's all",
  "thats all",
  "nevermind",
  "never mind",
  "cancel",
  "goodbye",
  "go to sleep",
];

let msgId = 0;
function nextId() {
  return String(++msgId);
}

export function useVoice(onOpenApp: (appId: string) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [model, setModel] = useState<ModelChoice>("auto");
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const continuousModeRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const porcupineRef = useRef<PorcupineWorker | null>(null);

  // Keep ref in sync with state for use in callbacks
  continuousModeRef.current = continuousMode;

  const addMessage = useCallback(
    (role: "user" | "jarvis" | "system", text: string, mdl?: string) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role, text, model: mdl, timestamp: Date.now() },
      ]);
    },
    []
  );

  // ── Stop recording ──────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cancelAnimationFrame(silenceTimerRef.current);
  }, []);

  // ── Exit continuous mode ────────────────────────────────────────

  const exitContinuousMode = useCallback(() => {
    continuousModeRef.current = false;
    setContinuousMode(false);
    stopRecording();
    // Clean up any lingering stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    setAnalyser(null);
    setState("idle");
    addMessage("system", "Always-listening mode off.");
  }, [stopRecording, addMessage]);

  // ── Speak response ──────────────────────────────────────────────

  const speakResponse = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
        return;
      }
    } catch {
      // VoiceForge unavailable
    }

    // Fallback: browser TTS
    if ("speechSynthesis" in window) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
    }
  }, []);

  // ── Handle action results ───────────────────────────────────────

  const handleActionResult = useCallback(
    (result: Record<string, unknown>) => {
      switch (result.type) {
        case "open_app":
          onOpenApp(result.app as string);
          break;
        case "generate_image":
          addMessage("system", "Image generation started.");
          onOpenApp("krya");
          break;
        case "generate_video":
          addMessage("system", "Video generation queued.");
          break;
        case "get_tasks": {
          const summary = (result.result as Record<string, unknown>)
            ?.summary as Record<string, unknown> | undefined;
          if (summary) {
            addMessage(
              "system",
              `Today: ${summary.today_count || 0} tasks, ${summary.success_rate || 100}% success, ${summary.active_agents || 0} active agents.`
            );
          }
          break;
        }
        case "persona_chat": {
          const chatResult = result.result as Record<string, unknown> | undefined;
          const response = chatResult?.response as string || chatResult?.message as string || "No response from persona.";
          addMessage("jarvis", `[${result.persona || "Persona"}] ${response}`);
          break;
        }
        case "persona_script": {
          const scriptResult = result.result as Record<string, unknown> | undefined;
          const script = scriptResult?.script as string || "Script generation failed.";
          const preview = script.length > 500 ? script.slice(0, 500) + "..." : script;
          addMessage("jarvis", `[Script] ${preview}`);
          break;
        }
        case "list_personas": {
          const personas = result.result as Record<string, unknown>[] | Record<string, unknown> | undefined;
          const list = Array.isArray(personas) ? personas : (personas as any)?.personas || [];
          if (Array.isArray(list) && list.length > 0) {
            const names = list.map((p: any) => `${p.name || p.slug} (${p.status || "unknown"})`).join(", ");
            addMessage("system", `Available personas: ${names}`);
          } else {
            addMessage("system", "No personas available.");
          }
          break;
        }
      }
    },
    [addMessage, onOpenApp]
  );

  // ── Legacy voice input (fallback) ──────────────────────────────

  const processVoiceInputLegacy = useCallback(
    async (audioBlob: Blob) => {
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const transcribeRes = await fetch("/api/voice/transcribe", {
          method: "POST",
          body: formData,
        });
        const { text, error: transcribeError } = await transcribeRes.json();

        if (!text?.trim()) {
          if (transcribeError) addMessage("system", "Could not transcribe audio.");
          setState("idle");
          return;
        }

        const lower = text.toLowerCase().trim();
        if (
          continuousModeRef.current &&
          STOP_PHRASES.some((p) => lower.includes(p))
        ) {
          addMessage("user", text);
          addMessage("jarvis", "Going quiet. Just press the mic when you need me.");
          continuousModeRef.current = false;
          setContinuousMode(false);
          setState("idle");
          return;
        }

        addMessage("user", text);

        const thinkRes = await fetch("/api/voice/think", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, model }),
        });
        const { response, actions, model: usedModel } = await thinkRes.json();

        if (response) addMessage("jarvis", response, usedModel);

        if (response) {
          setState("speaking");
          await speakResponse(response);
        }

        if (actions && Array.isArray(actions)) {
          for (const action of actions) {
            try {
              const execRes = await fetch("/api/voice/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
              });
              const result = await execRes.json();
              handleActionResult(result);
            } catch {}
          }
        }
      } catch (e) {
        console.error("Legacy voice error:", e);
        addMessage("system", "Something went wrong processing your voice.");
      }
      setState("idle");
    },
    [model, addMessage, speakResponse, handleActionResult]
  );

  // ── Process voice input (streaming pipeline) ──────────────────

  const processVoiceInput = useCallback(
    async (audioBlob: Blob) => {
      setState("processing");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("model", model);
        formData.append("sessionId", "default");

        const res = await fetch("/api/voice/pipeline", {
          method: "POST",
          body: formData,
        });

        if (!res.ok || !res.body) {
          addMessage("system", "Pipeline unavailable, trying legacy...");
          await processVoiceInputLegacy(audioBlob);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let actions: unknown[] | null = null;
        let usedModel = "";

        // Audio queue for sequential playback
        const audioQueue: { index: number; base64: string; contentType: string }[] = [];
        let isPlaying = false;
        let nextPlayIndex = 0;

        async function playNextInQueue() {
          if (isPlaying) return;

          const next = audioQueue.find((a) => a.index === nextPlayIndex);
          if (!next) return;

          isPlaying = true;
          setState("speaking");

          try {
            const audioBytes = Uint8Array.from(atob(next.base64), (c) =>
              c.charCodeAt(0)
            );
            const blob = new Blob([audioBytes], { type: next.contentType });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            await new Promise<void>((resolve) => {
              audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.play().catch(() => resolve());
            });
          } catch {
            // Audio play failed, continue
          }

          nextPlayIndex++;
          isPlaying = false;

          await playNextInQueue();
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on double newline (SSE message boundary)
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || "";

          for (const msg of messages) {
            let eventType = "";
            let eventData = "";

            for (const line of msg.split("\n")) {
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              if (line.startsWith("data: ")) eventData = line.slice(6);
            }

            if (!eventData) continue;

            try {
              const data = JSON.parse(eventData);

              switch (eventType) {
                case "status":
                  break;

                case "transcript":
                  if (data.text?.trim()) {
                    addMessage("user", data.text);
                    const lower = data.text.toLowerCase().trim();
                    if (
                      continuousModeRef.current &&
                      STOP_PHRASES.some((p) => lower.includes(p))
                    ) {
                      addMessage(
                        "jarvis",
                        "Going quiet. Just press the mic when you need me."
                      );
                      continuousModeRef.current = false;
                      setContinuousMode(false);
                      setState("idle");
                      return;
                    }
                  } else {
                    setState("idle");
                    return;
                  }
                  break;

                case "sentence":
                  break;

                case "audio":
                  audioQueue.push({
                    index: data.index,
                    base64: data.base64,
                    contentType: data.contentType,
                  });
                  playNextInQueue();
                  break;

                case "complete":
                  if (data.response) addMessage("jarvis", data.response, data.model);
                  actions = data.actions;
                  usedModel = data.model;
                  break;

                case "error":
                  addMessage("system", data.message);
                  break;
              }
            } catch {
              // Skip malformed data
            }
          }
        }

        // Wait for all audio to finish playing
        while (isPlaying || audioQueue.some((a) => a.index >= nextPlayIndex)) {
          await new Promise((r) => setTimeout(r, 100));
          await playNextInQueue();
        }

        // Execute actions
        if (actions && Array.isArray(actions)) {
          for (const action of actions) {
            try {
              const execRes = await fetch("/api/voice/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
              });
              const result = await execRes.json();
              handleActionResult(result);
            } catch {}
          }
        }
      } catch (e) {
        console.error("Voice processing error:", e);
        addMessage("system", "Something went wrong processing your voice.");
      }

      setState("idle");
    },
    [model, addMessage, handleActionResult, processVoiceInputLegacy]
  );

  // ── Start recording ─────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close().catch(() => {});
        setAnalyser(null);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          await processVoiceInput(blob);
        } else {
          setState("idle");
        }
      };

      mr.start();
      setState("listening");
      setChatOpen(true);

      // Silence detection — lenient settings so recording doesn't stop too early
      const SILENCE_DELAY_MS = 500; // don't check silence for first 500ms
      const MIN_RECORDING_MS = 1500; // never stop before 1.5s regardless
      const SILENCE_DURATION_MS = 3000; // need 3s of continuous silence to auto-stop
      const recordingStart = Date.now();
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      let silenceStart: number | null = null;

      function checkSilence() {
        if (mr.state !== "recording") return;
        const elapsed = Date.now() - recordingStart;

        // Don't check silence until delay has passed
        if (elapsed < SILENCE_DELAY_MS) {
          silenceTimerRef.current = requestAnimationFrame(checkSilence);
          return;
        }

        // Never stop before minimum recording time
        if (elapsed < MIN_RECORDING_MS) {
          silenceTimerRef.current = requestAnimationFrame(checkSilence);
          return;
        }

        analyserNode.getByteFrequencyData(data);
        const hasSound = data.some((v) => v > 0);

        if (!hasSound) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
            stopRecording();
            return;
          }
        } else {
          silenceStart = null;
        }
        silenceTimerRef.current = requestAnimationFrame(checkSilence);
      }
      checkSilence();
    } catch (e) {
      console.error("Mic access failed:", e);
      addMessage("system", "Microphone access denied.");
      setContinuousMode(false);
      continuousModeRef.current = false;
      setState("idle");
    }
  }, [addMessage, stopRecording, processVoiceInput]);

  // ── Auto-restart recording in continuous mode ───────────────────

  useEffect(() => {
    if (continuousMode && state === "idle") {
      // Small delay before restarting to avoid tight loops
      const timer = setTimeout(() => {
        if (continuousModeRef.current) {
          startRecording();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [continuousMode, state, startRecording]);

  // ── Click-to-toggle + long-press for continuous mode ────────────

  const handlePress = useCallback(() => {
    // If in continuous mode, pressing the button exits it
    if (continuousModeRef.current) {
      exitContinuousMode();
      return;
    }

    // If busy, ignore press
    if (state === "processing" || state === "speaking") return;

    // If currently listening, stop recording (click-to-toggle)
    if (state === "listening") {
      stopRecording();
      return;
    }

    // Start recording on click
    startRecording();

    // Start long-press timer (800ms to enter continuous mode)
    longPressTimerRef.current = setTimeout(() => {
      continuousModeRef.current = true;
      setContinuousMode(true);
      addMessage("system", "Always-listening mode on. Say \"stop listening\" to exit.");
    }, 800);
  }, [state, startRecording, stopRecording, exitContinuousMode, addMessage]);

  const handleRelease = useCallback(() => {
    // Clear long-press timer (if released before 800ms, it was a short click)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Don't stop on release — recording stops on second click or silence detection
  }, []);

  // ── Wake word detection (Picovoice Porcupine) ──────────────────

  const startWakeWord = useCallback(async () => {
    const accessKey = process.env.NEXT_PUBLIC_PICOVOICE_KEY;
    if (!accessKey) {
      console.warn("No Picovoice key set (NEXT_PUBLIC_PICOVOICE_KEY)");
      return;
    }

    try {
      // Clean up existing instance
      if (porcupineRef.current) {
        await WebVoiceProcessor.unsubscribe(porcupineRef.current);
        await porcupineRef.current.release();
        porcupineRef.current = null;
      }

      const porcupine = await PorcupineWorker.create(
        accessKey,
        [{ builtin: BuiltInKeyword.Jarvis, sensitivity: 0.7 }],
        async (detection: any) => {
          console.log("Wake word detected:", detection.label);
          addMessage("system", "Wake word detected.");
          // Stop listening before recording
          await WebVoiceProcessor.unsubscribe(porcupine);
          startRecording();
          setChatOpen(true);
        },
        { publicPath: "/porcupine_params.pv", forceWrite: true }
      );

      await WebVoiceProcessor.subscribe(porcupine);
      porcupineRef.current = porcupine;
      console.log("Porcupine wake word started");
    } catch (e) {
      console.error("Porcupine init failed:", e);
      addMessage("system", "Wake word initialization failed.");
    }
  }, [addMessage, startRecording]);

  const stopWakeWord = useCallback(async () => {
    if (porcupineRef.current) {
      await WebVoiceProcessor.unsubscribe(porcupineRef.current);
      await porcupineRef.current.release();
      porcupineRef.current = null;
    }
  }, []);

  // Toggle wake word on/off
  const toggleWakeWord = useCallback(() => {
    setWakeWordEnabled((prev) => {
      const next = !prev;
      if (next) {
        startWakeWord();
        addMessage("system", "Wake word enabled. Say \"Jarvis\" to activate.");
      } else {
        stopWakeWord();
        addMessage("system", "Wake word disabled.");
      }
      return next;
    });
  }, [startWakeWord, stopWakeWord, addMessage]);

  // Restart wake word after voice processing completes (if enabled)
  useEffect(() => {
    if (wakeWordEnabled && state === "idle" && !continuousMode) {
      const timer = setTimeout(() => {
        if (!continuousModeRef.current && !porcupineRef.current) {
          startWakeWord();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wakeWordEnabled, state, continuousMode, startWakeWord]);

  // Auto-start wake word on mount
  useEffect(() => {
    startWakeWord();
  }, []);

  // Pause wake word while recording/processing
  useEffect(() => {
    if (state !== "idle" && porcupineRef.current) {
      WebVoiceProcessor.unsubscribe(porcupineRef.current);
      porcupineRef.current.release();
      porcupineRef.current = null;
    }
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWakeWord();
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [stopWakeWord]);

  // ── Send text message (typed, not voice) ────────────────────────

  const sendText = useCallback(
    async (text: string) => {
      addMessage("user", text);
      setState("processing");

      try {
        const thinkRes = await fetch("/api/voice/think", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, model }),
        });
        const { response, actions, model: usedModel } = await thinkRes.json();

        if (response) {
          addMessage("jarvis", response, usedModel);
        }

        if (actions && Array.isArray(actions)) {
          for (const action of actions) {
            try {
              const execRes = await fetch("/api/voice/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
              });
              const result = await execRes.json();
              handleActionResult(result);
            } catch {
              // Silent fail
            }
          }
        }
      } catch {
        addMessage("system", "Something went wrong.");
      }

      setState("idle");
    },
    [model, addMessage, handleActionResult]
  );

  return {
    state,
    messages,
    model,
    setModel,
    analyser,
    chatOpen,
    setChatOpen,
    continuousMode,
    wakeWordEnabled,
    handlePress,
    handleRelease,
    toggleWakeWord,
    exitContinuousMode,
    sendText,
  };
}
