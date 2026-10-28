// One-time clean-up after removing the "Daivika Jewels" store: categories and products that were saved
// under the "jewels" store are moved to the Daivika store. Nothing is deleted; only the store field changes.
//
//   node scripts/merge-jewels-store.mjs          uses DATABASE_URL, or the data/*.json files when no database is set
import fs from 'fs';
import path from 'path';

const isJewels = (v) => /^jewels?$/i.test(String(v || '').trim());

async function main() {
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const cats = await prisma.category.updateMany({ where: { gender: { in: ['jewels', 'jewel', 'Jewels', 'JEWELS'] } }, data: { gender: 'daivika' } });
      const prods = await prisma.product.updateMany({ where: { gender: { in: ['jewels', 'jewel', 'Jewels', 'JEWELS'] } }, data: { gender: 'daivika' } });
      console.log(`Moved ${cats.count} categories and ${prods.count} products from the Jewels store to Daivika.`);
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  let total = 0;
  for (const name of ['custom_categories.json', 'custom_products.json']) {
    const file = path.join(process.cwd(), 'data', name);
    if (!fs.existsSync(file)) continue;
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = 0;
    for (const r of rows) if (isJewels(r.gender)) { r.gender = 'daivika'; changed++; }
    if (changed) fs.writeFileSync(file, JSON.stringify(rows, null, 2));
    console.log(`${name}: ${changed} moved to Daivika`);
    total += changed;
  }
  console.log(`No DATABASE_URL: updated the offline data files (${total} rows).`);
}

main().catch(err => { console.error('Could not merge the Jewels store:', err.message); process.exit(1); });
