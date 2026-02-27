/**
 * Voice cloning via VoiceForge GPU TTS.
 * Generates audio from text using creator-specific voice profiles.
 */
const TTS_URL = process.env.TTS_URL || 'http://10.25.10.60:8001/tts/generate';
const VOICE_PROFILES_BASE = process.env.VOICE_PROFILES_URL || 'http://10.25.10.101:8099';
// Map creator display names to WAV filenames
const VOICE_MAP = {
    'Elon Musk': 'elon-musk.wav',
    'Alex Hormozi': 'alex-hormozi.wav',
    'Chamath Palihapitiya': 'chamath-palihapitiya.wav',
    'David Sacks': 'david-sacks.wav',
    'Jason Calacanis': 'jason-calacanis.wav',
    'Jeff Bezos': 'jeff-bezos.wav',
    'Riley Brown': 'riley-brown.wav',
    'Lex Fridman': 'lex-fridman.wav',
};
export function getVoiceProfileUrl(creatorName) {
    const wav = VOICE_MAP[creatorName];
    if (!wav)
        return null;
    return `${VOICE_PROFILES_BASE}/${wav}`;
}
export function hasVoiceProfile(creatorName) {
    return creatorName in VOICE_MAP;
}
/**
 * Generate audio buffer from text using a creator's cloned voice.
 * Returns WAV audio buffer or null on failure.
 */
export async function generateVoice(text, creatorName) {
    const speakerUrl = getVoiceProfileUrl(creatorName);
    if (!speakerUrl)
        return null;
    try {
        const res = await fetch(TTS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                speaker_wav_url: speakerUrl,
                language: 'en',
            }),
            signal: AbortSignal.timeout(120000),
        });
        if (!res.ok) {
            console.error(`TTS error: ${res.status} ${res.statusText}`);
            return null;
        }
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
    }
    catch (err) {
        console.error(`TTS generation failed for ${creatorName}:`, err.message);
        return null;
    }
}
