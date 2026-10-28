// Fixed-window rate limiter kept in process memory. Enough for a single server instance;
// behind several instances use a shared store (e.g. Redis) instead.
import { errorResponse } from '@/lib/api-middleware';

const g = globalThis;
if (!g.__rateLimitBuckets) g.__rateLimitBuckets = new Map();
const buckets = g.__rateLimitBuckets;

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || 'unknown').trim();
}

/**
 * Returns an error response when `key` has made more than `limit` calls in `windowMs`, otherwise null.
 *   const limited = rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000); if (limited) return limited;
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 50000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  if (b.count > limit) {
    const res = errorResponse('Too many attempts. Please wait a few minutes and try again.', 429);
    res.headers.set('Retry-After', String(Math.ceil((b.reset - now) / 1000)));
    return res;
  }
  return null;
}
