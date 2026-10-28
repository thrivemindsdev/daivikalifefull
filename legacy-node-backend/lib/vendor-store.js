// Vendor + vendor stock storage. Uses PostgreSQL (Prisma) when connected and
// falls back to JSON files in /data, matching the rest of the app's offline mode.
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isDatabaseConnected, memoryUsers } from '@/lib/db';
import User from '@/models/User';
import { normalizeIndianMobile } from '@/lib/sms-otp';

const vendorsFile = path.join(process.cwd(), 'data', 'custom_vendors.json');
const vendorStockFile = path.join(process.cwd(), 'data', 'custom_vendor_stock.json');

const readJson = (file) => {
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read', file, e.message);
  }
  return [];
};

const writeJson = (file, data) => {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write', file, e.message);
  }
};

// Kept on `global` so every route bundle shares the same offline data
const g = global;
if (!g.__memoryVendors) {
  g.__memoryVendors = readJson(vendorsFile);
  g.__memoryVendorStock = readJson(vendorStockFile);
}
const memoryVendors = g.__memoryVendors;
const memoryVendorStock = g.__memoryVendorStock;

// Offline mode: mirror vendor accounts into memoryUsers so they can log in.
// Each route bundle can hold its own memoryUsers copy, so callers run this before auth lookups.
export function syncVendorUsers() {
  if (isDatabaseConnected) return;
  const ids = new Set();
  for (const v of memoryVendors) {
    if (!v.passwordHash) continue;
    ids.add(v.userId);
    const fields = { name: v.name, email: v.email || undefined, phone: v.phone || undefined, password: v.passwordHash, role: 'vendor' };
    const u = memoryUsers.find(x => x._id === v.userId);
    if (u) Object.assign(u, fields);
    else memoryUsers.push({ _id: v.userId, ...fields, avatar: '', createdAt: v.createdAt });
  }
  for (let i = memoryUsers.length - 1; i >= 0; i--) {
    if (memoryUsers[i].role === 'vendor' && !ids.has(memoryUsers[i]._id)) memoryUsers.splice(i, 1);
  }
}
syncVendorUsers();
const saveVendors = () => writeJson(vendorsFile, memoryVendors);
const saveVendorStock = () => writeJson(vendorStockFile, memoryVendorStock);

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const publicVendor = (v) => {
  if (!v) return null;
  const { passwordHash, ...rest } = v;
  return { ...rest, _id: rest.id };
};

export const stockKey = (variant, color) => `${(variant || '').toLowerCase().trim()}|${(color || '').toLowerCase().trim()}`;

// ── Vendors ────────────────────────────────────────────────

export async function listVendors() {
  if (isDatabaseConnected) {
    try {
      const rows = await prisma.vendor.findMany({ orderBy: { createdAt: 'desc' } });
      return rows.map(publicVendor);
    } catch (err) {
      console.warn('Prisma vendor.findMany fallback to in-memory:', err.message);
    }
  }
  return [...memoryVendors].reverse().map(publicVendor);
}

export async function getVendor(id) {
  if (!id) return null;
  if (isDatabaseConnected) {
    try {
      return publicVendor(await prisma.vendor.findUnique({ where: { id } }));
    } catch (err) {
      console.warn('Prisma vendor.findUnique fallback to in-memory:', err.message);
    }
  }
  return publicVendor(memoryVendors.find(v => v.id === id));
}

export async function getVendorByUserId(userId) {
  if (!userId) return null;
  const uid = userId.toString();
  if (isDatabaseConnected) {
    try {
      return publicVendor(await prisma.vendor.findUnique({ where: { userId: uid } }));
    } catch (err) {
      console.warn('Prisma vendor.findUnique by userId fallback to in-memory:', err.message);
    }
  }
  return publicVendor(memoryVendors.find(v => v.userId === uid));
}

const findLoginConflict = async (email, phone, ignoreUserId) => {
  // Mobile numbers can be stored as 9876543210, 919876543210 or +919876543210
  const mobile = normalizeIndianMobile(phone);
  const phones = mobile ? [mobile, `91${mobile}`, `+91${mobile}`] : (phone ? [phone] : []);
  if (isDatabaseConnected) {
    const or = [];
    if (email) or.push({ email });
    for (const p of phones) or.push({ phone: p });
    if (!or.length) return null;
    const hit = await prisma.user.findFirst({ where: { OR: or } });
    return hit && hit.id !== ignoreUserId ? hit : null;
  }
  return memoryUsers.find(u => u._id !== ignoreUserId && ((email && u.email?.toLowerCase() === email) || (phone && (u.phone === phone || (mobile && normalizeIndianMobile(u.phone) === mobile))))) || null;
};

// Vendors log in with their mobile number, stored as the 10-digit number
const cleanVendorInput = (data = {}) => ({
  name: (data.name || '').trim(),
  businessName: (data.businessName || '').trim(),
  email: (data.email || '').trim().toLowerCase(),
  phone: normalizeIndianMobile(data.phone) || (data.phone || '').replace(/[^\d+]/g, ''),
  state: (data.state || '').trim(),
  district: (data.district || '').trim(),
  address: (data.address || '').trim(),
  pincode: (data.pincode || '').replace(/\D/g, ''),
  notes: (data.notes || '').trim(),
});

export async function createVendor(data, password) {
  const v = cleanVendorInput(data);
  if (!v.name || !v.state || !v.district) throw new Error('Name, state and district are required');
  if (!normalizeIndianMobile(v.phone)) throw new Error('A valid 10-digit mobile number is required — the vendor logs in with it');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
  if (await findLoginConflict(v.email, v.phone)) throw new Error('An account with this email or phone already exists');

  if (isDatabaseConnected) {
    const user = await User.create({ name: v.name, email: v.email || null, phone: v.phone || null, password, role: 'vendor' });
    const userId = (user._id || user.id).toString();
    const vendor = await prisma.vendor.create({ data: { ...v, userId, isActive: data.isActive !== false } });
    return publicVendor(vendor);
  }

  const userId = newId('mem_vendor');
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const vendor = { id: newId('vnd'), userId, ...v, isActive: data.isActive !== false, passwordHash, createdAt: now, updatedAt: now };
  memoryVendors.push(vendor);
  syncVendorUsers();
  saveVendors();
  return publicVendor(vendor);
}

export async function updateVendor(id, data, password) {
  const existing = isDatabaseConnected ? await prisma.vendor.findUnique({ where: { id } }) : memoryVendors.find(v => v.id === id);
  if (!existing) throw new Error('Vendor not found');

  const patch = {};
  const clean = cleanVendorInput({ ...existing, ...data });
  for (const k of Object.keys(clean)) if (data[k] !== undefined) patch[k] = clean[k];
  if (data.isActive !== undefined) patch.isActive = !!data.isActive;
  if ((patch.name !== undefined && !patch.name) || (patch.state !== undefined && !patch.state) || (patch.district !== undefined && !patch.district)) {
    throw new Error('Name, state and district cannot be empty');
  }
  if (password !== undefined && password !== '' && password.length < 6) throw new Error('Password must be at least 6 characters');

  const email = patch.email !== undefined ? patch.email : existing.email;
  const phone = patch.phone !== undefined ? patch.phone : existing.phone;
  if (!email && !phone) throw new Error('Email or phone is required for the vendor login');
  if (patch.phone && !normalizeIndianMobile(patch.phone)) throw new Error('Please enter a valid 10-digit mobile number for the vendor login');
  if (await findLoginConflict(email, phone, existing.userId)) throw new Error('An account with this email or phone already exists');

  const userPatch = { name: patch.name ?? existing.name, email: email || null, phone: phone || null };

  if (isDatabaseConnected) {
    if (password) userPatch.password = password;
    await User.findByIdAndUpdate(existing.userId, userPatch);
    return publicVendor(await prisma.vendor.update({ where: { id }, data: patch }));
  }

  Object.assign(existing, patch, { updatedAt: new Date().toISOString() });
  if (password) existing.passwordHash = bcrypt.hashSync(password, 10);
  syncVendorUsers();
  saveVendors();
  return publicVendor(existing);
}

export async function deleteVendor(id) {
  if (isDatabaseConnected) {
    const v = await prisma.vendor.findUnique({ where: { id } });
    if (!v) throw new Error('Vendor not found');
    await prisma.vendorStock.deleteMany({ where: { vendorId: id } });
    await prisma.vendor.delete({ where: { id } });
    await prisma.user.delete({ where: { id: v.userId } }).catch(() => null);
    return true;
  }
  const idx = memoryVendors.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  memoryVendors.splice(idx, 1);
  syncVendorUsers();
  for (let i = memoryVendorStock.length - 1; i >= 0; i--) if (memoryVendorStock[i].vendorId === id) memoryVendorStock.splice(i, 1);
  saveVendors();
  saveVendorStock();
  return true;
}

// ── Vendor stock ───────────────────────────────────────────

export async function listVendorStock({ vendorId, productId } = {}) {
  if (isDatabaseConnected) {
    try {
      const where = {};
      if (vendorId) where.vendorId = vendorId;
      if (productId) where.productId = productId;
      return await prisma.vendorStock.findMany({ where });
    } catch (err) {
      console.warn('Prisma vendorStock.findMany fallback to in-memory:', err.message);
    }
  }
  return memoryVendorStock.filter(r => (!vendorId || r.vendorId === vendorId) && (!productId || r.productId === productId));
}

// Upsert one stock row. mode 'add' adds to the current stock, otherwise sets it.
export async function setVendorStock(vendorId, productId, variant, color, { stock, mode, isActive } = {}) {
  const v = variant || '';
  const c = color || '';
  if (isDatabaseConnected) {
    const where = { vendorId_productId_variant_color: { vendorId, productId, variant: v, color: c } };
    const existing = await prisma.vendorStock.findUnique({ where });
    const data = {};
    if (stock !== undefined) {
      const base = mode === 'add' ? (existing?.stock || 0) : 0;
      data.stock = Math.max(0, base + (parseInt(stock, 10) || 0));
    }
    if (isActive !== undefined) data.isActive = !!isActive;
    if (existing) return prisma.vendorStock.update({ where, data });
    return prisma.vendorStock.create({ data: { vendorId, productId, variant: v, color: c, stock: 0, isActive: true, ...data } });
  }

  let row = memoryVendorStock.find(r => r.vendorId === vendorId && r.productId === productId && r.variant === v && r.color === c);
  if (!row) {
    row = { id: newId('vst'), vendorId, productId, variant: v, color: c, stock: 0, isActive: true, createdAt: new Date().toISOString() };
    memoryVendorStock.push(row);
  }
  if (stock !== undefined) {
    const base = mode === 'add' ? (row.stock || 0) : 0;
    row.stock = Math.max(0, base + (parseInt(stock, 10) || 0));
  }
  if (isActive !== undefined) row.isActive = !!isActive;
  row.updatedAt = new Date().toISOString();
  saveVendorStock();
  return row;
}

export async function removeVendorProduct(vendorId, productId) {
  if (isDatabaseConnected) {
    await prisma.vendorStock.deleteMany({ where: { vendorId, productId } });
    return true;
  }
  for (let i = memoryVendorStock.length - 1; i >= 0; i--) {
    const r = memoryVendorStock[i];
    if (r.vendorId === vendorId && r.productId === productId) memoryVendorStock.splice(i, 1);
  }
  saveVendorStock();
  return true;
}

// Applies a stock change for an order's items (sign -1 = take, +1 = give back).
// Items are { productId, size, color, qty }.
export async function adjustVendorStockForItems(vendorId, items, sign) {
  const rows = await listVendorStock({ vendorId });
  for (const item of items) {
    const pId = (item.productId || item._id || '').toString();
    const qty = parseInt(item.qty || item.quantity || 1, 10) || 1;
    const productRows = rows.filter(r => r.productId === pId);
    const row = productRows.find(r => stockKey(r.variant, r.color) === stockKey(item.size, item.color)) || (productRows.length === 1 ? productRows[0] : null);
    if (!row) continue;
    await setVendorStock(vendorId, pId, row.variant, row.color, { stock: sign * qty, mode: 'add' });
  }
}

// { productId: { 'variant|color': totalStock } } across active vendors, for storefront availability
export async function getVendorStockTotals() {
  const [vendors, rows] = await Promise.all([listVendors(), listVendorStock()]);
  const active = new Set(vendors.filter(v => v.isActive).map(v => v.id));
  const totals = {};
  for (const r of rows) {
    if (!r.isActive || !active.has(r.vendorId) || !(r.stock > 0)) continue;
    const t = (totals[r.productId] = totals[r.productId] || {});
    const k = stockKey(r.variant, r.color);
    t[k] = (t[k] || 0) + r.stock;
  }
  return totals;
}

// Returns a copy of the product with vendor stock added to each inventory entry.
// `mainStock` keeps the store's own stock for reference.
export function withVendorStock(product, totals) {
  const t = totals?.[(product._id || product.id || '').toString()];
  if (!t || !Array.isArray(product.inventory)) return product;
  const used = new Set();
  const inventory = product.inventory.map(inv => {
    const k = stockKey(inv.variant, inv.color);
    used.add(k);
    return { ...inv, mainStock: inv.stock || 0, stock: (inv.stock || 0) + (t[k] || 0) };
  });
  // Vendor stock that doesn't match a variant of the store's inventory (e.g. single-variant product)
  const extra = Object.entries(t).filter(([k]) => !used.has(k)).reduce((s, [, n]) => s + n, 0);
  if (extra > 0 && inventory.length === 1) inventory[0].stock += extra;
  return { ...product, inventory };
}

// ── Vendor system settings ─────────────────────────────────
// Orders are only auto-routed once the vendor system is switched on, so older orders stay with the main store.

const SETTINGS_KEY = 'vendor_system';

export async function getVendorSettings() {
  const defaults = { enabled: false, enabledAt: null, maxDistanceKm: 0 };
  if (isDatabaseConnected) {
    const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...defaults, ...(row?.value || {}) };
  }
  const { memorySettings } = await import('@/lib/db');
  return { ...defaults, ...(memorySettings.find(s => s.key === SETTINGS_KEY)?.value || {}) };
}

export async function saveVendorSettings(patch) {
  const current = await getVendorSettings();
  const value = { ...current, ...patch };
  if (patch.enabled && !current.enabledAt) value.enabledAt = new Date().toISOString();
  if (isDatabaseConnected) {
    await prisma.setting.upsert({ where: { key: SETTINGS_KEY }, update: { value }, create: { key: SETTINGS_KEY, value } });
  } else {
    const { memorySettings, saveMemorySettings } = await import('@/lib/db');
    const idx = memorySettings.findIndex(s => s.key === SETTINGS_KEY);
    if (idx === -1) memorySettings.push({ key: SETTINGS_KEY, value });
    else memorySettings[idx].value = value;
    saveMemorySettings();
  }
  return value;
}

// ── Reports submitted by vendors to the admin ──────────────

const reportsFile = path.join(process.cwd(), 'data', 'custom_vendor_reports.json');
if (!g.__memoryVendorReports) g.__memoryVendorReports = readJson(reportsFile);
const memoryVendorReports = g.__memoryVendorReports;
const saveReports = () => writeJson(reportsFile, memoryVendorReports);

// Listing leaves out the full report data to keep responses small
const reportListItem = ({ data, ...r }) => ({ ...r, _id: r.id });

export async function createVendorReport({ vendorId, vendorName, title, from, to, groupBy, note, data, summary }) {
  const record = {
    vendorId, vendorName: vendorName || '', title: title || '', groupBy: groupBy || 'day', note: note || '',
    rangeFrom: new Date(from), rangeTo: new Date(to), summary: summary || data.summary || {}, data, status: 'submitted', adminNote: '',
  };
  if (isDatabaseConnected) return reportListItem(await prisma.vendorReport.create({ data: record }));
  const now = new Date().toISOString();
  const row = { id: newId('vrp'), ...record, rangeFrom: record.rangeFrom.toISOString(), rangeTo: record.rangeTo.toISOString(), reviewedAt: null, createdAt: now, updatedAt: now };
  memoryVendorReports.push(row);
  saveReports();
  return reportListItem(row);
}

export async function listVendorReports({ vendorId, status } = {}) {
  if (isDatabaseConnected) {
    const where = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    const rows = await prisma.vendorReport.findMany({ where, orderBy: { createdAt: 'desc' }, omit: { data: true } });
    return rows.map(r => ({ ...r, _id: r.id }));
  }
  return memoryVendorReports
    .filter(r => (!vendorId || r.vendorId === vendorId) && (!status || r.status === status))
    .slice().reverse().map(reportListItem);
}

export async function getVendorReport(id) {
  if (isDatabaseConnected) return prisma.vendorReport.findUnique({ where: { id } });
  return memoryVendorReports.find(r => r.id === id) || null;
}

export async function updateVendorReport(id, { status, adminNote }) {
  const patch = {};
  if (status) {
    patch.status = status;
    patch.reviewedAt = status === 'reviewed' ? new Date() : null;
  }
  if (adminNote !== undefined) patch.adminNote = adminNote;
  if (isDatabaseConnected) return reportListItem(await prisma.vendorReport.update({ where: { id }, data: patch }));
  const row = memoryVendorReports.find(r => r.id === id);
  if (!row) throw new Error('Report not found');
  Object.assign(row, patch, { updatedAt: new Date().toISOString() });
  if (patch.reviewedAt) row.reviewedAt = patch.reviewedAt.toISOString();
  saveReports();
  return reportListItem(row);
}
