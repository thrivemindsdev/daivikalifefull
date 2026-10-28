// Secrets and the built-in admin account. In production nothing falls back to a value
// that is written in the source code.
const isProd = process.env.NODE_ENV === 'production';

let warnedExampleSecret = false;

export function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && /change_me/i.test(s) && !warnedExampleSecret) {
    warnedExampleSecret = true;
    console.error('[security] JWT_SECRET is the published example value. Replace it with a long random secret (this logs everyone out once).');
  }
  if (s && s.length >= 16) return s;
  if (isProd) throw new Error('JWT_SECRET must be set (at least 16 characters) in production');
  return 'dev-only-insecure-jwt-secret';
}

// The admin account defined by ADMIN_EMAIL / ADMIN_PASSWORD. Development falls back to a local default;
// production only enables it when both variables are set.
export function envAdmin() {
  const email = (process.env.ADMIN_EMAIL || (isProd ? '' : 'admin@daivika.in')).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (isProd ? '' : 'admin@123');
  return {
    configured: Boolean(email && password),
    email,
    password,
    name: process.env.ADMIN_NAME || 'Daivika Administrator',
    phone: (process.env.ADMIN_PHONE || '').trim(),
  };
}
