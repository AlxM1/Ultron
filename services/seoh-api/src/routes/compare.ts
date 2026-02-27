import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { runAudit, AuditResult, DimensionResult } from '../scorers';

export const compareRouter = Router();

const DIMENSION_KEYS = ['ai_citability', 'schema_readiness', 'eeat_signals', 'content_structure', 'platform_visibility'] as const;
type DimKey = typeof DIMENSION_KEYS[number];

const DIMENSION_LABELS: Record<DimKey, string> = {
  ai_citability: 'AI Citability',
  schema_readiness: 'Schema Readiness',
  eeat_signals: 'E-E-A-T Signals',
  content_structure: 'Content Structure',
  platform_visibility: 'Platform Visibility',
};

interface SiteResult {
  url: string;
  overall_score: number;
  dimensions: Record<DimKey, DimensionResult>;
  recommendations: string[];
  audited_at: string;
}

interface ComparisonResult {
  id?: string;
  sites: SiteResult[];
  dimension_winners: Record<DimKey, { url: string; score: number }>;
  overall_winner: { url: string; score: number };
  site_analysis: Array<{
    url: string;
    overall_score: number;
    advantages: string[];
    disadvantages: string[];
  }>;
  compared_at: string;
}

compareRouter.post('/compare', async (req: Request, res: Response) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length < 2 || urls.length > 5) {
    res.status(400).json({ error: 'urls must be an array of 2-5 URLs' });
    return;
  }

  // Normalize URLs
  const normalized: string[] = [];
  for (let u of urls) {
    if (typeof u !== 'string') { res.status(400).json({ error: 'Each url must be a string' }); return; }
    u = u.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    try { new URL(u); } catch { res.status(400).json({ error: `Invalid URL: ${u}` }); return; }
    normalized.push(u);
  }

  try {
    // Run audits in parallel
    const results = await Promise.allSettled(normalized.map(url => runAudit(url)));

    const sites: SiteResult[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        sites.push(r.value);
      } else {
        sites.push({
          url: normalized[i],
          overall_score: 0,
          dimensions: Object.fromEntries(DIMENSION_KEYS.map(k => [k, { score: 0, issues: [`Audit failed: ${r.reason?.message || 'unknown error'}`] }])) as Record<DimKey, DimensionResult>,
          recommendations: [],
          audited_at: new Date().toISOString(),
        });
      }
    }

    // Dimension winners
    const dimension_winners: Record<string, { url: string; score: number }> = {} as any;
    for (const dim of DIMENSION_KEYS) {
      let best = { url: '', score: -1 };
      for (const site of sites) {
        if (site.dimensions[dim].score > best.score) {
          best = { url: site.url, score: site.dimensions[dim].score };
        }
      }
      dimension_winners[dim] = best;
    }

    // Overall winner
    let overall_winner = { url: '', score: -1 };
    for (const s of sites) {
      if (s.overall_score > overall_winner.score) {
        overall_winner = { url: s.url, score: s.overall_score };
      }
    }

    // Per-site advantages/disadvantages
    const site_analysis = sites.map(site => {
      const advantages: string[] = [];
      const disadvantages: string[] = [];

      for (const dim of DIMENSION_KEYS) {
        const myScore = site.dimensions[dim].score;
        const otherScores = sites.filter(s => s.url !== site.url).map(s => s.dimensions[dim].score);
        const avgOther = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;

        if (myScore >= avgOther + 10) {
          advantages.push(`Strong ${DIMENSION_LABELS[dim]} (${myScore} vs avg ${Math.round(avgOther)})`);
        } else if (myScore <= avgOther - 10) {
          disadvantages.push(`Weak ${DIMENSION_LABELS[dim]} (${myScore} vs avg ${Math.round(avgOther)})`);
        }
      }

      if (site.url === overall_winner.url) advantages.unshift('Overall winner');

      return { url: site.url, overall_score: site.overall_score, advantages, disadvantages };
    });

    const comparison: ComparisonResult = {
      sites,
      dimension_winners: dimension_winners as Record<DimKey, { url: string; score: number }>,
      overall_winner,
      site_analysis,
      compared_at: new Date().toISOString(),
    };

    // Store in DB
    try {
      const dbResult = await pool.query(
        `INSERT INTO seoh_comparisons (urls, overall_winner, dimension_winners, site_scores, compared_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [
          JSON.stringify(normalized),
          JSON.stringify(overall_winner),
          JSON.stringify(dimension_winners),
          JSON.stringify(sites.map(s => ({ url: s.url, overall_score: s.overall_score, dimensions: s.dimensions }))),
        ]
      );
      comparison.id = dbResult.rows[0]?.id;
    } catch (dbErr) {
      console.error('[db] Failed to store comparison (non-fatal):', dbErr);
    }

    res.json(comparison);
  } catch (err: any) {
    console.error('[compare] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
