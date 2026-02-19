import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://content_intel:password@localhost:5432/content_intel',
});

async function seedCreators() {
  try {
    console.log('Loading seed data...');
    const seedData = JSON.parse(
      await readFile(join(__dirname, 'creators.json'), 'utf-8')
    );

    let inserted = 0;

    // Seed YouTube creators
    for (const creator of seedData.youtube) {
      await pool.query(
        `INSERT INTO creators (platform, handle, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (platform, handle) DO NOTHING`,
        ['youtube', creator.handle, creator.name]
      );
      inserted++;
      console.log(`✓ Added YouTube creator: ${creator.name} (@${creator.handle})`);
    }

    // Seed Twitter creators
    for (const creator of seedData.twitter) {
      await pool.query(
        `INSERT INTO creators (platform, handle, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (platform, handle) DO NOTHING`,
        ['twitter', creator.handle, creator.name]
      );
      inserted++;
      console.log(`✓ Added Twitter creator: ${creator.name} (@${creator.handle})`);
    }

    console.log(`\n✓ Seeding complete! Added ${inserted} creators.`);
    console.log(`  - YouTube: ${seedData.youtube.length}`);
    console.log(`  - Twitter: ${seedData.twitter.length}`);

  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

seedCreators();
