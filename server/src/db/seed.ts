import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });
import { db, pool } from './connection.js';
import { tiers } from './schema.js';

const defaultTiers = [
  { name: 'Silver', discountMultiplier: '0.0500' },
  { name: 'Gold', discountMultiplier: '0.1000' },
  { name: 'Platinum', discountMultiplier: '0.2000' },
];

async function seed() {
  console.log('Seeding default tiers...');
  await db.insert(tiers).values(defaultTiers).onConflictDoNothing();
  console.log('Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
