import express from 'express';
import path from 'path';
import { auditRouter } from './routes/audit';
import { fullAuditRouter } from './routes/full-audit';
import { fixesRouter } from './routes/fixes';
import { compareRouter } from './routes/compare';
import { historyRouter } from './routes/history';
import { trackRouter } from './routes/track';
import { initDb } from './db/pool';

const app = express();
const PORT = parseInt(process.env.PORT || '3015');

app.use(express.json());

// Static: widget assets
app.use('/widget', express.static(path.join(__dirname, '..', 'public', 'widget')));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'seoh-api', timestamp: new Date().toISOString() });
});

app.use('/api/audit', auditRouter);
app.use('/api/audit', fixesRouter);
app.use('/api/audit/full', fullAuditRouter);
app.use('/api/audit', compareRouter);
app.use('/api/audit', historyRouter);
app.use('/api/audit', trackRouter);

async function start() {
  try {
    await initDb();
    console.log('[seoh-api] Database initialized');
  } catch (err) {
    console.warn('[seoh-api] Database connection failed (running without persistence):', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[seoh-api] GEO Scoring Engine running on port ${PORT}`);
  });
}

start();
