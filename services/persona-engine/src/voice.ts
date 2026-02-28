/**
 * Voice cloning via VoiceForge GPU TTS.
 * Generates audio from text using creator-specific voice profiles.
 */

const TTS_URL = process.env.TTS_URL || 'http://10.25.10.60:8001/tts/generate';
const VOICE_PROFILES_BASE = process.env.VOICE_PROFILES_URL || 'http://10.25.10.101:8099';

// Map creator display names (and aliases) to WAV filenames
// Board of Directors (10) + Advisors (8)
const VOICE_MAP: Record<string, string> = {
  // Board of Directors
  'Elon Musk': 'elon-musk.wav',
  'Elon': 'elon-musk.wav',
  'Musk': 'elon-musk.wav',
  'Alex Hormozi': 'alex-hormozi.wav',
  'Hormozi': 'alex-hormozi.wav',
  'Chamath Palihapitiya': 'chamath-palihapitiya.wav',
  'Chamath': 'chamath-palihapitiya.wav',
  'David Sacks': 'david-sacks.wav',
  'Sacks': 'david-sacks.wav',
  'Jason Calacanis': 'jason-calacanis.wav',
  'Calacanis': 'jason-calacanis.wav',
  'Jason': 'jason-calacanis.wav',
  'Jeff Bezos': 'jeff-bezos.wav',
  'Bezos': 'jeff-bezos.wav',
  'Lex Fridman': 'lex-fridman.wav',
  'Lex': 'lex-fridman.wav',
  'Fridman': 'lex-fridman.wav',
  'Sam Altman': 'sam-altman.wav',
  'Altman': 'sam-altman.wav',
  'Jensen Huang': 'jensen-huang.wav',
  'Jensen': 'jensen-huang.wav',
  'Huang': 'jensen-huang.wav',
  'Balaji Srinivasan': 'balaji-srinivasan.wav',
  'Balaji': 'balaji-srinivasan.wav',
  // Advisors
  'Naval Ravikant': 'naval-ravikant.wav',
  'Naval': 'naval-ravikant.wav',
  'Patrick Bet-David': 'patrick-bet-david.wav',
  'PBD': 'patrick-bet-david.wav',
  'Pieter Levels': 'pieter-levels.wav',
  'Levelsio': 'pieter-levels.wav',
  'Greg Isenberg': 'greg-isenberg.wav',
  'Andrej Karpathy': 'andrej-karpathy.wav',
  'Karpathy': 'andrej-karpathy.wav',
  'Marc Andreessen': 'marc-andreessen.wav',
  'Andreessen': 'marc-andreessen.wav',
  'a16z': 'marc-andreessen.wav',
  'Gary Vaynerchuk': 'gary-vaynerchuk.wav',
  'GaryVee': 'gary-vaynerchuk.wav',
  'Gary Vee': 'gary-vaynerchuk.wav',
  'Riley Brown': 'riley-brown.wav',
  'Riley': 'riley-brown.wav',
  "Kevin O'Leary": 'kevin-oleary.wav',
  "O'Leary": 'kevin-oleary.wav',
  'Mr. Wonderful': 'kevin-oleary.wav',
  // Bonus
  'Joe Rogan': 'joe-rogan.wav',
  'Rogan': 'joe-rogan.wav',
};

export function getVoiceProfileUrl(creatorName: string): string | null {
  const wav = VOICE_MAP[creatorName];
  if (!wav) return null;
  return `${VOICE_PROFILES_BASE}/${wav}`;
}

export function hasVoiceProfile(creatorName: string): boolean {
  return creatorName in VOICE_MAP;
}

/**
 * Generate audio buffer from text using a creator's cloned voice.
 * Returns WAV audio buffer or null on failure.
 */
export async function generateVoice(
  text: string,
  creatorName: string
): Promise<Buffer | null> {
  const speakerUrl = getVoiceProfileUrl(creatorName);
  if (!speakerUrl) return null;

  try {
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker_wav_url: speakerUrl,
        language: 'en',
        exaggeration: 0.7,
        cfg_weight: 0.8,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      console.error(`TTS error: ${res.status} ${res.statusText}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err: any) {
    console.error(`TTS generation failed for ${creatorName}:`, err.message);
    return null;
  }
}
