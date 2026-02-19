import { Hono } from 'hono';
import pool from '../db.js';
import { generateIdea } from '../analyzers/trends.js';

const ideas = new Hono();

// GET /api/ideas - Get scored content ideas
ideas.get('/', async (c) => {
  try {
    const status = c.req.query('status');
    const minScore = parseFloat(c.req.query('min_score') || '0');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = 'SELECT * FROM ideas WHERE score >= $1';
    const params = [minScore];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM ideas WHERE score >= $1';
    const countParams = [minScore];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    return c.json({
      ideas: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });

  } catch (err) {
    console.error('Error getting ideas:', err);
    return c.json({ error: 'Failed to get ideas' }, 500);
  }
});

// POST /api/ideas - Create a new content idea
ideas.post('/', async (c) => {
  try {
    const { title, description, source_content_ids, score } = await c.req.json();

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    const result = await pool.query(
      `INSERT INTO ideas (title, description, source_content_ids, score)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        title,
        description || null,
        source_content_ids || [],
        score || 0
      ]
    );

    return c.json({
      success: true,
      idea: result.rows[0]
    }, 201);

  } catch (err) {
    console.error('Error creating idea:', err);
    return c.json({ error: 'Failed to create idea' }, 500);
  }
});

// PATCH /api/ideas/:id - Update idea status
ideas.patch('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { status, score, description } = await c.req.json();

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (score !== undefined) {
      paramCount++;
      updates.push(`score = $${paramCount}`);
      params.push(score);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    paramCount++;
    params.push(id);

    const result = await pool.query(
      `UPDATE ideas SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Idea not found' }, 404);
    }

    return c.json({
      success: true,
      idea: result.rows[0]
    });

  } catch (err) {
    console.error('Error updating idea:', err);
    return c.json({ error: 'Failed to update idea' }, 500);
  }
});

// DELETE /api/ideas/:id - Delete idea
ideas.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const result = await pool.query(
      'DELETE FROM ideas WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Idea not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Idea deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting idea:', err);
    return c.json({ error: 'Failed to delete idea' }, 500);
  }
});

// POST /api/ideas/generate - Auto-generate ideas from trends
ideas.post('/generate', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');

    // Get top trends
    const trendsResult = await pool.query(
      'SELECT * FROM trends ORDER BY score DESC LIMIT $1',
      [limit]
    );

    const generatedIdeas = [];

    for (const trend of trendsResult.rows) {
      // Get content related to this trend
      const contentResult = await pool.query(
        `SELECT id FROM content 
         WHERE title ILIKE $1 OR description ILIKE $1
         LIMIT 10`,
        [`%${trend.keyword}%`]
      );

      const sourceContentIds = contentResult.rows.map(r => r.id);

      const idea = generateIdea(trend, sourceContentIds);

      // Insert into database
      const insertResult = await pool.query(
        `INSERT INTO ideas (title, description, source_content_ids, score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [idea.title, idea.description, sourceContentIds, idea.estimatedScore]
      );

      if (insertResult.rows.length > 0) {
        generatedIdeas.push(insertResult.rows[0]);
      }
    }

    return c.json({
      success: true,
      generated: generatedIdeas.length,
      ideas: generatedIdeas
    });

  } catch (err) {
    console.error('Error generating ideas:', err);
    return c.json({ error: 'Failed to generate ideas' }, 500);
  }
});

export default ideas;
