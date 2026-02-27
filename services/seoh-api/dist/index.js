"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const audit_1 = require("./routes/audit");
const pool_1 = require("./db/pool");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3015');
app.use(express_1.default.json());
// Routes
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'seoh-api', timestamp: new Date().toISOString() });
});
app.use('/api/audit', audit_1.auditRouter);
async function start() {
    try {
        await (0, pool_1.initDb)();
        console.log('[seoh-api] Database initialized');
    }
    catch (err) {
        console.warn('[seoh-api] Database connection failed (running without persistence):', err);
    }
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[seoh-api] GEO Scoring Engine running on port ${PORT}`);
    });
}
start();
