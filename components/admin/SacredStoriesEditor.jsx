'use client';

// Admin editor for the home page "Sacred Stories & Rituals" gallery (setting key: sacred_stories)
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, UploadCloud, Save, Image as ImageIcon, Film } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { api, colors, inputStyle, labelStyle, Button, Card, EmptyState } from '@/components/vendor/VendorUI';
import { getSafeImageUrl } from '@/lib/image-optimizer';
import { shrinkImage } from '@/lib/image-upload';
import { uploadVideoToCloudinary, isCloudinaryVideo, cloudinaryVideoThumb } from '@/lib/cloudinary-upload';

const blank = () => ({ image: '', title: '', caption: '', link: '' });
const authToken = () => (typeof window !== 'undefined' ? localStorage.getItem('vaugun_token') : null);

export default function SacredStoriesEditor() {
  const [stories, setStories] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api(`/public/settings?t=${Date.now()}`)
      .then(d => setStories(Array.isArray(d?.sacred_stories) ? d.sacred_stories : []))
      .catch(() => setStories([]));
  }, []);

  const update = (i, patch) => setStories(list => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const move = (i, dir) => setStories(list => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const upload = async (i, file) => {
    if (!file) return;
    setUploading(i);
    try {
      const form = new FormData();
      form.append('image', await shrinkImage(file));
      const res = await fetch(`${API_BASE_URL}/admin/upload-image`, { method: 'POST', headers: { Authorization: `Bearer ${authToken()}` }, body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.imageUrl) throw new Error(json.message || 'Upload failed');
      update(i, { image: json.imageUrl });
    } catch (err) {
      setMsg({ ok: false, text: `Image upload failed: ${err.message}` });
    } finally {
      setUploading(null);
    }
  };

  // Videos go straight from the browser to Cloudinary; the story's link becomes the video URL
  const uploadVideo = async (i, file) => {
    if (!file) return;
    setUploading(i);
    setMsg(null);
    try {
      const url = await uploadVideoToCloudinary(file, (pct) => setMsg({ ok: true, text: `Uploading video… ${pct}%` }));
      update(i, { link: url });
      setMsg({ ok: true, text: 'Video uploaded. Press “Save stories” to publish it.' });
    } catch (err) {
      setMsg({ ok: false, text: `Video upload failed: ${err.message}` });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    const clean = stories
      .map(s => ({ image: s.image.trim(), title: s.title.trim(), caption: s.caption.trim(), link: s.link.trim() }))
      .filter(s => s.image || s.link);
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ sacred_stories: clean }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || `Save failed (${res.status})`);
      setStories(clean);
      setMsg({ ok: true, text: clean.length ? `Saved ${clean.length} stor${clean.length === 1 ? 'y' : 'ies'}. They are live on the home page.` : 'Saved. The stories section is hidden until you add one.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (stories === null) return <Card><EmptyState title="Loading stories..." text="" /></Card>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Poppins", sans-serif' }}>
      <div style={{ fontSize: '0.85rem', color: colors.muted, lineHeight: 1.6 }}>
        Shown on the home page under <b style={{ color: colors.text }}>"Stories of Faith & Sacred Rituals"</b>. Add a photo, upload a video (stored in Cloudinary), or paste a YouTube / Instagram link.
        A YouTube link without a photo uses the video's thumbnail. The section stays hidden until at least one story is saved.
      </div>

      {stories.length === 0 && (
        <Card><EmptyState title="No stories yet" text="Press “Add story” to create the first one." /></Card>
      )}

      {stories.map((s, i) => (
        <Card key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'start' }}>
          <div>
            <label style={labelStyle}>Photo</label>
            <div style={{ position: 'relative', aspectRatio: '4 / 5', maxWidth: 220, borderRadius: 12, overflow: 'hidden', background: colors.cream, border: `1px dashed ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.image
                ? <img src={getSafeImageUrl(s.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : isCloudinaryVideo(s.link)
                  ? <img src={cloudinaryVideoThumb(s.link, 440)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <ImageIcon size={32} color={colors.border} />}
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', fontWeight: 700, color: colors.wine, cursor: 'pointer' }}>
              <UploadCloud size={15} /> {uploading === i ? 'Uploading…' : s.image ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading !== null} onChange={e => upload(i, e.target.files?.[0])} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.8rem', fontWeight: 700, color: colors.wine, cursor: 'pointer' }}>
              <Film size={15} /> {isCloudinaryVideo(s.link) ? 'Replace video' : 'Upload video'}
              <input type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} disabled={uploading !== null} onChange={e => uploadVideo(i, e.target.files?.[0])} />
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={s.title} onChange={e => update(i, { title: e.target.value })} placeholder="e.g. Karthika Deepam at the temple" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Caption</label>
              <textarea rows={3} value={s.caption} onChange={e => update(i, { caption: e.target.value })} placeholder="A short line about this moment" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Video / post link (optional)</label>
              <input value={s.link} onChange={e => update(i, { link: e.target.value })} placeholder="https://www.youtube.com/watch?v=… or Instagram reel link" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <Button size="sm" variant="outline" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /> Up</Button>
              <Button size="sm" variant="outline" disabled={i === stories.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /> Down</Button>
              <Button size="sm" variant="danger" onClick={() => setStories(list => list.filter((_, idx) => idx !== i))}><Trash2 size={13} /> Remove</Button>
            </div>
          </div>
        </Card>
      ))}

      {msg && <div style={{ fontSize: '0.85rem', fontWeight: 600, color: msg.ok ? colors.green : colors.red }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button variant="outline" onClick={() => setStories(list => [...list, blank()])}><Plus size={15} /> Add story</Button>
        <Button loading={saving} onClick={save}>{!saving && <Save size={15} />} Save stories</Button>
      </div>
    </div>
  );
}
