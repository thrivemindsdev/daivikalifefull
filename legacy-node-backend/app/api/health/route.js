export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initAPI } from '@/lib/api-middleware';
import { isDatabaseConnected } from '@/lib/db';

// GET /api/health — is the app connected to its database?
// "offline" means it is running on the local JSON files only: the site shows offline data and
// anything saved in the admin panel is not stored in the database.
export async function GET() {
  await initAPI();
  const configured = Boolean(process.env.DATABASE_URL);
  const connected = isDatabaseConnected; // live binding from lib/db.js
  return NextResponse.json(
    {
      status: connected ? 'ok' : 'degraded',
      database: connected ? 'connected' : (configured ? 'unreachable' : 'not-configured'),
      time: new Date().toISOString(),
    },
    { status: connected ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
