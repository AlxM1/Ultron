const POSITIVE_WORDS = new Set([
  'love', 'great', 'amazing', 'awesome', 'excellent', 'fantastic', 'wonderful',
  'brilliant', 'perfect', 'best', 'incredible', 'outstanding', 'superb', 'beautiful',
  'helpful', 'thank', 'thanks', 'appreciate', 'inspiring', 'insightful', 'valuable',
  'impressive', 'genius', 'goat', 'fire', 'legendary', 'masterpiece', 'phenomenal',
  'excited', 'happy', 'glad', 'enjoy', 'enjoyed', 'useful', 'informative',
  'learned', 'exactly', 'finally', 'blessed', 'underrated', 'subscribed', 'gold'
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'worst', 'horrible', 'bad', 'trash', 'garbage',
  'disappointed', 'disappointing', 'frustrating', 'frustrated', 'annoying', 'annoyed',
  'useless', 'waste', 'boring', 'stupid', 'dumb', 'scam', 'clickbait', 'misleading',
  'wrong', 'broken', 'sucks', 'pathetic', 'ridiculous', 'overrated', 'cringe',
  'struggle', 'confused', 'confusing', 'poorly', 'ugly', 'painful', 'nightmare',
  "doesn't work", "can't stand", "don't like", 'unsubscribed', 'dislike'
]);

export type Sentiment = 'positive' | 'negative' | 'neutral';

export function classifySentiment(text: string): Sentiment {
  if (!text) return 'neutral';
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) pos++;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) neg++;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// SQL CASE expression for in-database sentiment classification
export function sentimentSQL(col: string = 'c.text'): string {
  const posConditions = Array.from(POSITIVE_WORDS).map(w => `LOWER(${col}) LIKE '%${w}%'`);
  const negConditions = Array.from(NEGATIVE_WORDS).map(w => `LOWER(${col}) LIKE '%${w.replace(/'/g, "''")}%'`);
  return `CASE
    WHEN (${posConditions.map(c => `(${c})::int`).join(' + ')}) > (${negConditions.map(c => `(${c})::int`).join(' + ')}) THEN 'positive'
    WHEN (${negConditions.map(c => `(${c})::int`).join(' + ')}) > (${posConditions.map(c => `(${c})::int`).join(' + ')}) THEN 'negative'
    ELSE 'neutral'
  END`;
}

// Simpler: just use SQL aggregation with keyword counting
export function posScoreSQL(col: string = 'c.text'): string {
  const posConditions = Array.from(POSITIVE_WORDS).map(w => `(LOWER(${col}) LIKE '%${w}%')::int`);
  return posConditions.join(' + ');
}

export function negScoreSQL(col: string = 'c.text'): string {
  const negConditions = Array.from(NEGATIVE_WORDS).map(w => `(LOWER(${col}) LIKE '%${w.replace(/'/g, "''")}%')::int`);
  return negConditions.join(' + ');
}
