import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';

export const trackRouter = Router();

// POST /api/audit/track — add domain to tracking
trackRouter.post('/track', async (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'domain is required' });
    return;
  }

  const normalized = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    await pool.query(
      `INSERT INTO seoh_tracked_domains (domain)
       VALUES ($1)
       ON CONFLICT (domain) DO NOTHING`,
      [normalized]
    );
    res.json({ tracked: true, domain: normalized });
  } catch (err: any) {
    console.error('[track] Error:', err.message);
    res.status(500).json({ error: 'Failed to track domain' });
  }
});

// DELETE /api/audit/track/:domain — remove tracking
trackRouter.delete('/track/:domain', async (req: Request, res: Response) => {
  const domain = req.params.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    const result = await pool.query(
      `DELETE FROM seoh_tracked_domains WHERE domain = $1`,
      [domain]
    );
    res.json({ removed: result.rowCount! > 0, domain });
  } catch (err: any) {
    console.error('[track] Error:', err.message);
    res.status(500).json({ error: 'Failed to remove tracking' });
  }
});

// GET /api/audit/track — list all tracked domains
trackRouter.get('/track', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT domain, created_at, last_audited FROM seoh_tracked_domains ORDER BY created_at`
    );
    res.json({ domains: result.rows });
  } catch (err: any) {
    console.error('[track] Error:', err.message);
    res.status(500).json({ error: 'Failed to list tracked domains' });
  }
});
