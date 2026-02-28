import express from 'express';
import pool from './db.js';
import { buildProfile, saveProfile, getProfile, getAllCreators } from './analyzer.js';
import { queryPersona, queryBoard } from './llm.js';
import { generateVoice, hasVoiceProfile } from './voice.js';

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
    const profileMap = new Map(profileRes.rows.map((r: any) => [r.creator_name, r.updated_at]));
    
    const result = creators.map(c => ({
      ...c,
      has_profile: profileMap.has(c.name),
      profile_updated: profileMap.get(c.name) || null,
    }));
    res.json({ creators: result, total: result.length });
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
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

    const result = await queryPersona(profile, question);

    res.json({
      creator: profile.creator_name,
      question,
      response: result.text,
      source: result.source,
      profile_summary: {
        top_topics: profile.top_topics.slice(0, 5),
        communication_style: profile.communication_style,
        catchphrases: profile.vocabulary_patterns.catchphrases,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Board of Directors members (dynamic metadata)
app.get('/api/persona/board/members', async (_req, res) => {
  try {
    // Board config: who's on the board and their roles
    const BOARD_CONFIG: Array<{ name: string; role: string; group: 'board' | 'advisor' | 'bonus' }> = [
      { name: 'Elon Musk', role: 'CEO, Tesla & SpaceX', group: 'board' },
      { name: 'Alex Hormozi', role: 'CEO, Acquisition.com', group: 'board' },
      { name: 'Chamath Palihapitiya', role: 'CEO, Social Capital', group: 'board' },
      { name: 'David Sacks', role: 'GP, Craft Ventures', group: 'board' },
      { name: 'Jason Calacanis', role: 'Angel Investor, TWIST Host', group: 'board' },
      { name: 'Jeff Bezos', role: 'Founder, Amazon & Blue Origin', group: 'board' },
      { name: 'Lex Fridman', role: 'AI Researcher & Podcaster', group: 'board' },
      { name: 'Sam Altman', role: 'CEO, OpenAI', group: 'board' },
      { name: 'Jensen Huang', role: 'CEO, NVIDIA', group: 'board' },
      { name: 'Balaji Srinivasan', role: 'Angel Investor & Author', group: 'board' },
      { name: "Kevin O'Leary", role: 'Investor, Shark Tank', group: 'board' },
      { name: 'Naval Ravikant', role: 'Co-founder, AngelList', group: 'advisor' },
      { name: 'Patrick Bet-David', role: 'CEO, Valuetainment', group: 'advisor' },
      { name: 'Pieter Levels', role: 'Indie Maker, Nomad List', group: 'advisor' },
      { name: 'Greg Isenberg', role: 'CEO, Late Checkout', group: 'advisor' },
      { name: 'Andrej Karpathy', role: 'AI Researcher, ex-Tesla', group: 'advisor' },
      { name: 'Marc Andreessen', role: 'GP, a16z', group: 'advisor' },
      { name: 'Gary Vaynerchuk', role: 'CEO, VaynerMedia', group: 'advisor' },
      { name: 'Riley Brown', role: 'AI Builder & Creator', group: 'advisor' },
      { name: 'Joe Rogan', role: 'Host, JRE', group: 'bonus' },
    ];

    // Get all creators and profiles in parallel
    const [creators, profilesRes] = await Promise.all([
      getAllCreators(),
      pool.query('SELECT creator_name, profile_json, updated_at FROM personas'),
    ]);
    const creatorMap = new Map(creators.map(c => [c.name, c]));
    const profileMap = new Map(profilesRes.rows.map((r: any) => [r.creator_name, { profile: r.profile_json, updated: r.updated_at }]));

    const members = BOARD_CONFIG.map(cfg => {
      const creator = creatorMap.get(cfg.name);
      const profileData = profileMap.get(cfg.name);
      const profile = profileData?.profile;
      const hasVoice = hasVoiceProfile(cfg.name);

      // Extract top 3 topics
      const topics = (profile?.top_topics || [])
        .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
        .slice(0, 3)
        .map((t: any) => t.topic || t);

      // Communication style summary
      const styleData = profile?.communication_style || {};
      const richness = styleData.vocabulary_richness;
      const qRate = styleData.question_rate;
      const avgLen = styleData.avg_sentence_length;
      let styleSummary = '';
      if (richness > 0.2) styleSummary += 'Rich vocabulary, ';
      else if (richness > 0.1) styleSummary += 'Moderate vocabulary, ';
      if (qRate > 0.15) styleSummary += 'highly inquisitive, ';
      else if (qRate > 0.08) styleSummary += 'conversational, ';
      if (avgLen > 40) styleSummary += 'long-form';
      else if (avgLen > 20) styleSummary += 'moderate pace';
      else styleSummary += 'concise';
      styleSummary = styleSummary.replace(/, $/, '');

      // Catchphrases (filter out noise)
      const rawCatchphrases = profile?.vocabulary_patterns?.catchphrases || [];
      const catchphrases = rawCatchphrases
        .filter((c: string) => c.length > 3 && !c.includes('nbsp') && !c.includes("there's there's"))
        .slice(0, 3);

      // Key quotes
      const quotes = (profile?.key_quotes || []).slice(0, 2);

      return {
        name: cfg.name,
        role: cfg.role,
        group: cfg.group,
        transcripts: creator?.transcript_count || 0,
        contentCount: (creator as any)?.content_count || 0,
        voice: hasVoice,
        topics,
        style: styleSummary,
        catchphrases,
        quotes,
        profileUpdated: profileData?.updated || null,
        totalWords: profile?.total_words || 0,
      };
    });

    res.json({ members, total: members.length });
  } catch (err: any) {
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

    // Load all profiles in parallel
    const profileEntries = await Promise.all(
      BOARD_MEMBERS.map(async (member) => {
        let profile = await getProfile(member);
        if (!profile) {
          profile = await buildProfile(member);
          if (profile) await saveProfile(profile);
        }
        return { member, profile: profile! };
      })
    );

    const result = await queryBoard(profileEntries, question);

    res.json({
      question,
      board_perspectives: result.perspectives,
      consensus: result.consensus,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Speak — query persona and return audio
app.post('/api/persona/:creator_name/speak', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.creator_name);
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    if (!hasVoiceProfile(name)) {
      return res.status(404).json({ error: `No voice profile for "${name}"` });
    }

    let profile = await getProfile(name);
    if (!profile) {
      profile = await buildProfile(name);
      if (!profile) {
        return res.status(404).json({ error: `Creator "${name}" not found` });
      }
      await saveProfile(profile);
    }

    const result = await queryPersona(profile, question);
    const audio = await generateVoice(result.text, name);

    if (!audio) {
      return res.status(502).json({
        error: 'TTS generation failed',
        text_response: result.text,
        source: result.source,
      });
    }

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': `inline; filename="${name.toLowerCase().replace(/\s+/g, '-')}-response.wav"`,
      'X-Persona-Text': Buffer.from(result.text).toString('base64'),
      'X-Persona-Source': result.source,
    });
    res.send(audio);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Board speak — each member responds with audio
app.post('/api/persona/board/speak', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const profileEntries = await Promise.all(
      BOARD_MEMBERS.map(async (member) => {
        let profile = await getProfile(member);
        if (!profile) {
          profile = await buildProfile(member);
          if (profile) await saveProfile(profile);
        }
        return { member, profile: profile! };
      })
    );

    // Generate text responses
    const boardResult = await queryBoard(profileEntries, question);

    // Generate audio for each member in parallel
    const perspectives = await Promise.all(
      boardResult.perspectives.map(async (p) => {
        let audioBase64: string | null = null;
        if (hasVoiceProfile(p.member)) {
          const audio = await generateVoice(p.response, p.member);
          if (audio) {
            audioBase64 = audio.toString('base64');
          }
        }
        return {
          member: p.member,
          response: p.response,
          source: p.source,
          has_audio: !!audioBase64,
          audio_base64: audioBase64,
        };
      })
    );

    res.json({
      question,
      board_perspectives: perspectives,
      consensus: boardResult.consensus,
    });
  } catch (err: any) {
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
  } catch (err: any) {
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
