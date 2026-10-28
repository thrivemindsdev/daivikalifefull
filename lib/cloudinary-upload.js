'use client';

// Uploads a video from the admin's browser straight to Cloudinary (signed by our server), so large
// files don't pass through the app server. Returns the video's secure URL.
import { API_BASE_URL } from '@/config';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const isCloudinaryVideo = (url) => /res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(String(url || ''));

// A still frame of a Cloudinary video, for cards and previews
export const cloudinaryVideoThumb = (url, width = 600) =>
  String(url).replace('/video/upload/', `/video/upload/so_1,f_jpg,c_limit,w_${width}/`).replace(/\.[a-z0-9]+$/i, '.jpg');

export async function uploadVideoToCloudinary(file, onProgress) {
  if (!file || !/^video\//.test(file.type)) throw new Error('Please choose a video file (MP4, MOV or WebM)');
  if (file.size > MAX_VIDEO_BYTES) throw new Error('Videos must be 100 MB or smaller');

  const token = localStorage.getItem('vaugun_token');
  const sigRes = await fetch(`${API_BASE_URL}/admin/cloudinary-signature`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const sigJson = await sigRes.json().catch(() => ({}));
  if (!sigRes.ok || !sigJson.success) throw new Error(sigJson.message || 'Could not start the upload');
  const { cloudName, apiKey, signature, ...params } = sigJson.data;

  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, String(v));
  form.append('api_key', apiKey);
  form.append('signature', signature);
  form.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let json = {};
      try { json = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) resolve(json.secure_url);
      else reject(new Error(json.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading the video'));
    xhr.send(form);
  });
}
