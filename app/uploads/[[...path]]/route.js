import path from 'path';
import fs from 'fs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
};

export async function GET(req, { params }) {
  try {
    const segments = (await params).path || [];
    if (!segments || segments.length === 0) {
      return new NextResponse('File path missing', { status: 400 });
    }

    // Only plain file/folder names: no "..", ".", separators or hidden files (prevents reading files outside public/)
    if (segments.some(s => !s || s === '.' || s === '..' || /[\\/\0]/.test(s) || s.startsWith('.'))) {
      return new NextResponse('Invalid path', { status: 400 });
    }
    const ext = path.extname(segments[segments.length - 1]).toLowerCase();
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 400 });
    }

    const publicRoot = path.resolve(process.cwd(), 'public');
    const inside = (p) => p.startsWith(publicRoot + path.sep);
    // Check in public/uploads first, then the public root
    let filePath = path.resolve(publicRoot, 'uploads', ...segments);
    if (!inside(filePath) || !fs.existsSync(filePath)) {
      filePath = path.resolve(publicRoot, ...segments);
    }
    if (!inside(filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return new NextResponse('Image not found', { status: 404 });
    }
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (err) {
    console.error('Error serving upload file:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
