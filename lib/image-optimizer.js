/**
 * Normalizes and sanitizes any image URL or file path.
 * - Strips localhost origins (e.g. http://localhost:3000/api/images/... -> /api/images/...)
 * - Preserves HTTPS / data URLs as-is
 * - Resolves local paths (/api/images/..., /uploads/..., or bare filename)
 */
export function getSafeImageUrl(img) {
  if (!img) return '';
  if (typeof img === 'object') {
    img = img.url || img.src || img.path || '';
  }
  if (!img || typeof img !== 'string') return '';

  let clean = img.trim();

  // Strip localhost / 127.0.0.1 origins
  if (clean.includes('localhost:') || clean.includes('127.0.0.1:')) {
    try {
      const u = new URL(clean);
      clean = u.pathname + u.search;
    } catch {
      const slashIdx = clean.indexOf('/', clean.indexOf('://') + 3);
      if (slashIdx !== -1) clean = clean.slice(slashIdx);
    }
  }

  // Absolute external URLs (e.g. old cloudinary or unsplash references)
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }

  // Leading slash paths (e.g. /api/images/[id], /uploads/...)
  if (clean.startsWith('/')) {
    return clean;
  }

  // uploads/ relative path
  if (clean.startsWith('uploads/')) {
    return `/${clean}`;
  }

  // Bare upload filename (e.g. file-12345.jpg, image-12345.png)
  return `/uploads/${clean}`;
}

// Resized copies the image API can produce (keep in sync with app/api/images/[id]/route.js)
const IMAGE_WIDTHS = [160, 320, 480, 640, 960, 1280];

/**
 * Returns a safe image URL. Images stored in PostgreSQL (/api/images/[id]) are requested at the
 * smallest stored width that covers `width`, so cards and thumbnails don't download full-size photos.
 *
 * @param {string} url - The original image URL or path
 * @param {number} [width] - Width the image is displayed at (CSS pixels)
 * @returns {string} - The safe URL
 */
export function getOptimizedImageUrl(url, width) {
  const safe = getSafeImageUrl(url);
  // Cloudinary images: let Cloudinary resize and pick the best format (WebP/AVIF) for each browser
  const cld = safe.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!(?:[a-z]_[^/,]+,?)+\/)(.*)$/i);
  if (cld) {
    const w = width ? (IMAGE_WIDTHS.find(x => x >= width) || IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]) : 0;
    return `${cld[1]}f_auto,q_auto${w ? `,c_limit,w_${w}` : ''}/${cld[2]}`;
  }
  if (!width || !safe.startsWith('/api/images/') || safe.includes('?')) return safe;
  const w = IMAGE_WIDTHS.find(x => x >= width) || IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${safe}?w=${w}`;
}