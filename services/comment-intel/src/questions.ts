export const QUESTION_PATTERNS = [
  'how ', 'what ', 'why ', 'can ', 'does ', 'is there', 'where ', 'when ',
  'which ', 'who ', 'could ', 'would ', 'should ', 'do you', 'has anyone',
  'anyone know', 'is it ', 'are there', 'will ', 'did '
];

export function isQuestion(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  if (lower.includes('?')) return true;
  for (const p of QUESTION_PATTERNS) {
    if (lower.startsWith(p)) return true;
  }
  return false;
}

export const QUESTION_SQL = `(
  c.text LIKE '%?%'
  OR LOWER(c.text) LIKE 'how %'
  OR LOWER(c.text) LIKE 'what %'
  OR LOWER(c.text) LIKE 'why %'
  OR LOWER(c.text) LIKE 'can %'
  OR LOWER(c.text) LIKE 'does %'
  OR LOWER(c.text) LIKE 'is there%'
  OR LOWER(c.text) LIKE 'where %'
  OR LOWER(c.text) LIKE 'when %'
  OR LOWER(c.text) LIKE 'which %'
  OR LOWER(c.text) LIKE 'who %'
  OR LOWER(c.text) LIKE 'could %'
  OR LOWER(c.text) LIKE 'would %'
  OR LOWER(c.text) LIKE 'should %'
  OR LOWER(c.text) LIKE 'do you%'
  OR LOWER(c.text) LIKE 'anyone know%'
)`;

// Keyword themes for grouping questions
export const QUESTION_THEMES: Record<string, string[]> = {
  'pricing & cost': ['price', 'cost', 'afford', 'expensive', 'cheap', 'free', 'pay', 'money', 'worth'],
  'how to get started': ['start', 'begin', 'beginner', 'first', 'learn', 'tutorial', 'getting started'],
  'tools & software': ['tool', 'software', 'app', 'program', 'platform', 'use', 'recommend'],
  'career & jobs': ['job', 'career', 'hire', 'work', 'salary', 'interview', 'resume', 'freelance'],
  'AI & automation': ['ai', 'gpt', 'chatgpt', 'artificial intelligence', 'automat', 'machine learning', 'llm', 'model'],
  'business & monetization': ['business', 'monetize', 'revenue', 'profit', 'sell', 'client', 'customer', 'income'],
  'technical issues': ['error', 'bug', 'fix', 'issue', 'problem', 'crash', 'not working', "doesn't work"],
  'content requests': ['video', 'cover', 'make a', 'topic', 'next', 'please do', 'tutorial on'],
  'comparison': ['vs', 'versus', 'better', 'compare', 'difference', 'which one'],
  'availability & access': ['available', 'access', 'release', 'when', 'waitlist', 'api', 'open source'],
};

export function classifyQuestionTheme(text: string): string {
  const lower = text.toLowerCase();
  let bestTheme = 'general';
  let bestScore = 0;
  for (const [theme, keywords] of Object.entries(QUESTION_THEMES)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }
  return bestTheme;
}
