/**
 * Trends module - provides trend analysis endpoints and utilities.
 * Main analysis is done by tools/trend-analyzer.py
 * This module exposes results via the content-intel API.
 */

import { Router } from 'express';
import pool from '../db.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// GET /trends - latest trends from DB
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM trends ORDER BY score DESC LIMIT 50'
    );
    res.json({ trends: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /trends/report - latest JSON report
router.get('/report', async (req, res) => {
  try {
    const reportDir = join(__dirname, '..', '..', '..', '..', '..', 'content');
    const files = (await readFile('/dev/null').catch(() => null), 
      require('fs').readdirSync(reportDir)
        .filter(f => f.startsWith('trends-') && f.endsWith('.json'))
        .sort()
        .reverse());
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No trend reports found' });
    }
    
    const latest = JSON.parse(await readFile(join(reportDir, files[0]), 'utf-8'));
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /trends/category/:category
router.get('/category/:category', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM trends WHERE category = $1 ORDER BY score DESC',
      [req.params.category]
    );
    res.json({ trends: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
