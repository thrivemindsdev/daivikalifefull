// PIN code -> { state, district, city } using India Post's public API (api.postalpincode.in).
// Names are matched to the state/district lists the checkout uses; anything that doesn't match is left empty.
import { INDIAN_STATES, findDistrict } from '@/lib/india-districts';

const LOOKUP_TIMEOUT_MS = 6000;
const CACHE_LIMIT = 2000;
const cache = new Map();

const normalize = (s) => (s || '').toString().toLowerCase().replace(/&/g, 'and').replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

// India Post still uses some older district names
const DISTRICT_ALIASES = {
  gurgaon: 'Gurugram',
  bangalore: 'Bengaluru Urban',
  bangalorerural: 'Bengaluru Rural',
  mysore: 'Mysuru',
  belgaum: 'Belagavi',
  bellary: 'Ballari',
  bijapur: 'Vijayapura',
  gulbarga: 'Kalaburagi',
  shimoga: 'Shivamogga',
  tumkur: 'Tumakuru',
  chikmagalur: 'Chikkamagaluru',
  raigarh: 'Raigad',
  allahabad: 'Prayagraj',
  faizabad: 'Ayodhya',
  trivandrum: 'Thiruvananthapuram',
  calicut: 'Kozhikode',
  cochin: 'Ernakulam',
};

function matchState(name) {
  const key = normalize(name);
  if (!key) return '';
  return INDIAN_STATES.find(s => normalize(s) === key)
    || INDIAN_STATES.find(s => normalize(s).includes(key))
    || '';
}

function matchDistrict(state, name) {
  const key = normalize(name);
  if (!key) return '';
  const hit = findDistrict(state, name.replace(/\([^)]*\)/g, '').trim())
    || (DISTRICT_ALIASES[key] && findDistrict(state, DISTRICT_ALIASES[key]));
  return hit && hit.state === state ? hit.name : '';
}

// Most common value first
const byFrequency = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]).map(([v]) => v);
};

export async function lookupPincode(pin) {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  if (cache.has(pin)) return cache.get(pin);

  const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS), cache: 'no-store' });
  if (!res.ok) throw new Error(`PIN lookup failed (${res.status})`);
  const json = await res.json();
  const offices = (Array.isArray(json) && json[0]?.Status === 'Success' && json[0].PostOffice) || [];

  let result = null;
  if (offices.length) {
    const state = matchState(byFrequency(offices.map(o => o.State))[0]);
    let district = '';
    for (const d of byFrequency(offices.map(o => o.District))) {
      district = state ? matchDistrict(state, d) : '';
      if (district) break;
    }
    const office = offices.find(o => o.BranchType === 'Head Post Office')
      || offices.find(o => o.BranchType === 'Sub Post Office')
      || offices[0];
    const city = (office?.Name || '').trim() || district;
    result = { state, district, city };
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(pin, result);
  return result;
}
