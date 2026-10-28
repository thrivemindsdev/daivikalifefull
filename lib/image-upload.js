'use client';

// Shrinks a photo in the browser before it is uploaded. Phone photos are often 5–10 MB;
// after this they are usually a few hundred KB, so uploads finish much faster on mobile data.
// The server still re-checks and re-compresses every upload.
const MAX_DIMENSION = 2048;
const SKIP_BELOW_BYTES = 300 * 1024;

export async function shrinkImage(file, { maxDimension = MAX_DIMENSION, quality = 0.85 } = {}) {
  if (typeof window === 'undefined' || !(file instanceof Blob)) return file;
  // GIF (animation), SVG and unknown types are sent unchanged
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < SKIP_BELOW_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.png');
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
