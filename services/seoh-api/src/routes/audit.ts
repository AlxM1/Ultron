import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { runAudit } from '../scorers';

export const auditRouter = Router();

auditRouter.post('/', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  // Normalize URL
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    // Validate URL
    new URL(targetUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const result = await runAudit(targetUrl);

    // Store in database
    try {
      await pool.query(
        `INSERT INTO seoh_audits (url, status, overall_score, dimensions, recommendations, completed_at)
         VALUES ($1, 'complete', $2, $3, $4, NOW())`,
        [targetUrl, result.overall_score, JSON.stringify(result.dimensions), JSON.stringify(result.recommendations)]
      );
    } catch (dbErr) {
      console.error('[db] Failed to store audit (non-fatal):', dbErr);
    }

    res.json(result);
  } catch (err: any) {
    console.error('[audit] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

auditRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'seoh-api', timestamp: new Date().toISOString() });
});
