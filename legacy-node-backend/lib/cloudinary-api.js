// Cloudinary storage for uploaded images and videos (signed REST API, no SDK needed).
// Files go into CLOUDINARY_FOLDER (default "Clixdot/Daivika"). When Cloudinary is not configured,
// lib/file-storage.js keeps using PostgreSQL / local files as before.
import crypto from 'crypto';


export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return {
    configured: Boolean(cloudName && apiKey && apiSecret),
    cloudName,
    apiKey,
    apiSecret,
    folder: (process.env.CLOUDINARY_FOLDER || 'Clixdot/Daivika').replace(/^\/+|\/+$/g, ''),
  };
}

// Cloudinary signature: sha1 of the sorted "key=value" pairs joined with "&", followed by the API secret
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== '' && !['file', 'api_key', 'resource_type', 'cloud_name'].includes(k))
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/**
 * Uploads a file buffer to Cloudinary and returns its secure URL.
 *  resourceType: 'image' | 'video' | 'auto'
 */
export async function uploadBufferToCloudinary(buffer, { filename = 'upload', mime = 'application/octet-stream', resourceType = 'auto' } = {}) {
  const { configured, cloudName, apiKey, apiSecret, folder } = cloudinaryConfig();
  if (!configured) throw new Error('Cloudinary is not configured');

  const params = { folder, timestamp: Math.floor(Date.now() / 1000), unique_filename: 'true', use_filename: 'true' };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append('api_key', apiKey);
  form.append('signature', signParams(params, apiSecret));
  form.append('file', new Blob([buffer], { type: mime }), filename.replace(/[^\w.-]/g, '_').slice(0, 80) || 'upload');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Cloudinary upload failed (${res.status})`);
  return { url: json.secure_url, publicId: json.public_id, resourceType: json.resource_type, bytes: json.bytes };
}

const isOurCloudinaryUrl = (url) => {
  const { cloudName } = cloudinaryConfig();
  return typeof url === 'string' && cloudName && url.includes(`res.cloudinary.com/${cloudName}/`);
};

// public_id and resource type from a delivery URL like
// https://res.cloudinary.com/<cloud>/image/upload/v123/Clixdot/Daivika/name.webp
export function parseCloudinaryUrl(url) {
  const m = String(url).match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  return m ? { resourceType: m[1], publicId: decodeURIComponent(m[2]) } : null;
}

export async function deleteCloudinaryUrl(url) {
  const { configured, cloudName, apiKey, apiSecret } = cloudinaryConfig();
  if (!configured || !isOurCloudinaryUrl(url)) return false;
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return false;
  const params = { public_id: parsed.publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append('api_key', apiKey);
  form.append('signature', signParams(params, apiSecret));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${parsed.resourceType}/destroy`, { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  return json.result === 'ok';
}

// Signature for a browser-side upload straight to Cloudinary (used for large videos)
export function signedUploadParams() {
  const { configured, cloudName, apiKey, apiSecret, folder } = cloudinaryConfig();
  if (!configured) return null;
  const params = { folder, timestamp: Math.floor(Date.now() / 1000), unique_filename: 'true', use_filename: 'true' };
  return { cloudName, apiKey, ...params, signature: signParams(params, apiSecret) };
}

export { isOurCloudinaryUrl };
