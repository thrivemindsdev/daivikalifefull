/**
 * migrate-images-to-db.js
 * 
 * One-time migration script: local /uploads/ images → PostgreSQL StoredImage table
 * Run: node scripts/migrate-images-to-db.js
 * 
 * What it does:
 *  1. Reads all Products, Categories, Collections, Banners from DB
 *  2. For records with /uploads/... image URLs, reads local file
 *  3. Creates StoredImage record in DB
 *  4. Updates the record's image URL to /api/images/[id]
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'public', 'uploads');

const prisma = new PrismaClient();

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.jfif': 'image/jpeg',
};

function getMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] || 'image/jpeg';
}

/**
 * Migrates a single image URL.
 * Returns new /api/images/[id] URL, or original URL if migration not needed/fails.
 */
async function migrateImageUrl(imageUrl, stats) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;

  // Already migrated or not a local upload
  if (!imageUrl.startsWith('/uploads/')) {
    stats.skipped++;
    return imageUrl;
  }

  const filename = path.basename(imageUrl);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`  [MISSING] Local file not found: ${filePath}`);
    stats.missing++;
    return imageUrl; // Keep old URL; file simply doesn't exist
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const mime = getMime(filename);

    const stored = await prisma.storedImage.create({
      data: {
        data: fileBuffer,
        mimeType: mime,
        filename: filename,
        size: fileBuffer.length,
      },
    });

    stats.migrated++;
    console.log(`  [OK] ${filename} -> /api/images/${stored.id}`);
    return `/api/images/${stored.id}`;
  } catch (err) {
    console.error(`  [ERROR] Failed to migrate ${filename}:`, err.message);
    stats.failed++;
    return imageUrl;
  }
}

async function main() {
  console.log('======================================================');
  console.log('  Daivika: Image Migration — local /uploads/ -> PostgreSQL');
  console.log('======================================================\n');

  const stats = { migrated: 0, skipped: 0, missing: 0, failed: 0 };

  // ── PRODUCTS ──────────────────────────────────────────────
  console.log('[1/4] Migrating Product images...');
  const products = await prisma.product.findMany();
  console.log(`  Found ${products.length} products`);

  for (const product of products) {
    const updates = {};

    // Main image
    const newMain = await migrateImageUrl(product.image, stats);
    if (newMain !== product.image) updates.image = newMain;

    // Sub images (JSON array)
    let subImages = [];
    try {
      subImages = typeof product.subImages === 'string'
        ? JSON.parse(product.subImages)
        : (product.subImages || []);
    } catch { subImages = []; }

    const newSubs = [];
    let subChanged = false;
    for (const sub of subImages) {
      const newSub = await migrateImageUrl(sub, stats);
      newSubs.push(newSub);
      if (newSub !== sub) subChanged = true;
    }
    if (subChanged) updates.subImages = newSubs;

    // Colors with images
    let colors = [];
    try {
      colors = typeof product.colors === 'string'
        ? JSON.parse(product.colors)
        : (product.colors || []);
    } catch { colors = []; }

    const newColors = [];
    let colorsChanged = false;
    for (const c of colors) {
      if (c && c.image) {
        const newImg = await migrateImageUrl(c.image, stats);
        if (newImg !== c.image) { newColors.push({ ...c, image: newImg }); colorsChanged = true; }
        else newColors.push(c);
      } else {
        newColors.push(c);
      }
    }
    if (colorsChanged) updates.colors = newColors;

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: product.id }, data: updates });
    }
  }

  // ── CATEGORIES ────────────────────────────────────────────
  console.log('\n[2/4] Migrating Category images...');
  const categories = await prisma.category.findMany();
  console.log(`  Found ${categories.length} categories`);

  for (const cat of categories) {
    const newImg = await migrateImageUrl(cat.image, stats);
    if (newImg !== cat.image) {
      await prisma.category.update({ where: { id: cat.id }, data: { image: newImg } });
    }
  }

  // ── COLLECTIONS ───────────────────────────────────────────
  console.log('\n[3/4] Migrating Collection images...');
  const collections = await prisma.collection.findMany();
  console.log(`  Found ${collections.length} collections`);

  for (const col of collections) {
    const newImg = await migrateImageUrl(col.image, stats);
    if (newImg !== col.image) {
      await prisma.collection.update({ where: { id: col.id }, data: { image: newImg } });
    }
  }

  // ── BANNERS ───────────────────────────────────────────────
  console.log('\n[4/4] Migrating Banner images...');
  const banners = await prisma.banner.findMany();
  console.log(`  Found ${banners.length} banners`);

  for (const banner of banners) {
    const updates = {};
    const newImg = await migrateImageUrl(banner.image, stats);
    if (newImg !== banner.image) updates.image = newImg;

    const newMob = await migrateImageUrl(banner.mobileImage, stats);
    if (newMob !== banner.mobileImage) updates.mobileImage = newMob;

    if (Object.keys(updates).length > 0) {
      await prisma.banner.update({ where: { id: banner.id }, data: updates });
    }
  }

  // ── SETTINGS (logo, etc.) ─────────────────────────────────
  console.log('\n[Settings] Migrating logo/settings images...');
  const logoSetting = await prisma.setting.findUnique({ where: { key: 'logo' } });
  if (logoSetting && logoSetting.value) {
    let val = logoSetting.value;
    const logoUrl = typeof val === 'object' ? val.url : val;
    if (logoUrl) {
      const newLogoUrl = await migrateImageUrl(logoUrl, stats);
      if (newLogoUrl !== logoUrl) {
        const newVal = typeof val === 'object' ? { ...val, url: newLogoUrl } : newLogoUrl;
        await prisma.setting.update({ where: { key: 'logo' }, data: { value: newVal } });
      }
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────
  console.log('\n======================================================');
  console.log('  Migration Complete!');
  console.log(`  Migrated : ${stats.migrated}`);
  console.log(`  Skipped  : ${stats.skipped} (not /uploads/ or already migrated)`);
  console.log(`  Missing  : ${stats.missing} (file not found on disk)`);
  console.log(`  Failed   : ${stats.failed}`);
  console.log('======================================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());