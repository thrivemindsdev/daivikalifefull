export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import { readCachedImage, writeCachedImage } from '@/lib/image-cache';

// GET /api/images/[id]?w=480 — serves an image stored in PostgreSQL.
// With ?w= it returns a resized WebP copy (cached on disk), so product cards and thumbnails don't
// download full-size photos.
const WIDTHS = [160, 320, 480, 640, 960, 1280];
const PROXY_HEADER = 'x-daivika-image-proxy';

const send = (data, contentType, etag) => new Response(data, {
  status: 200,
  headers: {
    'Content-Type': contentType,
    'Content-Length': String(data.length),
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: `"${etag}"`,
  },
});

async function loadOriginal(id, req) {
  const cached = readCachedImage(id);
  if (cached) return cached;

  try {
    const stored = await prisma.storedImage.findUnique({ where: { id } });
    if (stored?.data) {
      const image = { data: Buffer.from(stored.data), contentType: stored.mimeType || 'image/jpeg' };
      writeCachedImage(id, image.data, image.contentType);
      return image;
    }
  } catch {
    // Database not reachable (e.g. local development without Postgres)
  }

  // Local development only: borrow the image from the live site. Never in production, and never
  // for a request that is itself a proxy call (that would make the server call itself in a loop).
  if (process.env.NODE_ENV !== 'production' && !req.headers.get(PROXY_HEADER)) {
    try {
      const res = await fetch(`https://daivika.in/api/images/${id}`, { headers: { [PROXY_HEADER]: '1' }, signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const image = { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || 'image/jpeg' };
        writeCachedImage(id, image.data, image.contentType);
        return image;
      }
    } catch {}
  }
  return null;
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return new Response('Image ID required', { status: 400 });
    // Image ids are cuid-style; anything else (e.g. "../") must not reach the file system
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return new Response('Invalid image ID', { status: 400 });

    const requested = parseInt(new URL(req.url).searchParams.get('w'), 10);
    const width = WIDTHS.includes(requested) ? requested : 0;

    if (width) {
      const resized = readCachedImage(`${id}_w${width}`);
      if (resized) return send(resized.data, resized.contentType, `${id}-${width}`);
    }

    const original = await loadOriginal(id, req);
    if (!original) {
      return new Response('Image not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
    }

    if (width && !/gif|svg/.test(original.contentType)) {
      try {
        const sharp = (await import('sharp')).default;
        const data = await sharp(original.data).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
        writeCachedImage(`${id}_w${width}`, data, 'image/webp');
        return send(data, 'image/webp', `${id}-${width}`);
      } catch (err) {
        console.warn('[images] resize failed, sending original:', err.message);
      }
    }
    return send(original.data, original.contentType, id);
  } catch (error) {
    console.error('Image serve error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
