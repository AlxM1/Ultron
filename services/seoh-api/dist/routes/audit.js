"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const pool_1 = require("../db/pool");
const scorers_1 = require("../scorers");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.post('/', async (req, res) => {
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
    }
    catch {
        res.status(400).json({ error: 'Invalid URL' });
        return;
    }
    try {
        const result = await (0, scorers_1.runAudit)(targetUrl);
        // Store in database
        try {
            await pool_1.pool.query(`INSERT INTO seoh_audits (url, status, overall_score, dimensions, recommendations, completed_at)
         VALUES ($1, 'complete', $2, $3, $4, NOW())`, [targetUrl, result.overall_score, JSON.stringify(result.dimensions), JSON.stringify(result.recommendations)]);
        }
        catch (dbErr) {
            console.error('[db] Failed to store audit (non-fatal):', dbErr);
        }
        res.json(result);
    }
    catch (err) {
        console.error('[audit] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});
exports.auditRouter.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'seoh-api', timestamp: new Date().toISOString() });
});
