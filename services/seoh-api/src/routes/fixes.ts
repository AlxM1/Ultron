import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { generateFixes } from '../fixes/fix-generator';
import type { AuditResult } from '../scorers';

export const fixesRouter = Router();

// POST /api/audit/:id/fixes — generate fixes from a stored audit
fixesRouter.post('/:id/fixes', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT url, overall_score, dimensions, recommendations, completed_at
       FROM seoh_audits WHERE id = $1 AND status = 'complete'`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const row = result.rows[0];
    const audit: AuditResult = {
      url: row.url,
      overall_score: row.overall_score,
      dimensions: typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions,
      recommendations: row.recommendations || [],
      audited_at: row.completed_at || new Date().toISOString(),
    };

    const fixes = generateFixes(audit);
    res.json(fixes);
  } catch (err: any) {
    console.error('[fixes] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate fixes' });
  }
});

// POST /api/audit/fixes — generate fixes from inline audit data
fixesRouter.post('/fixes', async (req: Request, res: Response) => {
  const audit = req.body as AuditResult;

  if (!audit || !audit.url || !audit.dimensions) {
    res.status(400).json({ error: 'Valid audit data required (url, dimensions)' });
    return;
  }

  try {
    audit.audited_at = audit.audited_at || new Date().toISOString();
    audit.recommendations = audit.recommendations || [];
    const fixes = generateFixes(audit);
    res.json(fixes);
  } catch (err: any) {
    console.error('[fixes] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate fixes' });
  }
});
