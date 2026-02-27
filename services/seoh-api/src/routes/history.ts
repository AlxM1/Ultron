import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

export const historyRouter = Router();

// GET /api/audit/history/:domain — all past audits for a domain
historyRouter.get('/history/:domain', async (req: Request, res: Response) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    const result = await pool.query(
      `SELECT id, url, overall_score, dimensions, recommendations, completed_at, created_at
       FROM seoh_audits
       WHERE status = 'complete'
         AND (
           LOWER(REPLACE(REPLACE(url, 'https://', ''), 'http://', '')) LIKE $1
         )
       ORDER BY completed_at DESC`,
      [`${domain}%`]
    );

    res.json({
      domain,
      total: result.rows.length,
      audits: result.rows.map(r => ({
        id: r.id,
        url: r.url,
        overall_score: r.overall_score,
        dimensions: r.dimensions,
        recommendations: r.recommendations,
        completed_at: r.completed_at,
        created_at: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[history] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
});

// GET /api/audit/trends/:domain — trend data over time
historyRouter.get('/trends/:domain', async (req: Request, res: Response) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    const result = await pool.query(
      `SELECT id, overall_score, dimensions, completed_at
       FROM seoh_audits
       WHERE status = 'complete'
         AND LOWER(REPLACE(REPLACE(url, 'https://', ''), 'http://', '')) LIKE $1
       ORDER BY completed_at ASC`,
      [`${domain}%`]
    );

    const rows = result.rows;
    if (rows.length === 0) {
      res.json({ domain, dataPoints: [], change: null });
      return;
    }

    const dataPoints = rows.map(r => ({
      date: r.completed_at,
      overall_score: r.overall_score,
      dimensions: Object.entries(r.dimensions || {}).reduce((acc, [k, v]: [string, any]) => {
        acc[k] = v.score;
        return acc;
      }, {} as Record<string, number>),
    }));

    // Calculate change from last two audits
    let change = null;
    if (rows.length >= 2) {
      const latest = rows[rows.length - 1];
      const previous = rows[rows.length - 2];
      change = {
        overall: latest.overall_score - previous.overall_score,
        dimensions: {} as Record<string, number>,
      };
      const latestDims = latest.dimensions || {};
      const prevDims = previous.dimensions || {};
      for (const key of Object.keys(latestDims)) {
        change.dimensions[key] = (latestDims[key]?.score || 0) - (prevDims[key]?.score || 0);
      }
    }

    // Issues tracking: compare latest vs previous
    let issuesDelta = null;
    if (rows.length >= 2) {
      const latest = rows[rows.length - 1];
      const previous = rows[rows.length - 2];
      const latestIssues = new Set<string>();
      const prevIssues = new Set<string>();
      for (const dim of Object.values(latest.dimensions || {})) {
        ((dim as any).issues || []).forEach((i: string) => latestIssues.add(i));
      }
      for (const dim of Object.values(previous.dimensions || {})) {
        ((dim as any).issues || []).forEach((i: string) => prevIssues.add(i));
      }
      const fixed = [...prevIssues].filter(i => !latestIssues.has(i));
      const newIssues = [...latestIssues].filter(i => !prevIssues.has(i));
      issuesDelta = { fixed: fixed.length, new: newIssues.length, fixedList: fixed, newList: newIssues };
    }

    res.json({ domain, dataPoints, change, issuesDelta });
  } catch (err: any) {
    console.error('[trends] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});
