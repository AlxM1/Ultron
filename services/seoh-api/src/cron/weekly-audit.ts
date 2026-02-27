/**
 * Weekly re-audit cron for tracked domains.
 * Run via: node dist/cron/weekly-audit.js
 */
import { pool, initDb } from '../db/pool';
import { runAudit } from '../scorers';

async function main() {
  await initDb();
  console.log('[cron] Starting weekly re-audit of tracked domains...');

  const { rows: domains } = await pool.query(
    `SELECT domain FROM seoh_tracked_domains ORDER BY last_audited ASC NULLS FIRST`
  );

  if (domains.length === 0) {
    console.log('[cron] No tracked domains. Done.');
    process.exit(0);
  }

  for (const { domain } of domains) {
    const targetUrl = `https://${domain}`;
    console.log(`[cron] Auditing ${targetUrl}...`);

    try {
      const result = await runAudit(targetUrl);

      await pool.query(
        `INSERT INTO seoh_audits (url, status, overall_score, dimensions, recommendations, completed_at)
         VALUES ($1, 'complete', $2, $3, $4, NOW())`,
        [targetUrl, result.overall_score, JSON.stringify(result.dimensions), JSON.stringify(result.recommendations)]
      );

      await pool.query(
        `UPDATE seoh_tracked_domains SET last_audited = NOW() WHERE domain = $1`,
        [domain]
      );

      console.log(`[cron] ${domain}: score ${result.overall_score}`);
    } catch (err: any) {
      console.error(`[cron] Failed to audit ${domain}:`, err.message);
    }
  }

  console.log('[cron] Weekly re-audit complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('[cron] Fatal:', err);
  process.exit(1);
});
