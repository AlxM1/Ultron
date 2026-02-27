import pool from './db.js';

// Maps a creator to additional creator IDs whose transcripts should be included
// in their persona profile. Key = creator name (case-insensitive match),
// Value = array of associated creator IDs.
// Jason Calacanis (23) also gets TWIST (21) + All-In (22)
// Chamath Palihapitiya (26) also gets All-In (22)
// David Sacks (27) also gets All-In (22)
const CREATOR_ASSOCIATIONS: Record<string, number[]> = {
  'jason calacanis': [21, 22],      // TWIST + All-In Podcast
  'chamath palihapitiya': [22],      // All-In Podcast
  'david sacks': [22],              // All-In Podcast
};

export interface PersonaProfile {
  creator_id: number;
  creator_name: string;
  transcript_count: number;
  total_words: number;
  communication_style: {
    avg_sentence_length: number;
    vocabulary_richness: number; // unique words / total words
    avg_words_per_transcript: number;
    exclamation_rate: number;
    question_rate: number;
  };
  top_topics: Array<{ topic: string; count: number }>;
  vocabulary_patterns: {
    top_words: Array<{ word: string; count: number }>;
    top_bigrams: Array<{ bigram: string; count: number }>;
    catchphrases: string[];
  };
  recurring_themes: string[];
  key_quotes: string[];
  updated_at: string;
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has',
  'had', 'did', 'got', 'am', 'being', 'does', 'done', 'going', 'really',
  'right', 'thing', 'things', 'very', 'much', 'more', 'kind', 'actually',
  'yeah', 'okay', 'um', 'uh', 'oh', 'like', 'gonna', 'dont', "don't",
  'thats', "that's", 'youre', "you're", 'its', "it's", 'theyre', "they're",
  'weve', "we've", 'ive', "i've", 'didnt', "didn't", 'doesnt', "doesn't",
  'cant', "can't", 'wont', "won't", 'shouldnt', "shouldn't", 'wouldnt',
  "wouldn't", 'isnt', "isn't", 'arent', "aren't", 'wasnt', "wasn't",
  'havent', "haven't", 'hasnt', "hasn't", 'lot', 'lets', "let's",
  'still', 'need', 'same', 'something', 'through', 'every', 'where',
  'those', 'down', 'should', 'own', 'before', 'might', 'while', 'too',
  'here', 'many', 'may', 'why', 'said', 'each', 'tell', 'put', 'never',
]);

// Topic keyword clusters
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'artificial intelligence': ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'neural', 'model', 'gpt', 'llm', 'chatgpt', 'openai', 'anthropic', 'claude'],
  'business strategy': ['strategy', 'competitive', 'moat', 'market', 'positioning', 'leverage', 'scale', 'growth'],
  'entrepreneurship': ['entrepreneur', 'startup', 'founder', 'bootstrap', 'venture', 'fundraise', 'pitch'],
  'marketing': ['marketing', 'brand', 'audience', 'funnel', 'conversion', 'leads', 'content', 'seo', 'ads', 'advertising'],
  'investing': ['invest', 'investor', 'portfolio', 'returns', 'valuation', 'equity', 'stock', 'vc', 'capital'],
  'sales': ['sales', 'selling', 'close', 'deal', 'pipeline', 'prospect', 'cold', 'outreach', 'revenue'],
  'leadership': ['leader', 'leadership', 'team', 'culture', 'hire', 'hiring', 'management', 'manager'],
  'technology': ['technology', 'software', 'platform', 'app', 'saas', 'cloud', 'data', 'api', 'tech'],
  'crypto & web3': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'token', 'defi', 'nft'],
  'politics & policy': ['government', 'regulation', 'policy', 'political', 'congress', 'law', 'election', 'vote', 'democrat', 'republican'],
  'media & content': ['youtube', 'podcast', 'video', 'creator', 'channel', 'subscribers', 'views', 'thumbnail'],
  'health & fitness': ['health', 'fitness', 'exercise', 'diet', 'sleep', 'weight', 'muscle', 'nutrition'],
  'personal development': ['mindset', 'discipline', 'habits', 'goals', 'motivation', 'focus', 'productivity'],
  'education': ['learn', 'education', 'course', 'skill', 'training', 'teach', 'school', 'university'],
  'money & finance': ['money', 'wealth', 'income', 'profit', 'cash', 'debt', 'financial', 'price', 'cost'],
};

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function extractSentences(text: string): string[] {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
}

export async function buildProfile(creatorName: string): Promise<PersonaProfile | null> {
  // Get creator
  const creatorRes = await pool.query(
    'SELECT id, name FROM creators WHERE LOWER(name) = LOWER($1)',
    [creatorName]
  );
  if (creatorRes.rows.length === 0) return null;
  const creator = creatorRes.rows[0];

  // Get all transcripts (including associated creators like co-hosted podcasts)
  const associatedIds = CREATOR_ASSOCIATIONS[creator.name.toLowerCase()] || [];
  const allCreatorIds = [creator.id, ...associatedIds];
  const transcriptRes = await pool.query(
    `SELECT t.text FROM transcripts t
     JOIN content c ON c.id = t.content_id
     WHERE c.creator_id = ANY($1) AND t.text IS NOT NULL AND LENGTH(t.text) > 100`,
    [allCreatorIds]
  );
  if (transcriptRes.rows.length === 0) return null;

  const transcripts = transcriptRes.rows.map((r: { text: string }) => r.text);
  const allText = transcripts.join(' ');
  const allWords = tokenize(allText);
  const contentWords = allWords.filter(w => !STOP_WORDS.has(w));
  const uniqueWords = new Set(contentWords);
  const allSentences = extractSentences(allText);

  // Word frequency
  const wordFreq = new Map<string, number>();
  for (const w of contentWords) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }
  const topWords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));

  // Bigrams
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < contentWords.length - 1; i++) {
    const bg = `${contentWords[i]} ${contentWords[i + 1]}`;
    bigramFreq.set(bg, (bigramFreq.get(bg) || 0) + 1);
  }
  const topBigrams = [...bigramFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([bigram, count]) => ({ bigram, count }));

  // Catchphrases: bigrams/trigrams with unusually high frequency
  const catchphrases = topBigrams
    .filter(b => b.count > transcripts.length * 0.3)
    .slice(0, 10)
    .map(b => b.bigram);

  // Topic detection
  const topicScores = new Map<string, number>();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      score += wordFreq.get(kw) || 0;
    }
    if (score > 0) topicScores.set(topic, score);
  }
  const topTopics = [...topicScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  // Communication style
  const sentenceLengths = allSentences.map(s => s.split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;
  const exclamations = (allText.match(/!/g) || []).length;
  const questions = (allText.match(/\?/g) || []).length;
  const totalSentences = allSentences.length || 1;

  // Key quotes: find sentences with strong opinion signals
  const opinionSignals = ['believe', 'think', 'important', 'best', 'worst', 'always', 'never', 'truth', 'key', 'secret', 'must', 'critical', 'fundamental'];
  const keyQuotes = allSentences
    .filter(s => {
      const lower = s.toLowerCase();
      return opinionSignals.some(sig => lower.includes(sig)) && s.length > 40 && s.length < 300;
    })
    .slice(0, 20);

  // Recurring themes from top topics
  const recurringThemes = topTopics.slice(0, 5).map(t => t.topic);

  const profile: PersonaProfile = {
    creator_id: creator.id,
    creator_name: creator.name,
    transcript_count: transcripts.length,
    total_words: allWords.length,
    communication_style: {
      avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      vocabulary_richness: Math.round((uniqueWords.size / contentWords.length) * 1000) / 1000,
      avg_words_per_transcript: Math.round(allWords.length / transcripts.length),
      exclamation_rate: Math.round((exclamations / totalSentences) * 1000) / 1000,
      question_rate: Math.round((questions / totalSentences) * 1000) / 1000,
    },
    top_topics: topTopics,
    vocabulary_patterns: {
      top_words: topWords,
      top_bigrams: topBigrams,
      catchphrases,
    },
    recurring_themes: recurringThemes,
    key_quotes: keyQuotes,
    updated_at: new Date().toISOString(),
  };

  return profile;
}

export async function saveProfile(profile: PersonaProfile): Promise<void> {
  await pool.query(`
    INSERT INTO personas (creator_id, creator_name, profile_json, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (creator_id) DO UPDATE SET
      creator_name = $2,
      profile_json = $3,
      updated_at = NOW()
  `, [profile.creator_id, profile.creator_name, JSON.stringify(profile)]);
}

export async function getProfile(creatorName: string): Promise<PersonaProfile | null> {
  const res = await pool.query(
    'SELECT profile_json FROM personas WHERE LOWER(creator_name) = LOWER($1)',
    [creatorName]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].profile_json as PersonaProfile;
}

export async function getAllCreators(): Promise<Array<{ id: number; name: string; transcript_count: number }>> {
  const res = await pool.query(`
    SELECT cr.id, cr.name, COUNT(t.id)::int as transcript_count
    FROM creators cr
    JOIN content c ON c.creator_id = cr.id
    JOIN transcripts t ON t.content_id = c.id
    GROUP BY cr.id, cr.name
    ORDER BY transcript_count DESC
  `);
  return res.rows;
}
