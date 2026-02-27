import type { CheerioAPI } from 'cheerio';

interface ScoreResult {
  score: number;
  issues: string[];
}

export function scoreAiCitability($: CheerioAPI, text: string): ScoreResult {
  let score = 0;
  const issues: string[] = [];
  const maxScore = 100;

  // FAQ sections (20 pts)
  const hasFaq = $('[itemtype*="FAQPage"]').length > 0 ||
    $('h2, h3, h4').filter((_, el) => /faq|frequently asked|questions/i.test($(el).text())).length > 0 ||
    $('details, summary').length > 0;
  if (hasFaq) {
    score += 20;
  } else {
    issues.push('No FAQ section detected — FAQs are highly citable by AI');
  }

  // Definition-style content (15 pts) — sentences with "is a", "refers to", "means"
  const definitionPatterns = /(?:is a|refers to|is defined as|means that|is the process of)/gi;
  const definitionMatches = text.match(definitionPatterns);
  if (definitionMatches && definitionMatches.length >= 3) {
    score += 15;
  } else if (definitionMatches && definitionMatches.length >= 1) {
    score += 8;
    issues.push('Limited definition-style content — add clear definitions for key terms');
  } else {
    issues.push('No definition-style content found — LLMs prefer clear, quotable definitions');
  }

  // Structured data presence (15 pts)
  const jsonLd = $('script[type="application/ld+json"]');
  if (jsonLd.length > 0) {
    score += 15;
  } else {
    issues.push('No JSON-LD structured data — critical for AI understanding');
  }

  // Concise paragraphs (15 pts) — avg paragraph length under 150 words
  const paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 20);
  if (paragraphs.length > 0) {
    const avgWords = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;
    if (avgWords <= 80) {
      score += 15;
    } else if (avgWords <= 150) {
      score += 10;
      issues.push('Some paragraphs are long — shorter paragraphs are more citable');
    } else {
      score += 3;
      issues.push('Paragraphs are too long — break them into concise, citable chunks');
    }
  } else {
    issues.push('Very little paragraph content found');
  }

  // Authoritative tone — statistics, numbers, percentages (15 pts)
  const statPatterns = /\d+%|\$[\d,.]+|\d+\s*(million|billion|thousand|users|customers|years)/gi;
  const stats = text.match(statPatterns);
  if (stats && stats.length >= 5) {
    score += 15;
  } else if (stats && stats.length >= 2) {
    score += 8;
    issues.push('Some data points present — add more statistics for credibility');
  } else {
    issues.push('No statistics or data points — quantified claims are more citable');
  }

  // Lists and bullet points (10 pts)
  const lists = $('ul, ol').length;
  if (lists >= 3) {
    score += 10;
  } else if (lists >= 1) {
    score += 5;
    issues.push('Few lists — structured lists are easy for LLMs to extract and cite');
  } else {
    issues.push('No lists found — add bulleted/numbered lists for key information');
  }

  // Entity density — proper nouns, brand mentions (10 pts)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const totalWords = text.split(/\s+/).length;
  if (totalWords > 100 && sentences.length > 3) {
    score += 10; // Basic content exists
  } else {
    issues.push('Very thin content — more substantive content needed for AI citation');
  }

  return { score: Math.min(score, maxScore), issues };
}
