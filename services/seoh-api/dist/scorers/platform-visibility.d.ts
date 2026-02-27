interface ScoreResult {
    score: number;
    issues: string[];
}
/**
 * Platform Visibility scorer — STUB
 * In production, this will query ChatGPT, Gemini, Perplexity, Claude with
 * relevant industry questions and check if the brand/URL appears in responses.
 * For now, returns a weighted estimate based on other dimension scores.
 */
export declare function scorePlatformVisibility(otherScores: {
    ai_citability: number;
    schema_readiness: number;
    eeat_signals: number;
    content_structure: number;
}): ScoreResult;
export {};
