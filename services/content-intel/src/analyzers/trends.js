/**
 * Trend Analyzer Module
 * Extracts buzzwords, identifies patterns, scores content ideas
 */

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had',
  'were', 'said', 'did', 'having', 'may', 'should'
]);

// Tech and AI-specific keywords to prioritize
const PRIORITY_KEYWORDS = new Set([
  'ai', 'artificial intelligence', 'chatgpt', 'gpt', 'claude', 'llm', 'machine learning',
  'automation', 'agent', 'agents', 'openai', 'anthropic', 'neural', 'model',
  'seo', 'marketing', 'content', 'video', 'youtube', 'twitter', 'social media',
  'saas', 'startup', 'business', 'revenue', 'growth', 'scale', 'funnel',
  'api', 'integration', 'workflow', 'productivity', 'efficiency'
]);

/**
 * Extract keywords from text
 */
export function extractKeywords(text) {
  if (!text) return [];

  // Normalize and tokenize
  const normalized = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ');
  const keywords = new Map();

  // Single words
  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    keywords.set(word, (keywords.get(word) || 0) + 1);
  }

  // Bigrams (2-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 1])) {
      keywords.set(bigram, (keywords.get(bigram) || 0) + 1);
    }
  }

  // Trigrams (3-word phrases)
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i + 2])) {
      keywords.set(trigram, (keywords.get(trigram) || 0) + 1);
    }
  }

  return Array.from(keywords.entries())
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Analyze content and extract trends
 */
export function analyzeContent(contentItems) {
  const allKeywords = new Map();
  const themes = new Map();

  for (const item of contentItems) {
    const text = `${item.title || ''} ${item.description || ''}`;
    const keywords = extractKeywords(text);

    for (const { keyword, frequency } of keywords) {
      const current = allKeywords.get(keyword) || { frequency: 0, contentIds: [] };
      current.frequency += frequency;
      current.contentIds.push(item.id);
      allKeywords.set(keyword, current);

      // Categorize into themes
      const category = categorizeKeyword(keyword);
      if (category) {
        themes.set(category, (themes.get(category) || 0) + frequency);
      }
    }
  }

  // Sort by frequency and boost priority keywords
  const trends = Array.from(allKeywords.entries())
    .map(([keyword, data]) => ({
      keyword,
      frequency: data.frequency,
      contentCount: data.contentIds.length,
      score: calculateTrendScore(keyword, data.frequency, data.contentIds.length),
      category: categorizeKeyword(keyword)
    }))
    .sort((a, b) => b.score - a.score);

  return {
    trends: trends.slice(0, 100), // Top 100 trends
    themes: Array.from(themes.entries())
      .map(([category, frequency]) => ({ category, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
  };
}

/**
 * Calculate trend score with priority boost
 */
function calculateTrendScore(keyword, frequency, contentCount) {
  let score = frequency * Math.log(contentCount + 1);
  
  // Boost priority keywords
  if (PRIORITY_KEYWORDS.has(keyword)) {
    score *= 2;
  }

  // Boost longer phrases (more specific)
  const wordCount = keyword.split(' ').length;
  if (wordCount >= 2) {
    score *= 1.5;
  }

  return score;
}

/**
 * Categorize keyword into theme
 */
function categorizeKeyword(keyword) {
  const aiTerms = ['ai', 'gpt', 'llm', 'claude', 'chatgpt', 'openai', 'anthropic', 'model', 'neural'];
  const marketingTerms = ['seo', 'marketing', 'content', 'social', 'growth', 'funnel', 'conversion'];
  const techTerms = ['api', 'code', 'programming', 'developer', 'software', 'app', 'saas'];
  const businessTerms = ['startup', 'business', 'revenue', 'sales', 'customer', 'client'];

  if (aiTerms.some(term => keyword.includes(term))) return 'AI';
  if (marketingTerms.some(term => keyword.includes(term))) return 'Marketing';
  if (techTerms.some(term => keyword.includes(term))) return 'Tech';
  if (businessTerms.some(term => keyword.includes(term))) return 'Business';

  return 'General';
}

/**
 * Score content ideas
 * Formula: (Relevance×2 + Timeliness + Uniqueness×2 + ClientFunnel) - (Competition + ProductionEffort)
 */
export function scoreIdea(idea, context = {}) {
  const {
    relevance = 5,        // 1-10: How relevant to our content pillars?
    timeliness = 5,       // 1-10: Is this trending NOW?
    uniqueness = 5,       // 1-10: Can we add unique value?
    clientFunnel = 5,     // 1-10: Will this attract potential clients?
    competition = 5,      // 1-10: How many people covered this?
    productionEffort = 5  // 1-10: How much work to produce?
  } = context;

  const score = (
    (relevance * 2) +
    timeliness +
    (uniqueness * 2) +
    clientFunnel
  ) - (
    competition +
    productionEffort
  );

  // Normalize to 0-100 scale
  // Max possible: (10*2 + 10 + 10*2 + 10) - (1 + 1) = 58
  // Min possible: (1*2 + 1 + 1*2 + 1) - (10 + 10) = -15
  const normalized = ((score + 15) / 73) * 100;

  return Math.max(0, Math.min(100, normalized));
}

/**
 * Identify content gaps - trending topics with low competition
 */
export function identifyGaps(trends, existingContent) {
  const gaps = [];

  for (const trend of trends) {
    // Check if topic is trending but underserved
    const coverageCount = existingContent.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return text.includes(trend.keyword.toLowerCase());
    }).length;

    if (trend.frequency >= 5 && coverageCount < 3) {
      gaps.push({
        topic: trend.keyword,
        frequency: trend.frequency,
        competition: coverageCount,
        category: trend.category,
        opportunity: calculateOpportunityScore(trend.frequency, coverageCount)
      });
    }
  }

  return gaps.sort((a, b) => b.opportunity - a.opportunity);
}

/**
 * Calculate opportunity score for content gaps
 */
function calculateOpportunityScore(frequency, competition) {
  // Higher frequency and lower competition = higher opportunity
  return (frequency * 10) / Math.max(competition, 1);
}

/**
 * Generate content idea from trend data
 */
export function generateIdea(trend, sourceContentIds = []) {
  const templates = [
    `Complete Guide to ${capitalize(trend.keyword)}`,
    `${capitalize(trend.keyword)}: Everything You Need to Know`,
    `How to Use ${capitalize(trend.keyword)} for Your Business`,
    `${capitalize(trend.keyword)} Explained in Plain English`,
    `Top ${capitalize(trend.keyword)} Tools and Strategies`,
    `${capitalize(trend.keyword)}: Common Mistakes to Avoid`,
    `${capitalize(trend.keyword)} - The Ultimate Tutorial`,
    `Why ${capitalize(trend.keyword)} Matters in 2026`
  ];

  const title = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    title,
    description: `Deep dive into ${trend.keyword} based on analysis of ${sourceContentIds.length} top-performing pieces of content.`,
    sourceContentIds,
    category: trend.category || 'General',
    estimatedScore: scoreIdea({}, {
      relevance: trend.category === 'AI' || trend.category === 'Marketing' ? 8 : 6,
      timeliness: Math.min(10, Math.floor(trend.frequency / 5)),
      uniqueness: 7,
      clientFunnel: trend.category === 'Marketing' || trend.category === 'Business' ? 8 : 5,
      competition: Math.min(10, sourceContentIds.length),
      productionEffort: 6
    })
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
