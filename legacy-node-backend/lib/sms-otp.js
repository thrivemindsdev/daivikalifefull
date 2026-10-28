// SMS OTP via MSG91 using the DLT registered template.
// OTPs are kept (hashed) in process memory, same as the rate limits: fine for a single server instance.
import crypto from 'crypto';

const g = globalThis;
if (!g.__smsOtpStore) g.__smsOtpStore = new Map();
const store = g.__smsOtpStore;

const RESEND_GAP_MS = 30 * 1000;

const expiryMinutes = () => Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES) || 5);
const maxAttempts = () => Math.max(1, Number(process.env.OTP_MAX_ATTEMPTS) || 5);

// Returns the 10-digit Indian mobile number, or null if invalid.
export function normalizeIndianMobile(input) {
  const digits = String(input || '').replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

const hashOtp = (phone, otp) =>
  crypto.createHash('sha256').update(`${phone}:${otp}:${process.env.JWT_SECRET || ''}`).digest('hex');

async function sendViaMsg91(phone, otp) {
  const authkey = (process.env.SMS_API_KEY || '').trim();
  const sender = (process.env.DLT_SENDER_ID || '').trim();
  const templateId = (process.env.DLT_OTP_TEMPLATE_ID || '').trim();
  const templateText = process.env.DLT_OTP_TEMPLATE_TEXT || '';

  if (!authkey || !sender || !templateId || !templateText.includes('{#var#}')) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[sms-otp] SMS not configured. Dev OTP for ${phone}: ${otp}`);
      return { ok: true };
    }
    console.error('[sms-otp] SMS_API_KEY / DLT_SENDER_ID / DLT_OTP_TEMPLATE_ID / DLT_OTP_TEMPLATE_TEXT missing');
    return { ok: false, error: 'OTP service is not available right now. Please login with password.' };
  }

  const params = new URLSearchParams({
    authkey,
    mobiles: `91${phone}`,
    message: templateText.replace('{#var#}', otp),
    sender,
    route: '4',
    country: '91',
    DLT_TE_ID: templateId,
    response: 'json',
  });

  try {
    const res = await fetch(`https://control.msg91.com/api/sendhttp.php?${params}`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });
    const text = (await res.text()).trim();
    let data = null;
    try { data = JSON.parse(text); } catch { /* plain text reply */ }
    const ok = data ? data.type === 'success' : /^[a-f0-9]{20,}$/i.test(text);
    if (!ok) {
      console.error('[sms-otp] MSG91 rejected the SMS:', text.slice(0, 300));
      return { ok: false, error: 'Could not send OTP. Please try again later or login with password.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[sms-otp] MSG91 request failed:', err.message);
    return { ok: false, error: 'Could not send OTP. Please try again later or login with password.' };
  }
}

export async function sendOtp(phone) {
  const now = Date.now();
  const existing = store.get(phone);
  if (existing && now - existing.sentAt < RESEND_GAP_MS) {
    const wait = Math.ceil((RESEND_GAP_MS - (now - existing.sentAt)) / 1000);
    return { ok: false, status: 429, error: `Please wait ${wait} seconds before requesting a new OTP.` };
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const sent = await sendViaMsg91(phone, otp);
  if (!sent.ok) return { ok: false, status: 502, error: sent.error };

  store.set(phone, { hash: hashOtp(phone, otp), expires: now + expiryMinutes() * 60 * 1000, attempts: 0, sentAt: now });
  if (store.size > 20000) {
    for (const [k, v] of store) if (v.expires <= now) store.delete(k);
  }
  return { ok: true, expiresInMinutes: expiryMinutes() };
}

export function verifyOtp(phone, otp) {
  const entry = store.get(phone);
  if (!entry || entry.expires <= Date.now()) {
    store.delete(phone);
    return { ok: false, error: 'OTP expired. Please request a new one.' };
  }
  entry.attempts += 1;
  const given = hashOtp(phone, String(otp || '').trim());
  const match = crypto.timingSafeEqual(Buffer.from(given), Buffer.from(entry.hash));
  if (!match) {
    if (entry.attempts >= maxAttempts()) {
      store.delete(phone);
      return { ok: false, error: 'Too many wrong attempts. Please request a new OTP.' };
    }
    return { ok: false, error: `Incorrect OTP. ${maxAttempts() - entry.attempts} attempt(s) left.` };
  }
  store.delete(phone);
  return { ok: true };
}
