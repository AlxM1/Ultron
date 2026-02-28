import { NextRequest, NextResponse } from "next/server";

const WHISPER_URL = process.env.WHISPERFLOW_URL || "http://10.25.10.60:8765/transcribe";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;
    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    // Forward to WhisperFlow
    const whisperForm = new FormData();
    whisperForm.append("audio", audio, "recording.webm");

    const res = await fetch(WHISPER_URL, {
      method: "POST",
      body: whisperForm,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "STT failed", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text || data.transcription || "" });
  } catch (e) {
    console.error("STT proxy error:", e);
    return NextResponse.json({ error: "STT service unreachable" }, { status: 502 });
  }
}
