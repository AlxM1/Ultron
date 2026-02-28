import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { classifySentiment } from '../sentiment';
import { QUESTION_SQL, classifyQuestionTheme } from '../questions';

const router = Router();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'content_intel',
});

// 1. GET /api/comments/sentiment
router.get('/sentiment', async (req: Request, res: Response) => {
  try {
    const { creator_id, days = '30', topic } = req.query;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';
    let paramIdx = 1;

    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }
    if (days) {
      whereClause += ` AND c.published_at >= NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }
    if (topic) {
      whereClause += ` AND LOWER(c.text) LIKE $${paramIdx++}`;
      params.push(`%${(topic as string).toLowerCase()}%`);
    }

    // Sample for classification (full table scan with keyword matching is too slow)
    // Use a materialized approach: classify in JS from a sample, count totals
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM comments c JOIN content co ON c.content_id = co.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get a random sample for sentiment breakdown
    const sampleSize = Math.min(total, 10000);
    const sampleResult = await pool.query(
      `SELECT c.text, c.published_at::date as date FROM comments c JOIN content co ON c.content_id = co.id ${whereClause} ORDER BY RANDOM() LIMIT ${sampleSize}`,
      params
    );

    let positive = 0, negative = 0, neutral = 0;
    const trendMap: Record<string, { positive: number; negative: number; neutral: number }> = {};

    for (const row of sampleResult.rows) {
      const s = classifySentiment(row.text);
      if (s === 'positive') positive++;
      else if (s === 'negative') negative++;
      else neutral++;

      const dateKey = row.date?.toISOString?.()?.slice(0, 10) || 'unknown';
      if (!trendMap[dateKey]) trendMap[dateKey] = { positive: 0, negative: 0, neutral: 0 };
      trendMap[dateKey][s]++;
    }

    // Scale to total if sampled
    const scale = total / (sampleSize || 1);
    const trend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, counts]) => ({
        date,
        positive: Math.round(counts.positive * scale),
        negative: Math.round(counts.negative * scale),
        neutral: Math.round(counts.neutral * scale),
      }));

    res.json({
      positive: Math.round(positive * scale),
      negative: Math.round(negative * scale),
      neutral: Math.round(neutral * scale),
      total,
      sample_size: sampleSize,
      trend,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/comments/questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const { creator_id, days = '90', limit = '50' } = req.query;
    const params: any[] = [];
    let whereClause = `WHERE ${QUESTION_SQL}`;
    let paramIdx = 1;

    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }
    if (days) {
      whereClause += ` AND c.published_at >= NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }

    const result = await pool.query(
      `SELECT c.text, c.likes, cr.name as creator_name
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       ${whereClause}
       ORDER BY c.likes DESC
       LIMIT 5000`,
      params
    );

    // Group by theme
    const themeMap: Record<string, { count: number; samples: any[]; creators: Set<string> }> = {};

    for (const row of result.rows) {
      const theme = classifyQuestionTheme(row.text);
      if (!themeMap[theme]) themeMap[theme] = { count: 0, samples: [], creators: new Set() };
      themeMap[theme].count++;
      if (themeMap[theme].samples.length < 5) {
        themeMap[theme].samples.push({ text: row.text, likes: row.likes });
      }
      themeMap[theme].creators.add(row.creator_name);
    }

    const themes = Object.entries(themeMap)
      .map(([theme, data]) => ({
        question_theme: theme,
        count: data.count,
        sample_comments: data.samples,
        creators_discussed: Array.from(data.creators).slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit as string));

    res.json(themes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/comments/pain-points
router.get('/pain-points', async (req: Request, res: Response) => {
  try {
    const { creator_id, days = '90' } = req.query;

    const frustrationWords = [
      'frustrated', 'wish', 'hate', 'annoying', "doesn't work", 'terrible',
      'disappointed', 'struggle', "can't", "won't", 'broken', 'useless', 'waste',
      'awful', 'horrible', 'pathetic', 'garbage', 'trash', 'scam', 'clickbait'
    ];

    const likeClauses = frustrationWords.map(w => `LOWER(c.text) LIKE '%${w.replace(/'/g, "''")}%'`);
    let whereClause = `WHERE (${likeClauses.join(' OR ')})`;
    const params: any[] = [];
    let paramIdx = 1;

    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }
    if (days) {
      whereClause += ` AND c.published_at >= NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }

    const result = await pool.query(
      `SELECT c.text, c.likes FROM comments c
       JOIN content co ON c.content_id = co.id
       ${whereClause}
       ORDER BY c.likes DESC LIMIT 5000`,
      params
    );

    // Cluster by which frustration words appear
    const themes: Record<string, { count: number; totalIntensity: number; samples: any[] }> = {};

    for (const row of result.rows) {
      const lower = row.text.toLowerCase();
      let matchedWords: string[] = [];
      for (const w of frustrationWords) {
        if (lower.includes(w)) matchedWords.push(w);
      }
      // Use primary frustration word as theme
      const theme = matchedWords[0] || 'general frustration';
      if (!themes[theme]) themes[theme] = { count: 0, totalIntensity: 0, samples: [] };
      themes[theme].count++;
      themes[theme].totalIntensity += matchedWords.length;
      if (themes[theme].samples.length < 5) {
        themes[theme].samples.push({ text: row.text, likes: row.likes });
      }
    }

    const painPoints = Object.entries(themes)
      .map(([theme, data]) => ({
        theme,
        count: data.count,
        intensity_score: parseFloat((data.totalIntensity / data.count).toFixed(2)),
        samples: data.samples,
      }))
      .sort((a, b) => b.count - a.count);

    res.json(painPoints);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/comments/engagement
router.get('/engagement', async (req: Request, res: Response) => {
  try {
    const { creator_id, limit = '50' } = req.query;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';
    let paramIdx = 1;

    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }

    const result = await pool.query(
      `SELECT co.title as content_title, cr.name as creator,
              COUNT(c.id) as comments_count,
              (co.metrics->>'view_count')::int as view_count,
              CASE WHEN (co.metrics->>'view_count')::int > 0
                THEN ROUND(COUNT(c.id)::numeric / (co.metrics->>'view_count')::int * 100, 4)
                ELSE 0 END as comment_ratio
       FROM comments c
       JOIN content co ON c.content_id = co.id
       JOIN creators cr ON co.creator_id = cr.id
       ${whereClause}
       AND co.metrics->>'view_count' IS NOT NULL
       AND (co.metrics->>'view_count')::int > 0
       GROUP BY co.id, co.title, cr.name, co.metrics
       HAVING COUNT(c.id) >= 5
       ORDER BY comment_ratio DESC
       LIMIT $${paramIdx}`,
      [...params, parseInt(limit as string)]
    );

    res.json(result.rows.map(r => ({
      content_title: r.content_title,
      creator: r.creator,
      comments_count: parseInt(r.comments_count),
      view_count: r.view_count,
      comment_ratio: parseFloat(r.comment_ratio),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/comments/compare
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { topic, creators } = req.query;
    if (!topic || !creators) {
      return res.status(400).json({ error: 'topic and creators params required' });
    }

    const creatorList = (creators as string).split(',').map(c => c.trim());
    const results: any[] = [];

    for (const creatorName of creatorList) {
      const commentResult = await pool.query(
        `SELECT c.text, c.likes FROM comments c
         JOIN content co ON c.content_id = co.id
         JOIN creators cr ON co.creator_id = cr.id
         WHERE LOWER(cr.name) LIKE $1 AND LOWER(c.text) LIKE $2
         ORDER BY c.likes DESC LIMIT 2000`,
        [`%${creatorName.toLowerCase()}%`, `%${(topic as string).toLowerCase()}%`]
      );

      let positive = 0, negative = 0, neutral = 0;
      const themeCount: Record<string, number> = {};

      for (const row of commentResult.rows) {
        const s = classifySentiment(row.text);
        if (s === 'positive') positive++;
        else if (s === 'negative') negative++;
        else neutral++;

        // Simple theme extraction from question themes
        const theme = classifyQuestionTheme(row.text);
        themeCount[theme] = (themeCount[theme] || 0) + 1;
      }

      const topThemes = Object.entries(themeCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }));

      results.push({
        name: creatorName,
        total_comments: commentResult.rows.length,
        sentiment_breakdown: { positive, negative, neutral },
        top_themes: topThemes,
      });
    }

    res.json({ topic, creators: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/comments/trending
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);

    // Get recent comments text
    const currentResult = await pool.query(
      `SELECT c.text FROM comments c
       WHERE c.published_at >= NOW() - INTERVAL '${daysNum} days'
       ORDER BY RANDOM() LIMIT 10000`
    );

    const previousResult = await pool.query(
      `SELECT c.text FROM comments c
       WHERE c.published_at >= NOW() - INTERVAL '${daysNum * 2} days'
       AND c.published_at < NOW() - INTERVAL '${daysNum} days'
       ORDER BY RANDOM() LIMIT 10000`
    );

    // Extract top keywords (simple word frequency, skip stop words)
    const STOP_WORDS = new Set([
      'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
      'or', 'but', 'not', 'with', 'this', 'that', 'you', 'i', 'he', 'she', 'we',
      'they', 'my', 'your', 'his', 'her', 'our', 'its', 'be', 'are', 'was', 'were',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'can', 'may', 'might', 'just', 'so', 'if', 'from', 'as', 'by', 'about', 'up',
      'out', 'no', 'yes', 'like', 'get', 'got', 'me', 'what', 'how', 'all', 'been',
      'more', 'when', 'who', 'which', 'their', 'there', 'than', 'them', 'then',
      'also', 'very', 'really', 'much', 'even', 'too', 'going', 'one', 'don', 'think',
      'know', 'people', 'make', 'im', 'dont', 'thing', 'way', 'still', 'see', 'need',
      'want', 'use', 'good', 'right', 'man', 'guy', 'great', 'well', 'back', 'time'
    ]);

    function countWords(texts: string[]): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const text of texts) {
        const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
        const seen = new Set<string>();
        for (const w of words) {
          if (w.length < 3 || STOP_WORDS.has(w) || seen.has(w)) continue;
          seen.add(w);
          counts[w] = (counts[w] || 0) + 1;
        }
      }
      return counts;
    }

    const currentCounts = countWords(currentResult.rows.map(r => r.text));
    const previousCounts = countWords(previousResult.rows.map(r => r.text));

    // Find trending (highest growth)
    const trending = Object.entries(currentCounts)
      .filter(([, count]) => count >= 20)
      .map(([topic, current_count]) => {
        const previous_count = previousCounts[topic] || 1;
        const growth_pct = parseFloat((((current_count - previous_count) / previous_count) * 100).toFixed(1));
        // Quick sentiment from the topic word itself
        const sentiment = classifySentiment(topic);
        return { topic, current_count, previous_count, growth_pct, sentiment };
      })
      .sort((a, b) => b.growth_pct - a.growth_pct)
      .slice(0, 30);

    res.json({ period_days: daysNum, trending });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Keyword helpers ───

const KEYWORD_STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'to','of','in','for','on','with','at','by','from','this','that','it','its',
  'my','your','he','she','they','we','i','me','him','her','us','them','but','and',
  'or','if','so','not','no','just','very','really','also','too','then','than',
  'more','most','some','all','any','each','every','both','few','many','much',
  'own','other','another','such','only','same','into','over','after','before',
  'between','about','up','out','off','down','through','during','until','against',
  'among','within','without','because','since','while','although','though','even',
  'still','already','yet','ever','never','always','sometimes','often','usually',
  'how','what','why','where','when','who','which','like','get','got','one','would',
  'going','go','know','think','want','make','see','look','come','take','give',
  'say','said','tell','told','well','good','great','video','channel','thanks',
  'thank','please','lol','haha','yeah','yes','ok','okay','hey','hi','wow','oh',
  'omg','dont','im','ive','youre','thats','hes','shes','theyre','wont','cant',
  'didnt','doesnt','isnt','wasnt','werent','shouldnt','couldnt','wouldnt',
  'lets','ill','youll','hell','shell','theyll','were','youd','hed','shed',
  'theyd','wed','id','youve','theyve','weve','people','thing','things','way',
  'man','guy','back','time','right','need','use','new','work','been','much',
  'something','someone','really','actually','literally','basically','probably',
  'you','his','now','there','these','here','their','been','has','had','being',
  'them','those','could','should','would','does','did','our','been','more',
  'than','when','who','what','how','why','where','which','just','also','very',
  'too','even','still','already','yet','ever','never','always','often','usually',
  'people','put','said','says','gonna','gotta','everything','nothing','anything',
  'everyone','nobody','anybody','everybody','lot','lots','kind','sort','bit',
  'stuff','maybe','sure','done','made','whole','long','big','real','little',
  'thought','around','part','keep','point','day','year','years','first','last',
]);

const KEYWORD_CATEGORIES: Record<string, string[]> = {
  ai: ['ai','gpt','chatgpt','claude','llm','model','neural','machine','learning','openai','anthropic','gemini','copilot'],
  crypto: ['bitcoin','crypto','blockchain','token','web3','nft','ethereum'],
  business: ['startup','revenue','mrr','saas','funding','investor','profit','scale','growth'],
  tools: ['api','code','python','javascript','react','docker','github','vscode','cursor'],
  career: ['job','hire','salary','freelance','remote','career','interview','resume'],
};

function detectCategory(word: string): string | null {
  for (const [cat, words] of Object.entries(KEYWORD_CATEGORIES)) {
    if (words.includes(word)) return cat;
  }
  return null;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3 && !KEYWORD_STOP_WORDS.has(w));
}

// 7. GET /api/comments/keywords
router.get('/keywords', async (req: Request, res: Response) => {
  try {
    const { creator_id, days = '30', limit = '100', min_count = '10' } = req.query;
    const daysNum = parseInt(days as string);
    const limitNum = parseInt(limit as string);
    const minCount = parseInt(min_count as string);

    const params: any[] = [];
    let whereClause = `WHERE c.published_at >= NOW() - INTERVAL '${daysNum} days'`;
    let paramIdx = 1;
    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }

    // Current period
    const currentResult = await pool.query(
      `SELECT c.text FROM comments c JOIN content co ON c.content_id = co.id ${whereClause} ORDER BY c.published_at DESC LIMIT 50000`,
      params
    );

    // Previous period (for trend)
    const prevWhere = whereClause
      .replace(`NOW() - INTERVAL '${daysNum} days'`, `NOW() - INTERVAL '${daysNum * 2} days'`)
      + ` AND c.published_at < NOW() - INTERVAL '${daysNum} days'`;
    const prevResult = await pool.query(
      `SELECT c.text FROM comments c JOIN content co ON c.content_id = co.id ${prevWhere} ORDER BY c.published_at DESC LIMIT 50000`,
      params
    );

    // Count words in current period
    const wordCounts: Record<string, number> = {};
    const wordTexts: Record<string, string[]> = {}; // store texts for sentiment
    for (const row of currentResult.rows) {
      const words = new Set(tokenize(row.text));
      for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
        if (!wordTexts[w]) wordTexts[w] = [];
        if (wordTexts[w].length < 200) wordTexts[w].push(row.text);
      }
    }

    // Count words in previous period
    const prevCounts: Record<string, number> = {};
    for (const row of prevResult.rows) {
      const words = new Set(tokenize(row.text));
      for (const w of words) {
        prevCounts[w] = (prevCounts[w] || 0) + 1;
      }
    }

    // Filter and sort
    const filtered = Object.entries(wordCounts)
      .filter(([, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200);

    const keywords = filtered.slice(0, limitNum).map(([word, count]) => {
      // Sentiment ratio from sampled texts
      let positive = 0, negative = 0, neutral = 0;
      for (const t of (wordTexts[word] || [])) {
        const s = classifySentiment(t);
        if (s === 'positive') positive++;
        else if (s === 'negative') negative++;
        else neutral++;
      }
      const total = positive + negative + neutral || 1;

      const prev = prevCounts[word] || 0;
      const trend_pct = prev > 0
        ? parseFloat((((count - prev) / prev) * 100).toFixed(1))
        : (count > 0 ? 100 : 0);

      return {
        word,
        count,
        sentiment: {
          positive: parseFloat((positive / total * 100).toFixed(1)),
          negative: parseFloat((negative / total * 100).toFixed(1)),
          neutral: parseFloat((neutral / total * 100).toFixed(1)),
        },
        trend_pct,
        category: detectCategory(word),
      };
    });

    res.json(keywords);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/comments/keywords/timeseries
router.get('/keywords/timeseries', async (req: Request, res: Response) => {
  try {
    const { keywords: kw, days = '90', interval = 'week', creator_id } = req.query;
    if (!kw) return res.status(400).json({ error: 'keywords param required (comma-separated)' });

    const keywordList = (kw as string).split(',').map(k => k.trim().toLowerCase());
    const daysNum = parseInt(days as string);
    const trunc = interval === 'day' ? 'day' : interval === 'month' ? 'month' : 'week';

    const params: any[] = [];
    let whereClause = `WHERE c.published_at >= NOW() - INTERVAL '${daysNum} days'`;
    let paramIdx = 1;
    if (creator_id) {
      whereClause += ` AND co.creator_id = $${paramIdx++}`;
      params.push(creator_id);
    }

    const result = await pool.query(
      `SELECT c.text, DATE_TRUNC('${trunc}', c.published_at)::date as period
       FROM comments c JOIN content co ON c.content_id = co.id
       ${whereClause}
       ORDER BY period`,
      params
    );

    // Count each keyword per period
    const data: Record<string, Record<string, number>> = {};
    for (const kword of keywordList) data[kword] = {};

    for (const row of result.rows) {
      const lower = row.text.toLowerCase();
      const period = row.period?.toISOString?.()?.slice(0, 10) || 'unknown';
      for (const kword of keywordList) {
        if (lower.includes(kword)) {
          if (!data[kword][period]) data[kword][period] = 0;
          data[kword][period]++;
        }
      }
    }

    const keywords = keywordList.map(word => ({
      word,
      data: Object.entries(data[word])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
    }));

    res.json({ keywords });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
