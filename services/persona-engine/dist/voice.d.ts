/**
 * Voice cloning via VoiceForge GPU TTS.
 * Generates audio from text using creator-specific voice profiles.
 */
export declare function getVoiceProfileUrl(creatorName: string): string | null;
export declare function hasVoiceProfile(creatorName: string): boolean;
/**
 * Generate audio buffer from text using a creator's cloned voice.
 * Returns WAV audio buffer or null on failure.
 */
export declare function generateVoice(text: string, creatorName: string): Promise<Buffer | null>;
