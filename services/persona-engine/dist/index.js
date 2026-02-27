import express from 'express';
import pool from './db.js';
import { buildProfile, saveProfile, getProfile, getAllCreators } from './analyzer.js';
const app = express();
app.use(express.json());
const PORT = parseInt(process.env.PORT || '3017');
const BOARD_MEMBERS = [
    'Elon Musk',
    'David Sacks',
    'Jason Calacanis',
    'Alex Hormozi',
    'Chamath Palihapitiya',
];
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'persona-engine', version: '1.0.0' });
});
// List all creators with profiles
app.get('/api/persona', async (_req, res) => {
    try {
        const creators = await getAllCreators();
        const profileRes = await pool.query('SELECT creator_name, updated_at FROM personas');
        const profileMap = new Map(profileRes.rows.map((r) => [r.creator_name, r.updated_at]));
        const result = creators.map(c => ({
            ...c,
            has_profile: profileMap.has(c.name),
            profile_updated: profileMap.get(c.name) || null,
        }));
        res.json({ creators: result, total: result.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get persona profile
app.get('/api/persona/:creator_name/profile', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.creator_name);
        let profile = await getProfile(name);
        if (!profile) {
            // Build on-demand
            profile = await buildProfile(name);
            if (!profile) {
                return res.status(404).json({ error: `Creator "${name}" not found or has no transcripts` });
            }
            await saveProfile(profile);
        }
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Rebuild persona profile
app.post('/api/persona/:creator_name/rebuild', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.creator_name);
        const profile = await buildProfile(name);
        if (!profile) {
            return res.status(404).json({ error: `Creator "${name}" not found or has no transcripts` });
        }
        await saveProfile(profile);
        res.json({ message: 'Profile rebuilt', profile });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Query a persona (placeholder - returns profile-based response, LLM integration later)
app.post('/api/persona/:creator_name/query', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.creator_name);
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'question is required in request body' });
        }
        let profile = await getProfile(name);
        if (!profile) {
            profile = await buildProfile(name);
            if (!profile) {
                return res.status(404).json({ error: `Creator "${name}" not found` });
            }
            await saveProfile(profile);
        }
        // For now: return relevant quotes and topic alignment
        const questionWords = question.toLowerCase().split(/\s+/);
        const relevantQuotes = profile.key_quotes.filter((q) => questionWords.some((w) => w.length > 3 && q.toLowerCase().includes(w))).slice(0, 5);
        res.json({
            creator: profile.creator_name,
            question,
            response: {
                note: 'LLM-powered persona responses coming in phase 2. Current: text analysis results.',
                relevant_quotes: relevantQuotes,
                top_topics: profile.top_topics.slice(0, 5),
                communication_style: profile.communication_style,
                catchphrases: profile.vocabulary_patterns.catchphrases,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Board of Directors query
app.post('/api/persona/board', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'question is required' });
        }
        const perspectives = [];
        for (const member of BOARD_MEMBERS) {
            let profile = await getProfile(member);
            if (!profile) {
                profile = await buildProfile(member);
                if (profile)
                    await saveProfile(profile);
            }
            if (profile) {
                const questionWords = question.toLowerCase().split(/\s+/);
                const relevantQuotes = profile.key_quotes.filter((q) => questionWords.some((w) => w.length > 3 && q.toLowerCase().includes(w))).slice(0, 3);
                perspectives.push({
                    member: profile.creator_name,
                    transcript_count: profile.transcript_count,
                    top_topics: profile.top_topics.slice(0, 3),
                    relevant_quotes: relevantQuotes,
                    style: profile.communication_style,
                });
            }
            else {
                perspectives.push({
                    member,
                    error: 'No transcripts available for this board member',
                });
            }
        }
        res.json({
            question,
            board_perspectives: perspectives,
            note: 'LLM-powered synthesized responses coming in phase 2.',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Build all profiles
app.post('/api/persona/build-all', async (_req, res) => {
    try {
        const creators = await getAllCreators();
        const results = [];
        for (const c of creators) {
            const profile = await buildProfile(c.name);
            if (profile) {
                await saveProfile(profile);
                results.push({ name: c.name, status: 'built', transcripts: profile.transcript_count });
            }
        }
        res.json({ built: results.length, profiles: results });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Init DB table and start
async function init() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS personas (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER UNIQUE NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      creator_name VARCHAR(255) NOT NULL,
      profile_json JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(LOWER(creator_name))');
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Persona Engine running on port ${PORT}`);
    });
}
init().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});
