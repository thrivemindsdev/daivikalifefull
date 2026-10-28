// Every /api/* request is answered by the Laravel backend (BACKEND_URL). The storefront keeps calling
// /api/... on its own domain, so nothing in the browser code changes and no CORS setup is needed.
export const dynamic = 'force-dynamic';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// Headers that belong to a single connection and must not be forwarded
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

async function proxy(req, { params }) {
  const { path = [] } = await params;
  const incoming = new URL(req.url);
  const target = `${BACKEND_URL}/api/${path.map(encodeURIComponent).join('/')}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  // The backend rate-limits and logs by the customer's address, not the proxy's
  const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));
  // Let the backend's response come back uncompressed so it can be streamed straight through
  headers.delete('accept-encoding');

  // The body is sent with a Content-Length (PHP servers don't all accept chunked request bodies)
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.from(await req.arrayBuffer());
  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (err) {
    console.error(`[api proxy] ${req.method} ${target} failed:`, err.message);
    return Response.json({ success: false, message: 'The store server is not reachable right now. Please try again in a moment.' }, { status: 502 });
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!HOP_BY_HOP.has(k) && k !== 'content-encoding') resHeaders.append(key, value);
  });
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: resHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
