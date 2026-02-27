import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { runAudit, AuditResult, DimensionResult } from '../scorers';

export const fullAuditRouter = Router();

interface CrawlPage {
  url: string;
  title?: string;
  html?: string;
  statusCode?: number;
}

interface FullAuditResult {
  url: string;
  pages_crawled: number;
  overall_score: number;
  dimensions: Record<string, { score: number; issues: string[] }>;
  page_scores: Array<{ url: string; score: number; dimensions: AuditResult['dimensions'] }>;
  recommendations: string[];
  audited_at: string;
}

fullAuditRouter.post('/', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try { new URL(targetUrl); } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    // Step 1: Deep crawl via Crawlee
    let pages: CrawlPage[] = [];
    try {
      const crawlRes = await fetch('http://raiser-crawlee:3000/api/crawl/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, maxPages: 20 }),
        signal: AbortSignal.timeout(120000),
      });
      if (crawlRes.ok) {
        const crawlData = await crawlRes.json() as any;
        pages = crawlData.pages || crawlData.results || [];
      }
    } catch (crawlErr: any) {
      console.warn('[full-audit] Crawlee unavailable, falling back to single-page:', crawlErr.message);
    }

    // Fallback: if crawl returned nothing, score the single URL
    if (!pages.length) {
      pages = [{ url: targetUrl }];
    }

    // Step 2: Score each page
    const pageResults: Array<{ url: string; result: AuditResult }> = [];
    for (const page of pages) {
      try {
        const result = await runAudit(page.url);
        pageResults.push({ url: page.url, result });
      } catch (err: any) {
        console.warn(`[full-audit] Failed to score ${page.url}: ${err.message}`);
      }
    }

    if (!pageResults.length) {
      res.status(500).json({ error: 'Failed to score any pages' });
      return;
    }

    // Step 3: Aggregate scores
    const dimKeys = ['ai_citability', 'schema_readiness', 'eeat_signals', 'content_structure', 'platform_visibility'] as const;
    const aggregated: Record<string, { score: number; issues: string[] }> = {};

    for (const key of dimKeys) {
      const scores = pageResults.map(p => p.result.dimensions[key].score);
      const allIssues = pageResults.flatMap(p => p.result.dimensions[key].issues);
      aggregated[key] = {
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        issues: [...new Set(allIssues)].slice(0, 5),
      };
    }

    const overallScore = Math.round(
      aggregated.ai_citability.score * 0.25 +
      aggregated.schema_readiness.score * 0.20 +
      aggregated.eeat_signals.score * 0.20 +
      aggregated.content_structure.score * 0.15 +
      aggregated.platform_visibility.score * 0.20
    );

    // Collect top recommendations
    const allRecs = pageResults.flatMap(p => p.result.recommendations);
    const uniqueRecs = [...new Set(allRecs)].slice(0, 15);

    const report: FullAuditResult = {
      url: targetUrl,
      pages_crawled: pageResults.length,
      overall_score: overallScore,
      dimensions: aggregated,
      page_scores: pageResults.map(p => ({
        url: p.url,
        score: p.result.overall_score,
        dimensions: p.result.dimensions,
      })),
      recommendations: uniqueRecs,
      audited_at: new Date().toISOString(),
    };

    // Step 4: Store in PostgreSQL
    try {
      await pool.query(
        `INSERT INTO seoh_audits (url, status, overall_score, dimensions, recommendations, completed_at)
         VALUES ($1, 'complete', $2, $3, $4, NOW())`,
        [targetUrl, overallScore, JSON.stringify(aggregated), JSON.stringify(uniqueRecs)]
      );
    } catch (dbErr) {
      console.error('[db] Failed to store full audit (non-fatal):', dbErr);
    }

    // Step 5: Return
    res.json(report);
  } catch (err: any) {
    console.error('[full-audit] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
