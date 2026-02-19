import { NextRequest } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { join } from "path";

const GPU_STT_URL = process.env.GPU_STT_URL || "http://10.25.10.60:8765";
const GPU_TTS_URL = process.env.GPU_TTS_URL || "http://10.25.10.60:8001";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://10.25.10.60:11434";

const SYSTEM_PROMPT = `You are Jarvis, an AI assistant for the 00raiser platform. You control a suite of services:

AVAILABLE SERVICES:
- Krya (krya): AI image & video generation.
- Notes (notes): Document & knowledge base (AFFiNE).
- Task Monitor (tasks): Shows all agent activity on a calendar.
- AgentSmith (agentsmith): Agent management & automation.
- Scraper (scraper): Web & social media scraping.
- Newsletter (newsletter): AI news pipeline.
- VoiceForge (voiceforge): Text-to-speech generation.
- WhisperFlow (whisperflow): Speech-to-text transcription.
- YouTubeDL (youtubedl): Video & audio downloads.
- Personas (personas): AI persona clones from YouTube/Twitter content.

AVAILABLE ACTIONS (respond with JSON in an <action> tag):
1. Open an app: <action>{"type":"open_app","app":"krya"}</action>
2. Generate an image: <action>{"type":"generate_image","prompt":"...","width":1024,"height":1024}</action>
3. Generate a video: <action>{"type":"generate_video","prompt":"...","width":832,"height":480}</action>
4. Download a video: <action>{"type":"download_video","url":"..."}</action>
5. Scrape a URL: <action>{"type":"scrape","url":"...","platform":"web"}</action>
6. Get task summary: <action>{"type":"get_tasks"}</action>
7. Search notes: <action>{"type":"search_notes","query":"..."}</action>
8. Generate speech: <action>{"type":"generate_speech","text":"..."}</action>
9. Transcribe audio: <action>{"type":"transcribe","url":"..."}</action>
10. Chat as a persona: <action>{"type":"persona_chat","persona":"jason-calacanis","message":"..."}</action>
11. Generate script as persona: <action>{"type":"persona_script","persona":"jason-calacanis","topic":"...","minutes":5,"style":"monologue"}</action>
12. List available personas: <action>{"type":"list_personas"}</action>
13. No action needed (just conversation): No <action> tag.

RULES:
- Be concise and conversational. You ARE Jarvis — confident, helpful, slightly witty.
- Always include an <action> tag when the user wants you to DO something.
- For general knowledge questions, just answer naturally.
- You can chain actions.
- If unsure what the user wants, ask for clarification.
- Always respond in 1-2 SHORT sentences maximum. Never exceed 30 words. The user is LISTENING, not reading.

Respond with your spoken reply text, plus any <action> tags for things to execute.`;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}
const conversations = new Map<string, ConversationMessage[]>();
function getHistory(sessionId: string): ConversationMessage[] {
  if (!conversations.has(sessionId)) conversations.set(sessionId, []);
  return conversations.get(sessionId)!;
}

function extractActions(text: string) {
  const matches = [...text.matchAll(/<action>(.*?)<\/action>/gs)];
  return matches
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const tmpId = randomUUID();
  const inputPath = join("/tmp", tmpId + ".webm");
  const outputPath = join("/tmp", tmpId + ".wav");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        // ── Step 1: Receive and convert audio ──
        const formData = await req.formData();
        const audioFile = formData.get("audio");
        const sessionId = (formData.get("sessionId") as string) || "default";

        if (!audioFile || !(audioFile instanceof Blob)) {
          send("error", { message: "No audio file provided" });
          controller.close();
          return;
        }

        send("status", { stage: "transcribing" });

        const buffer = Buffer.from(await audioFile.arrayBuffer());
        writeFileSync(inputPath, buffer);

        try {
          execSync(
            `ffmpeg -i ${inputPath} -ar 16000 -ac 1 -f wav ${outputPath} -y`,
            { timeout: 10000, stdio: "pipe" }
          );
        } catch {
          send("error", { message: "Audio conversion failed" });
          controller.close();
          return;
        }

        // ── Step 2: Transcribe on GPU ──
        const wavBuffer = readFileSync(outputPath);
        const upstream = new FormData();
        upstream.append(
          "audio",
          new Blob([wavBuffer], { type: "audio/wav" }),
          "recording.wav"
        );

        let sttRes: Response;
        try {
          sttRes = await fetch(GPU_STT_URL + "/transcribe", {
            method: "POST",
            body: upstream,
            signal: AbortSignal.timeout(30000),
          });
        } catch {
          send("error", { message: "Transcription unavailable" });
          controller.close();
          return;
        }

        if (!sttRes.ok) {
          send("error", { message: "Transcription failed" });
          controller.close();
          return;
        }

        const sttData = await sttRes.json();
        const userText = sttData.text || "";

        if (!userText.trim()) {
          send("transcript", { text: "" });
          controller.close();
          return;
        }

        send("transcript", { text: userText });

        // ── Step 3: Stream LLM response ──
        send("status", { stage: "thinking" });

        const history = getHistory(sessionId);
        const context = history
          .slice(-20)
          .map(
            (m) => `${m.role === "user" ? "User" : "Jarvis"}: ${m.content}`
          )
          .join("\n");
        const prompt = context
          ? `${context}\nUser: ${userText}`
          : userText;

        const llmRes = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || "llama3.2",
            system: SYSTEM_PROMPT,
            prompt,
            stream: true,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!llmRes.ok || !llmRes.body) {
          send("error", { message: "LLM unavailable" });
          controller.close();
          return;
        }

        const reader = llmRes.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let pendingText = "";
        let sentenceIndex = 0;

        async function generateAndSendTTS(sentence: string, idx: number) {
          try {
            const ttsRes = await fetch(`${GPU_TTS_URL}/tts/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: sentence,
                exaggeration: 0.3,
                cfg_weight: 0.5,
              }),
              signal: AbortSignal.timeout(30000),
            });

            if (
              ttsRes.ok &&
              ttsRes.headers.get("Content-Type")?.includes("audio")
            ) {
              const audioBuffer = await ttsRes.arrayBuffer();
              const base64 = Buffer.from(audioBuffer).toString("base64");
              send("audio", {
                index: idx,
                sentence,
                base64,
                contentType: "audio/wav",
              });
            }
          } catch (e) {
            console.error("TTS error for sentence:", sentence, e);
          }
        }

        // Sequential TTS queue that runs concurrently with LLM streaming
        const sentenceQueue: { text: string; index: number }[] = [];
        let ttsComplete = false;

        async function processTTSQueue() {
          while (sentenceQueue.length > 0 || !ttsComplete) {
            if (sentenceQueue.length > 0) {
              const s = sentenceQueue.shift()!;
              send("status", { stage: "speaking" });
              await generateAndSendTTS(s.text, s.index);
            } else {
              await new Promise((r) => setTimeout(r, 50));
            }
          }
        }

        // Start TTS processor in background (runs alongside LLM streaming)
        const ttsProcessor = processTTSQueue();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.trim());

          for (const line of lines) {
            try {
              const obj = JSON.parse(line);
              if (obj.response) {
                fullResponse += obj.response;
                pendingText += obj.response;

                const sentenceMatch = pendingText.match(
                  /^(.*?[.!?])\s*(.*)/s
                );
                if (sentenceMatch) {
                  const completeSentence = sentenceMatch[1].trim();
                  pendingText = sentenceMatch[2];

                  const cleanSentence = completeSentence
                    .replace(/<action>.*?<\/action>/gs, "")
                    .trim();
                  if (cleanSentence) {
                    send("sentence", {
                      index: sentenceIndex,
                      text: cleanSentence,
                    });
                    sentenceQueue.push({
                      text: cleanSentence,
                      index: sentenceIndex,
                    });
                    sentenceIndex++;
                  }
                }
              }

              if (obj.done) {
                const remaining = pendingText
                  .replace(/<action>.*?<\/action>/gs, "")
                  .trim();
                if (remaining) {
                  send("sentence", { index: sentenceIndex, text: remaining });
                  sentenceQueue.push({
                    text: remaining,
                    index: sentenceIndex,
                  });
                  sentenceIndex++;
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // LLM done — signal TTS queue to finish after draining
        ttsComplete = true;
        await ttsProcessor;

        // Send full response and actions
        const actions = extractActions(fullResponse);
        const cleanResponse = fullResponse
          .replace(/<action>.*?<\/action>/gs, "")
          .trim();

        // Update conversation history
        history.push({ role: "user", content: userText });
        history.push({ role: "assistant", content: fullResponse });
        if (history.length > 40) history.splice(0, history.length - 40);

        send("complete", {
          response: cleanResponse,
          actions: actions.length > 0 ? actions : null,
          model: "ollama",
        });
      } catch (e) {
        console.error("Pipeline error:", e);
        send("error", { message: "Pipeline failed" });
      } finally {
        try {
          unlinkSync(inputPath);
        } catch {}
        try {
          unlinkSync(outputPath);
        } catch {}
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
