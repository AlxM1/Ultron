import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { runAudit } from '../scorers';
import { generateAuditPdf } from '../report/pdf-generator';

export const auditRouter = Router();

// GET /api/audit/:id/pdf — generate PDF report from stored audit
auditRouter.get('/:id/pdf', async (req: Request, res: Response) => {
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
    const audit = {
      url: row.url,
      overall_score: row.overall_score,
      dimensions: row.dimensions,
      recommendations: row.recommendations || [],
      audited_at: row.completed_at || new Date().toISOString(),
    };

    const doc = generateAuditPdf(audit);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="geo-audit-${id}.pdf"`);
    doc.pipe(res);
  } catch (err: any) {
    console.error('[pdf] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /api/audit/pdf — generate PDF from inline audit data (no DB required)
auditRouter.post('/pdf', async (req: Request, res: Response) => {
  const audit = req.body;

  if (!audit || !audit.url || !audit.dimensions) {
    res.status(400).json({ error: 'Valid audit data required (url, dimensions)' });
    return;
  }

  try {
    audit.audited_at = audit.audited_at || new Date().toISOString();
    audit.recommendations = audit.recommendations || [];
    const doc = generateAuditPdf(audit);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="geo-audit-report.pdf"`);
    doc.pipe(res);
  } catch (err: any) {
    console.error('[pdf] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

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
