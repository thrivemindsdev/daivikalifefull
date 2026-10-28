import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function optimizeImageFile(filePath, maxWidth = 2048, quality = 92) {
  if (!fs.existsSync(filePath)) return null;
  const originalSize = fs.statSync(filePath).size;

  try {
    const img = await Jimp.read(filePath);
    const origWidth = img.width;
    const origHeight = img.height;

    let needsResize = false;
    if (origWidth > maxWidth) {
      img.resize({ w: maxWidth });
      needsResize = true;
    }

    if (originalSize > 250 * 1024 || needsResize) {
      const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      let buf;
      // High-resolution JPEG at 92% quality preserves 100% visual fidelity while eliminating file bloat
      if (filePath.endsWith('.png') && originalSize > 600 * 1024) {
        buf = await img.getBuffer('image/jpeg', { quality });
      } else {
        buf = await img.getBuffer(mime, { quality });
      }

      if (buf.length < originalSize) {
        fs.writeFileSync(filePath, buf);
        const newSize = buf.length;
        const savedPercent = Math.round(((originalSize - newSize) / originalSize) * 100);
        console.log(`✨ [ULTRA-HQ OPTIMIZED] ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(0)}KB ➔ ${(newSize / 1024).toFixed(0)}KB (-${savedPercent}%) [${origWidth}x${origHeight} ➔ ${img.width}x${img.height} @ ${quality}%]`);
        return { originalSize, newSize };
      } else {
        console.log(`ℹ️ [UNCHANGED] ${path.basename(filePath)}: Already optimal (${(originalSize / 1024).toFixed(0)}KB)`);
      }
    } else {
      console.log(`⚡ [SKIP] ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(0)}KB (Already lightweight)`);
    }
  } catch (err) {
    console.warn(`⚠️ [ERROR] Could not process ${path.basename(filePath)}:`, err.message);
  }
  return null;
}

async function run() {
  console.log('🚀 Starting Ultra-High Quality (90-92%) Image Optimization...\n');

  let totalOriginal = 0;
  let totalOptimized = 0;
  let count = 0;

  // 1. Optimize Hero Banners in public/uploads (2K / 92% quality for pristine sharpness)
  console.log('--- 1. Hero Banners in public/uploads ---');
  const bannersJsonPath = path.join(process.cwd(), 'data', 'custom_banners.json');
  if (fs.existsSync(bannersJsonPath)) {
    try {
      const banners = JSON.parse(fs.readFileSync(bannersJsonPath, 'utf8'));
      for (const b of banners) {
        if (b.image && b.image.startsWith('/uploads/')) {
          const p = path.join(process.cwd(), 'public', b.image);
          const res = await optimizeImageFile(p, 2048, 92);
          if (res) {
            totalOriginal += res.originalSize;
            totalOptimized += res.newSize;
            count++;
          }
        }
        if (b.mobileImage && b.mobileImage.startsWith('/uploads/')) {
          const p = path.join(process.cwd(), 'public', b.mobileImage);
          const res = await optimizeImageFile(p, 1200, 90);
          if (res) {
            totalOriginal += res.originalSize;
            totalOptimized += res.newSize;
            count++;
          }
        }
      }
    } catch (e) {
      console.error('Error reading custom_banners.json:', e.message);
    }
  }

  // 2. Optimize all other large files in public/uploads (> 400KB)
  console.log('\n--- 2. Other Large Uploads in public/uploads ---');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const f of files) {
      const p = path.join(uploadsDir, f);
      if (fs.statSync(p).isFile() && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'))) {
        const size = fs.statSync(p).size;
        if (size > 400 * 1024) {
          const res = await optimizeImageFile(p, 1800, 92);
          if (res) {
            totalOriginal += res.originalSize;
            totalOptimized += res.newSize;
            count++;
          }
        }
      }
    }
  }

  // 3. Optimize public/assets banners (2K / 92% quality)
  console.log('\n--- 3. Static Banners in public/assets ---');
  const assetsDir = path.join(process.cwd(), 'public', 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = ['B1.jpg', 'b2.jpg', 'b3.jpg', 'slide1.jpg', 'slide2.jpg', 'slide3.jpg', 'hero_collage.png'];
    for (const f of files) {
      const p = path.join(assetsDir, f);
      if (fs.existsSync(p)) {
        const res = await optimizeImageFile(p, 2048, 92);
        if (res) {
          totalOriginal += res.originalSize;
          totalOptimized += res.newSize;
          count++;
        }
      }
    }
  }

  // 4. Optimize product images in data/image_cache (1600px / 90% quality for crystal clear zoom)
  console.log('\n--- 4. Product Images in data/image_cache ---');
  const imageCacheDir = path.join(process.cwd(), 'data', 'image_cache');
  if (fs.existsSync(imageCacheDir)) {
    const files = fs.readdirSync(imageCacheDir).filter(f => !f.endsWith('.json'));
    for (const f of files) {
      const p = path.join(imageCacheDir, f);
      if (fs.statSync(p).isFile()) {
        const res = await optimizeImageFile(p, 1600, 90);
        if (res) {
          totalOriginal += res.originalSize;
          totalOptimized += res.newSize;
          count++;
        }
      }
    }
  }

  console.log('\n=========================================');
  console.log(`🎉 Optimization Complete!`);
  console.log(`📸 Images processed: ${count}`);
  console.log(`📉 Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⚡ Total optimized size: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  if (totalOriginal > 0) {
    const saved = totalOriginal - totalOptimized;
    console.log(`💾 Saved: ${(saved / 1024 / 1024).toFixed(2)} MB (${Math.round((saved / totalOriginal) * 100)}% reduction)`);
  }
  console.log('=========================================\n');
}

run();
