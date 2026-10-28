import path from 'path';
import fs from 'fs';
import { Jimp } from 'jimp';
import prisma from '@/lib/prisma';
import { isDatabaseConnected } from '@/lib/db';
import { writeCachedImage } from '@/lib/image-cache';
import { cloudinaryConfig, uploadBufferToCloudinary, deleteCloudinaryUrl, isOurCloudinaryUrl } from '@/lib/cloudinary-api';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// MP4 / MOV (ISO media "ftyp" box, but not AVIF images) and WebM, recognised by their first bytes
const isVideoFile = (buf) => {
  if (!buf || buf.length < 12) return false;
  const brand = buf.subarray(4, 12).toString('latin1');
  if (brand.startsWith('ftyp') && !/^ftypavi[fs]/.test(brand)) return true;
  return buf.subarray(0, 4).toString('hex') === '1a45dfa3';
};
const videoMime = (buf) => (buf.subarray(0, 4).toString('hex') === '1a45dfa3' ? 'video/webm' : buf.subarray(8, 12).toString('latin1') === 'qt  ' ? 'video/quicktime' : 'video/mp4');
const assertVideoFile = (buf) => {
  if (buf.length > MAX_VIDEO_BYTES) throw new Error('Videos must be 100 MB or smaller');
};

// Keep getUploadsDir for migration script (reads existing local files)
export const getUploadsDir = () => {
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

/**
 * Prepares an uploaded image for storage: fixes phone-camera rotation, limits it to 2048px and saves it
 * as WebP (much smaller than JPEG/PNG at the same quality). Uses sharp (fast, native); falls back to
 * Jimp if sharp can't load. GIFs are kept as they are so animations survive.
 */
const MAX_DIMENSION = 2048;

export const optimizeImageBuffer = async (fileBuffer, originalName = '') => {
  const ext = path.extname(originalName).toLowerCase();
  const isGif = fileBuffer.subarray(0, 6).toString('latin1').startsWith('GIF8');
  const sourceMime = isGif ? 'image/gif' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  if (isGif) return { buffer: fileBuffer, mime: 'image/gif', extension: '.gif' };

  try {
    const sharp = (await import('sharp')).default;
    const buffer = await sharp(fileBuffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (buffer.length < fileBuffer.length || sourceMime !== 'image/webp') {
      return { buffer, mime: 'image/webp', extension: '.webp' };
    }
    return { buffer: fileBuffer, mime: sourceMime, extension: ext || '.webp' };
  } catch (err) {
    console.warn('[optimizeImageBuffer] sharp unavailable, using Jimp:', err.message);
  }

  try {
    const image = await Jimp.read(fileBuffer);
    if (image.width > MAX_DIMENSION) image.resize({ w: MAX_DIMENSION });
    const compressed = await image.getBuffer('image/jpeg', { quality: 85 });
    if (compressed.length < fileBuffer.length) return { buffer: compressed, mime: 'image/jpeg', extension: '.jpg' };
  } catch (err) {
    console.warn('[optimizeImageBuffer] Jimp fallback failed:', err.message);
  }
  return { buffer: fileBuffer, mime: sourceMime, extension: ext || '.jpg' };
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Accepts only real JPEG / PNG / WebP / GIF / AVIF files (checked by content, not by name).
// SVG is refused because it can carry scripts that would run on this site's origin.
export const assertImageFile = (buf) => {
  if (!buf || !buf.length) throw new Error('The uploaded file is empty');
  if (buf.length > MAX_UPLOAD_BYTES) throw new Error('Images must be 15 MB or smaller');
  const hex = buf.subarray(0, 12).toString('hex');
  const ascii = buf.subarray(0, 12).toString('latin1');
  const ok = hex.startsWith('ffd8ff')                                   // JPEG
    || hex.startsWith('89504e470d0a1a0a')                               // PNG
    || ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')         // GIF
    || (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')       // WebP
    || ascii.slice(4, 12) === 'ftypavif' || ascii.slice(4, 12) === 'ftypavis'; // AVIF
  if (!ok) throw new Error('Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded');
};

/**
 * Saves an uploaded image buffer to PostgreSQL as binary (bytea), or directly to disk.
 * Returns the public URL path: /api/images/[id] or /uploads/[filename]
 */
export const saveUploadedFile = async (fileBuffer, originalName = 'upload', folder = '') => {
  // Videos go to Cloudinary as they are (no database or local fallback: they are too large)
  if (isVideoFile(fileBuffer)) {
    assertVideoFile(fileBuffer);
    if (!cloudinaryConfig().configured) throw new Error('Video uploads need Cloudinary to be configured');
    const { url } = await uploadBufferToCloudinary(fileBuffer, { filename: originalName, mime: videoMime(fileBuffer), resourceType: 'video' });
    return url;
  }

  assertImageFile(fileBuffer);
  const { buffer: processedBuffer, mime, extension } = await optimizeImageBuffer(fileBuffer, originalName);
  const baseName = path.basename(originalName, path.extname(originalName)) || 'image';

  // Cloudinary (folder from CLOUDINARY_FOLDER) when configured; otherwise PostgreSQL / local disk as before
  if (cloudinaryConfig().configured) {
    try {
      const { url } = await uploadBufferToCloudinary(processedBuffer, { filename: `${baseName}${extension}`, mime, resourceType: 'image' });
      return url;
    } catch (err) {
      console.error('Cloudinary upload failed, storing the image in the database instead:', err.message);
    }
  }

  if (process.env.DATABASE_URL || isDatabaseConnected) {
    try {
      const stored = await prisma.storedImage.create({
        data: {
          data: processedBuffer,
          mimeType: mime,
          filename: originalName || 'upload',
          size: processedBuffer.length,
        },
      });

      // Warm the disk cache so the first view doesn't have to read the image back from the database
      writeCachedImage(stored.id, processedBuffer, mime);

      return `/api/images/${stored.id}`;
    } catch (err) {
      console.warn("Postgres StoredImage save failed, falling back to local public/uploads directory:", err.message);
    }
  }

  // Direct fast local file save when DB is not connected or Prisma fails
  const uploadsDir = getUploadsDir();
  const cleanName = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 60) || 'image';
  const filename = `${Date.now()}-${cleanName}${extension}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, processedBuffer);
  return `/uploads/${filename}`;
};

/**
 * Deletes a stored image from PostgreSQL by its URL path.
 * Also handles legacy /uploads/ paths (local files) for backward compatibility.
 */
export const deleteUploadedFile = async (fileUrl) => {
  if (!fileUrl) return;

  // Cloudinary file in this account
  if (isOurCloudinaryUrl(fileUrl)) {
    try {
      await deleteCloudinaryUrl(fileUrl);
    } catch (err) {
      console.warn('Failed to delete Cloudinary file:', err.message);
    }
    return;
  }

  // New DB-stored image
  if (fileUrl.startsWith('/api/images/')) {
    const id = fileUrl.replace('/api/images/', '');
    try {
      await prisma.storedImage.delete({ where: { id } });
    } catch (err) {
      console.warn("Failed to delete StoredImage from DB:", err.message);
    }
    return;
  }

  // Legacy: delete local file
  if (fileUrl.startsWith('/uploads/')) {
    try {
      const filename = path.basename(fileUrl);
      const filePath = path.join(getUploadsDir(), filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn("Failed to delete local uploaded file:", err.message);
    }
  }
};

// Aliases for compatibility
export const uploadToCloudinaryOrLocal = async (fileBuffer, originalName, folderName) => {
  return await saveUploadedFile(fileBuffer, originalName, folderName);
};

export const deleteFromCloudinary = async (imageUrl) => {
  return await deleteUploadedFile(imageUrl);
};

