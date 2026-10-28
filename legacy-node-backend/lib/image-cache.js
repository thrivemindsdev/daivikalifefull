// Disk cache for images stored in PostgreSQL (originals and resized copies).
// Lives in a writable temp folder (the app folder is read-only in the Docker image); set IMAGE_CACHE_DIR to change it.
import fs from 'fs';
import os from 'os';
import path from 'path';

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || path.join(os.tmpdir(), 'daivika-image-cache');
// Older builds cached here; still read so existing local caches keep working
const LEGACY_DIR = path.join(process.cwd(), 'data', 'image_cache');

export function readCachedImage(key) {
  for (const dir of [CACHE_DIR, LEGACY_DIR]) {
    try {
      const data = fs.readFileSync(path.join(dir, key));
      let contentType = 'image/jpeg';
      try { contentType = JSON.parse(fs.readFileSync(path.join(dir, `${key}.meta.json`), 'utf8')).contentType || contentType; } catch {}
      return { data, contentType };
    } catch {}
  }
  return null;
}

export function writeCachedImage(key, data, contentType) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, key), data);
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.meta.json`), JSON.stringify({ contentType }));
  } catch (err) {
    console.warn('[image-cache] could not write cache:', err.message);
  }
}
