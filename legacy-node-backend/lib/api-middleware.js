import jwt from 'jsonwebtoken';
import { connectDB, isDatabaseConnected, memoryUsers } from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { syncVendorUsers } from '@/lib/vendor-store';
import { jwtSecret } from '@/lib/security-config';

// Account fields that are safe to send to the browser
export function publicUser(u) {
  if (!u) return null;
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  const { password, pushSubscriptions, ...rest } = obj;
  return rest;
}

export async function initAPI() {
  try {
    await connectDB();
  } catch (err) {
    console.warn("Database connection failed during initAPI:", err.message);
  }
}

export async function getAuthenticatedUser(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split(' ')[1];
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
    if (!decoded?.id) return null;
    syncVendorUsers();

    // Offline accounts (env admin, vendors) live in memory; everyone else is looked up in the database.
    // The role always comes from the stored account, never from the token.
    const memUser = memoryUsers.find(u => u._id === decoded.id || u.id === decoded.id);
    if (memUser) {
      return memUser;
    }

    if (!isDatabaseConnected) {
      return null;
    }

    // DB is connected — try to find user in database
    try {
      const user = await User.findById(decoded.id);
      return user || null;
    } catch (dbErr) {
      // DB lookup failed (e.g. invalid cuid format for memory IDs) — already checked memoryUsers above
      console.warn('DB user lookup failed for id:', decoded.id, dbErr.message);
      return null;
    }
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return null;
  }
}

export function errorResponse(message, status = 500, extra = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export function jsonResponse(data, status = 200, extra = {}) {
  return NextResponse.json({ success: true, data, ...extra }, { status });
}
