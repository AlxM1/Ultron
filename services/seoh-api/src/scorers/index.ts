import * as cheerio from 'cheerio';
import { scoreAiCitability } from './ai-citability';
import { scoreSchemaReadiness } from './schema-readiness';
import { scoreEeatSignals } from './eeat-signals';
import { scoreContentStructure } from './content-structure';
import { scorePlatformVisibility } from './platform-visibility';

export interface DimensionResult {
  score: number;
  issues: string[];
}

export interface AuditResult {
  url: string;
  overall_score: number;
  dimensions: {
    ai_citability: DimensionResult;
    schema_readiness: DimensionResult;
    eeat_signals: DimensionResult;
    content_structure: DimensionResult;
    platform_visibility: DimensionResult;
  };
  recommendations: string[];
  audited_at: string;
}

export async function runAudit(url: string): Promise<AuditResult> {
  // Fetch the page
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SEOh-GEO-Scorer/1.0 (+https://seoh.ca)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();

  // Score each dimension
  const ai_citability = scoreAiCitability($, text);
  const schema_readiness = scoreSchemaReadiness($);
  const eeat_signals = scoreEeatSignals($, url, text);
  const content_structure = scoreContentStructure($);
  const platform_visibility = scorePlatformVisibility({
    ai_citability: ai_citability.score,
    schema_readiness: schema_readiness.score,
    eeat_signals: eeat_signals.score,
    content_structure: content_structure.score,
  });

  // Overall score: weighted average
  const overall_score = Math.round(
    ai_citability.score * 0.25 +
    schema_readiness.score * 0.20 +
    eeat_signals.score * 0.20 +
    content_structure.score * 0.15 +
    platform_visibility.score * 0.20
  );

  // Generate recommendations from top issues
  const allIssues = [
    ...ai_citability.issues.map(i => ({ dim: 'AI Citability', issue: i })),
    ...schema_readiness.issues.map(i => ({ dim: 'Schema Readiness', issue: i })),
    ...eeat_signals.issues.map(i => ({ dim: 'E-E-A-T', issue: i })),
    ...content_structure.issues.map(i => ({ dim: 'Content Structure', issue: i })),
    ...platform_visibility.issues.map(i => ({ dim: 'Platform Visibility', issue: i })),
  ];

  const recommendations = allIssues
    .slice(0, 10)
    .map(({ dim, issue }) => `[${dim}] ${issue}`);

  return {
    url,
    overall_score,
    dimensions: {
      ai_citability,
      schema_readiness,
      eeat_signals,
      content_structure,
      platform_visibility,
    },
    recommendations,
    audited_at: new Date().toISOString(),
  };
}
