// Routes customer orders to the nearest vendor that has stock for every item.
// Distance is measured between district centres (lib/india-districts.js). If no
// vendor can fulfil the whole order it stays with the main store (product.inventory).
import Order from '@/models/Order';
import Product from '@/models/Product';
import { isDatabaseConnected, memoryOrders, saveMemoryOrders, memoryProducts, saveMemoryProducts } from '@/lib/db';
import { findDistrict, findState, INDIA_DISTRICTS, distanceKm } from '@/lib/india-districts';
import {
  listVendors, getVendor, listVendorStock, adjustVendorStockForItems,
  getVendorSettings, stockKey,
} from '@/lib/vendor-store';

export const MAIN_STORE = 'Main store';

export const isConfirmedOrder = (o) =>
  o && o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending' && o.status !== 'Cancelled';

const itemProductId = (item) => (item.productId || item._id || '').toString();
const itemQty = (item) => parseInt(item.qty || item.quantity || 1, 10) || 1;

// { lat, lng } for a state + district, falling back to the state's centre
export function locate(state, district) {
  const d = findDistrict(state, district);
  if (d) return d;
  const st = findState(state);
  if (!st) return null;
  const list = INDIA_DISTRICTS[st];
  return {
    state: st,
    name: '',
    lat: list.reduce((s, x) => s + x[1], 0) / list.length,
    lng: list.reduce((s, x) => s + x[2], 0) / list.length,
  };
}

// Active vendors sorted nearest-first from the order's delivery district
export async function rankVendorsForOrder(order, { includeInactive = false } = {}) {
  const addr = order.address || {};
  const from = locate(addr.state, addr.district);
  const vendors = (await listVendors()).filter(v => includeInactive || v.isActive);
  return vendors
    .map(v => {
      const at = locate(v.state, v.district);
      let km = from && at ? distanceKm(from, at) : Infinity;
      // Without a usable customer location, prefer vendors in the same state
      if (!from && findState(v.state) && findState(v.state) === findState(addr.state)) km = 0;
      return { vendor: v, distanceKm: Number.isFinite(km) ? Math.round(km) : null, sortKm: km };
    })
    .sort((a, b) => a.sortKm - b.sortKm);
}

// True when the vendor's stock rows cover every item in the order
export function vendorCanFulfil(rows, items) {
  const need = {};
  for (const item of items) {
    const pId = itemProductId(item);
    const productRows = rows.filter(r => r.productId === pId && r.isActive);
    const row = productRows.find(r => stockKey(r.variant, r.color) === stockKey(item.size, item.color)) || (productRows.length === 1 ? productRows[0] : null);
    if (!row) return false;
    need[row.id] = (need[row.id] || 0) + itemQty(item);
    if (need[row.id] > (row.stock || 0)) return false;
  }
  return items.length > 0;
}

// Main store stock change for an order's items (sign -1 = take, +1 = give back)
export async function adjustMainStock(items, sign) {
  const pick = (inventory, item) =>
    inventory.find(i => (i.variant || '').toLowerCase() === (item.size || '').toLowerCase() && (i.color || '').toLowerCase() === (item.color || '').toLowerCase()) || inventory[0];

  if (isDatabaseConnected) {
    for (const item of items) {
      const product = await Product.findById(itemProductId(item));
      if (!product || !Array.isArray(product.inventory) || !product.inventory.length) continue;
      const inv = pick(product.inventory, item);
      inv.stock = Math.max(0, (inv.stock || 0) + sign * itemQty(item));
      await product.save();
    }
    return;
  }
  for (const item of items) {
    const p = memoryProducts.find(x => x._id === itemProductId(item));
    if (!p || !Array.isArray(p.inventory) || !p.inventory.length) continue;
    const inv = pick(p.inventory, item);
    inv.stock = Math.max(0, (inv.stock || 0) + sign * itemQty(item));
  }
  saveMemoryProducts();
}

// Who currently holds the stock for this order
const stockHolder = (order) => {
  if (order.stockSource === 'vendor' && order.vendorId) return { type: 'vendor', id: order.vendorId };
  if (order.stockSource === 'main' || (order.isStockDecremented && !order.stockSource)) return { type: 'main' };
  return null;
};

export const rejectedVendorIds = (order) =>
  (Array.isArray(order.routingLog) ? order.routingLog : []).filter(e => e.rejectedBy).map(e => e.rejectedBy);

/**
 * Decides where an order goes and moves its stock there. Returns the order fields to save.
 *  target: undefined = nearest vendor with stock, 'main' = main store, or a vendor id
 *  exclude: vendor ids to skip (e.g. vendors that rejected the order)
 */
export async function routeOrder(order, { target, exclude = [], actor = 'system', note = '', rejectedBy } = {}) {
  const items = order.itemsList || [];
  const settings = await getVendorSettings();
  const skip = new Set([...exclude, ...rejectedVendorIds(order), ...(rejectedBy ? [rejectedBy] : [])]);
  let chosen = null;

  if (target && target !== 'main') {
    const vendor = await getVendor(target);
    if (!vendor) throw new Error('Vendor not found');
    const ranked = await rankVendorsForOrder(order, { includeInactive: true });
    chosen = ranked.find(r => r.vendor.id === vendor.id) || { vendor, distanceKm: null };
  } else if (!target) {
    for (const r of await rankVendorsForOrder(order)) {
      if (skip.has(r.vendor.id)) continue;
      if (settings.maxDistanceKm > 0 && (r.distanceKm === null || r.distanceKm > settings.maxDistanceKm)) continue;
      const rows = await listVendorStock({ vendorId: r.vendor.id });
      if (vendorCanFulfil(rows, items)) { chosen = r; break; }
    }
  }

  // Move stock from the current holder to the new one
  const holder = stockHolder(order);
  const sameVendor = holder?.type === 'vendor' && chosen && holder.id === chosen.vendor.id;
  if (!sameVendor) {
    if (holder?.type === 'vendor') await adjustVendorStockForItems(holder.id, items, +1);
    if (holder?.type === 'main' && chosen) await adjustMainStock(items, +1);
    if (chosen) await adjustVendorStockForItems(chosen.vendor.id, items, -1);
    else if (holder?.type !== 'main') await adjustMainStock(items, -1);
  }

  const log = Array.isArray(order.routingLog) ? [...order.routingLog] : [];
  if (rejectedBy) {
    log.push({ at: new Date().toISOString(), actor, rejectedBy, vendorName: order.vendorName || '', note });
  }
  log.push({
    at: new Date().toISOString(),
    actor,
    to: chosen ? (chosen.vendor.businessName || chosen.vendor.name) : MAIN_STORE,
    vendorId: chosen ? chosen.vendor.id : null,
    distanceKm: chosen ? chosen.distanceKm : null,
    note: rejectedBy ? 'Re-routed after rejection' : note,
  });

  return {
    vendorId: chosen ? chosen.vendor.id : null,
    vendorName: chosen ? (chosen.vendor.businessName || chosen.vendor.name) : '',
    vendorStatus: chosen ? 'Assigned' : MAIN_STORE,
    stockSource: chosen ? 'vendor' : 'main',
    isStockDecremented: true,
    routingLog: log,
  };
}

// ── Order persistence (DB or offline JSON) ──────────────────

export async function listAllOrders() {
  if (isDatabaseConnected) return Order.find({}).sort({ createdAt: -1 });
  return [...memoryOrders].reverse();
}

export async function getOrder(id) {
  if (isDatabaseConnected) return Order.findById(id);
  return memoryOrders.find(o => o._id === id) || null;
}

export async function saveOrderPatch(id, patch) {
  if (isDatabaseConnected) return Order.findByIdAndUpdate(id, patch, { new: true });
  const o = memoryOrders.find(x => x._id === id);
  if (!o) return null;
  Object.assign(o, patch, { updatedAt: new Date().toISOString() });
  saveMemoryOrders();
  return o;
}

// Whether a new order should be routed by the vendor system right now
export async function shouldAutoRoute(order) {
  if (!isConfirmedOrder(order) || order.vendorStatus) return false;
  if (order.status && order.status !== 'Processing') return false;
  const settings = await getVendorSettings();
  if (!settings.enabled || !settings.enabledAt) return false;
  const created = new Date(order.createdAt || Date.now()).getTime();
  return created >= new Date(settings.enabledAt).getTime();
}

// Routes confirmed orders that arrived through other paths (payment webhooks etc.)
// and haven't been routed yet. Safe to call repeatedly.
let routingInFlight = null;
export function routeUnassignedOrders() {
  if (routingInFlight) return routingInFlight;
  routingInFlight = (async () => {
    let count = 0;
    try {
      const settings = await getVendorSettings();
      if (!settings.enabled) return 0;
      const candidates = isDatabaseConnected
        ? await Order.find({ status: 'Processing', vendorStatus: '' })
        : memoryOrders.filter(o => o.status === 'Processing' && !o.vendorStatus);
      for (const o of candidates) {
        if (!(await shouldAutoRoute(o))) continue;
        const id = (o._id || o.id).toString();
        await saveOrderPatch(id, await routeOrder(o));
        count++;
      }
    } catch (err) {
      console.error('[vendor-routing] routeUnassignedOrders failed:', err.message);
    } finally {
      routingInFlight = null;
    }
    return count;
  })();
  return routingInFlight;
}
