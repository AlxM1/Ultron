import { PersonaProfile } from './analyzer.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

interface LLMResponse {
  text: string;
  source: 'ollama' | 'fallback';
}

function buildSystemPrompt(profile: PersonaProfile, relevantQuotes: string[]): string {
  const style = profile.communication_style;
  const topics = profile.top_topics.slice(0, 5).map(t => t.topic).join(', ');
  const catchphrases = profile.vocabulary_patterns.catchphrases.join(', ');
  const quotes = relevantQuotes.length > 0
    ? relevantQuotes.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : 'No directly relevant quotes found.';

  return `You are ${profile.creator_name}. Respond in their voice using their communication style.

PROFILE:
- Known for: ${topics}
- Communication style: ${style.question_rate > 0.1 ? 'Asks lots of questions. ' : ''}${style.exclamation_rate > 0.05 ? 'High energy, uses exclamations. ' : ''}Average sentence length: ${style.avg_sentence_length} words. Vocabulary richness: ${style.vocabulary_richness}.
- Catchphrases: ${catchphrases || 'None identified'}
- Recurring themes: ${profile.recurring_themes.join(', ')}

RELEVANT QUOTES FROM THEIR CONTENT:
${quotes}

INSTRUCTIONS:
- Stay in character as ${profile.creator_name}
- Use their vocabulary, tone, and reasoning style
- Reference their known positions and frameworks
- Keep response concise (2-4 paragraphs)
- If quotes are relevant, weave them naturally into your response
- Do NOT break character or mention being an AI`;
}

function findRelevantQuotes(profile: PersonaProfile, question: string): string[] {
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const scored = profile.key_quotes.map(q => {
    const lower = q.toLowerCase();
    const score = questionWords.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
    return { quote: q, score };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.quote);
}

async function tryOllama(prompt: string, systemPrompt: string): Promise<string | null> {
  try {
    // Check if Ollama is available
    const tagRes = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(10000) });
    if (!tagRes.ok) return null;

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 512 },
      }),
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.response || null;
  } catch {
    return null;
  }
}

function buildFallbackResponse(profile: PersonaProfile, question: string, relevantQuotes: string[]): string {
  const name = profile.creator_name;
  const topics = profile.top_topics.slice(0, 3).map(t => t.topic);
  const catchphrases = profile.vocabulary_patterns.catchphrases;

  let response = `[${name}'s perspective based on transcript analysis]\n\n`;

  if (relevantQuotes.length > 0) {
    response += `Based on ${name}'s content, here are their most relevant statements:\n\n`;
    for (const q of relevantQuotes.slice(0, 3)) {
      response += `> "${q}"\n\n`;
    }
    response += `${name} frequently discusses ${topics.join(', ')}.`;
    if (catchphrases.length > 0) {
      response += ` Key phrases they use: "${catchphrases.slice(0, 3).join('", "')}".\n`;
    }
  } else {
    response += `While ${name} hasn't directly addressed this exact topic in indexed content, `;
    response += `their expertise centers on ${topics.join(', ')}. `;
    response += `Their communication style tends to be ${profile.communication_style.avg_sentence_length > 15 ? 'detailed and thorough' : 'concise and punchy'}.`;
    if (catchphrases.length > 0) {
      response += ` They often emphasize: "${catchphrases.slice(0, 3).join('", "')}".`;
    }
  }

  response += `\n\n[Note: LLM inference unavailable. Install Ollama with ${OLLAMA_MODEL} for AI-generated persona responses.]`;
  return response;
}

export async function queryPersona(
  profile: PersonaProfile,
  question: string
): Promise<LLMResponse> {
  const relevantQuotes = findRelevantQuotes(profile, question);
  const systemPrompt = buildSystemPrompt(profile, relevantQuotes);

  // Try Ollama
  const ollamaResponse = await tryOllama(question, systemPrompt);
  if (ollamaResponse) {
    return { text: ollamaResponse, source: 'ollama' };
  }

  // Fallback to quote-based response
  return {
    text: buildFallbackResponse(profile, question, relevantQuotes),
    source: 'fallback',
  };
}

export async function queryBoard(
  profiles: Array<{ profile: PersonaProfile; member: string }>,
  question: string
): Promise<{
  perspectives: Array<{ member: string; response: string; source: string }>;
  consensus: string;
}> {
  // Query members sequentially (Ollama handles one request at a time on GPU)
  const results = [];
  for (const { profile, member } of profiles) {
    if (!profile) {
      results.push({ member, response: `No transcript data available for ${member}.`, source: 'none' as const });
      continue;
    }
    const result = await queryPersona(profile, question);
    results.push({ member, response: result.text, source: result.source });
  }

  // Build consensus
  const consensus = buildConsensus(profiles.map(p => p.profile).filter(Boolean), question);

  return { perspectives: results, consensus };
}

function buildConsensus(profiles: PersonaProfile[], question: string): string {
  const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Find overlapping topics
  const topicCounts = new Map<string, string[]>();
  for (const p of profiles) {
    for (const t of p.top_topics.slice(0, 5)) {
      if (!topicCounts.has(t.topic)) topicCounts.set(t.topic, []);
      topicCounts.get(t.topic)!.push(p.creator_name);
    }
  }

  const sharedTopics = [...topicCounts.entries()]
    .filter(([_, names]) => names.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

  // Find relevant quotes per member
  const memberQuotes = profiles.map(p => {
    const quotes = p.key_quotes.filter(q => {
      const lower = q.toLowerCase();
      return questionWords.some(w => lower.includes(w));
    });
    return { name: p.creator_name, quoteCount: quotes.length };
  });

  const mostRelevant = memberQuotes.sort((a, b) => b.quoteCount - a.quoteCount);

  let consensus = 'BOARD CONSENSUS:\n\n';
  consensus += `Areas of overlap: ${sharedTopics.length > 0 ? sharedTopics.map(([topic, names]) => `${topic} (${names.join(', ')})`).join('; ') : 'Limited shared focus areas identified.'}\n\n`;
  consensus += `Most relevant to this question: ${mostRelevant[0]?.name || 'N/A'} (${mostRelevant[0]?.quoteCount || 0} matching quotes)\n`;
  consensus += `Least coverage: ${mostRelevant[mostRelevant.length - 1]?.name || 'N/A'} (${mostRelevant[mostRelevant.length - 1]?.quoteCount || 0} matching quotes)\n\n`;

  // Style diversity
  const styles = profiles.map(p => ({
    name: p.creator_name,
    energy: p.communication_style.exclamation_rate > 0.05 ? 'high-energy' : 'measured',
    depth: p.communication_style.avg_sentence_length > 15 ? 'detailed' : 'concise',
  }));
  consensus += `Communication styles: ${styles.map(s => `${s.name} (${s.energy}, ${s.depth})`).join('; ')}`;

  return consensus;
}
