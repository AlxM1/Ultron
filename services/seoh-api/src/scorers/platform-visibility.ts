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
export function scorePlatformVisibility(otherScores: {
  ai_citability: number;
  schema_readiness: number;
  eeat_signals: number;
  content_structure: number;
}): ScoreResult {
  const issues: string[] = [];

  // Weighted average of other scores as a proxy
  const estimated = Math.round(
    otherScores.ai_citability * 0.35 +
    otherScores.schema_readiness * 0.25 +
    otherScores.eeat_signals * 0.25 +
    otherScores.content_structure * 0.15
  );

  // Apply a penalty since we can't verify actual visibility
  const score = Math.max(0, Math.min(100, estimated - 15));

  issues.push('Platform visibility is estimated — live AI platform querying coming soon');

  if (score < 40) {
    issues.push('Low estimated visibility — AI platforms likely do not cite this site');
  } else if (score < 70) {
    issues.push('Moderate estimated visibility — improvements in other dimensions will help');
  }

  return { score, issues };
}
