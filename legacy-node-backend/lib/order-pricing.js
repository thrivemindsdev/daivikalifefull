// Server-side order pricing. Mirrors the checkout page's rules so the amount a customer pays
// is always computed from database prices and admin settings, never from values sent by the browser.
import Product from '@/models/Product';
import ProductGroup from '@/models/ProductGroup';
import Setting from '@/models/Setting';
import { isDatabaseConnected, memoryProducts, memoryProductGroups, memorySettings } from '@/lib/db';
import { getVendorStockTotals, withVendorStock } from '@/lib/vendor-store';
import { listAllOrders, isConfirmedOrder } from '@/lib/vendor-routing';

// Defaults used by the checkout page when the admin has not saved these settings
export const DEFAULT_COUPONS = [
  { code: 'Daivika10', discountType: 'percentage', discountValue: 10, minPurchase: 500, usageLimit: 1 },
  { code: 'KERALA500', discountType: 'fixed', discountValue: 500, minPurchase: 2000, usageLimit: 2 },
  { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20, minPurchase: 1000, usageLimit: 3 },
];
export const DEFAULT_SHIPPING_ZONES = [
  { id: 'zone_1', name: 'South India Logistics', rate: 75, states: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Lakshadweep'], rules: [] },
  { id: 'zone_2', name: 'North India Express', rate: 150, states: ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Himachal Pradesh', 'Jammu and Kashmir', 'Uttarakhand', 'Ladakh', 'Chandigarh'], rules: [] },
  { id: 'zone_3', name: 'Middle India Cargo', rate: 120, states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Goa', 'Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Manipur', 'Nagaland', 'Tripura', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu'], rules: [] },
];
const DEFAULT_FREE_SHIPPING = 600;
const DEFAULT_COD_PERCENT = 30;
const NO_ZONE_RATE = 100;
const STANDARD_COUPON_CATEGORIES = ['welcome', 'referral', 'festival', 'other'];
const MAX_QTY_PER_LINE = 100;

export class PricingError extends Error {
  constructor(message, code = 'invalid_order', productId = '') {
    super(message);
    this.code = code;
    this.productId = productId;
  }
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const lc = (v) => String(v || '').trim().toLowerCase();
const stockKey = (variant, color) => `${lc(variant)}|${lc(color)}`;
export const phoneKey = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

export async function loadStoreSettings() {
  const map = {};
  try {
    const rows = isDatabaseConnected ? await Setting.find({}) : memorySettings;
    for (const r of rows) map[r.key] = r.value;
  } catch (err) {
    console.warn('[order-pricing] settings lookup failed:', err.message);
  }
  return {
    coupons: Array.isArray(map.coupons) ? map.coupons : DEFAULT_COUPONS,
    couponsEnabled: map.coupons_enabled !== undefined ? Boolean(map.coupons_enabled) : true,
    shippingZones: Array.isArray(map.shipping_zones) ? map.shipping_zones : DEFAULT_SHIPPING_ZONES,
    freeShippingThreshold: map.free_shipping_threshold !== undefined ? num(map.free_shipping_threshold) : DEFAULT_FREE_SHIPPING,
    codPercent: map.cod_settings?.advancePercent !== undefined ? num(map.cod_settings.advancePercent) : DEFAULT_COD_PERCENT,
    codEnabled: map.cod_settings?.enabled !== false,
    freeGift: map.free_gift_settings || null,
  };
}

async function loadProducts(ids) {
  const unique = [...new Set(ids)];
  let products;
  if (isDatabaseConnected) {
    products = await Promise.all(unique.map(id => Product.findById(id).catch(() => null)));
  } else {
    products = unique.map(id => memoryProducts.find(p => String(p._id || p.id) === id) || null);
  }
  const totals = await getVendorStockTotals().catch(() => ({}));
  const map = new Map();
  products.forEach((p, i) => { if (p) map.set(unique[i], withVendorStock(p.toObject ? p.toObject() : p, totals)); });
  return map;
}

async function loadGroupMap() {
  const groups = isDatabaseConnected ? await ProductGroup.find({}).catch(() => []) : memoryProductGroups;
  const map = {};
  for (const g of groups || []) {
    const members = g.products || g.productIds || [];
    for (const p of Array.isArray(members) ? members : []) {
      const id = typeof p === 'object' ? (p._id || p.id) : p;
      if (id) map[String(id)] = String(g._id || g.id);
    }
  }
  return map;
}

function findShippingRule(rules, collection, category) {
  const c = lc(collection), k = lc(category);
  return rules.find(r => lc(r.collection) === c && lc(r.category) === k)
    || rules.find(r => lc(r.collection) === 'all' && lc(r.category) === k)
    || rules.find(r => lc(r.collection) === c && lc(r.category) === 'all')
    || rules.find(r => lc(r.collection) === 'all' && lc(r.category) === 'all');
}

async function couponUsageCount(code, phone, excludeOrderId) {
  const p = phoneKey(phone);
  if (!p) return 0;
  const orders = await listAllOrders();
  return orders.filter(o =>
    isConfirmedOrder(o) &&
    String(o._id || o.id) !== excludeOrderId &&
    lc(o.couponCode) === lc(code) &&
    phoneKey(o.phone) === p
  ).length;
}

/**
 * Prices an order from database products and admin settings.
 *  items:  [{ productId, qty, size, color, isFreeGift }]
 *  state:  delivery state (for shipping)
 *  couponCode, phone: coupon is checked against its usage limit per phone number
 *  isCod:  cash on delivery with an online advance
 * Throws PricingError for anything the customer must fix (unknown product, out of stock, bad coupon).
 */
export async function priceOrder({ items, state, couponCode, phone, isCod = false, orderId = '' }) {
  if (!Array.isArray(items) || items.length === 0) throw new PricingError('Your cart is empty');
  if (!String(state || '').trim()) throw new PricingError('Delivery state is required');

  const settings = await loadStoreSettings();
  const paid = items.filter(it => !it.isFreeGift);
  if (!paid.length) throw new PricingError('Your cart is empty');

  for (const it of items) {
    const q = Number(it.qty ?? it.quantity);
    if (!Number.isInteger(q) || q < 1 || q > MAX_QTY_PER_LINE) throw new PricingError(`Invalid quantity for ${it.name || 'an item'}`);
    if (!it.productId) throw new PricingError('An item in your cart is missing its product');
  }

  const products = await loadProducts(items.map(it => String(it.productId)));
  const groupOf = await loadGroupMap();

  // Quantities per product (or product group) and variant decide bulk pricing
  const variantOf = (product, size) => (Array.isArray(product.variants) ? product.variants : []).find(v => lc(v.name) === lc(size));
  const bulkKey = (pid, size) => `${groupOf[pid] ? `group_${groupOf[pid]}` : `prod_${pid}`}_${lc(size)}`;
  const bulkQty = {};
  for (const it of paid) {
    const key = bulkKey(String(it.productId), it.size);
    bulkQty[key] = (bulkQty[key] || 0) + Number(it.qty ?? it.quantity);
  }

  // Stock needed per product variant
  const need = {};
  const lines = [];
  let subtotal = 0;
  for (const it of paid) {
    const pid = String(it.productId);
    const product = products.get(pid);
    if (!product) throw new PricingError(`${it.name || 'A product'} is no longer available`, 'product_unavailable', pid);
    const qty = Number(it.qty ?? it.quantity);
    const variant = it.size ? variantOf(product, it.size) : null;
    if (it.size && Array.isArray(product.variants) && product.variants.length && !variant) {
      throw new PricingError(`The option "${it.size}" of ${product.name} is no longer available`, 'product_unavailable', pid);
    }
    const base = variant && num(variant.price) > 0 ? num(variant.price) : num(product.price);
    const src = variant || product;
    const minQ = num(src.bulkMinQty), bulk = num(src.bulkPrice);
    const price = minQ > 0 && bulk > 0 && bulkQty[bulkKey(pid, it.size)] >= minQ ? bulk : base;
    if (!(price > 0)) throw new PricingError(`${product.name} has no valid price`, 'product_unavailable');

    const k = `${pid}::${stockKey(it.size, it.color)}`;
    need[k] = { product, size: it.size, color: it.color, qty: (need[k]?.qty || 0) + qty };

    subtotal += price * qty;
    lines.push({
      productId: pid,
      name: product.name,
      qty,
      price,
      image: it.image || product.image || '',
      size: it.size || '',
      color: it.color || '',
      isFreeGift: false,
      category: product.category || '',
      gender: product.gender || '',
    });
  }

  for (const { product, size, color, qty } of Object.values(need)) {
    const inv = Array.isArray(product.inventory) ? product.inventory : [];
    const row = inv.find(i => stockKey(i.variant, i.color) === stockKey(size, color));
    if (row && num(row.stock) < qty) {
      throw new PricingError(num(row.stock) > 0 ? `Only ${num(row.stock)} of ${product.name} left in stock` : `${product.name} is out of stock`, 'out_of_stock');
    }
  }

  // Free gift: only the configured gift product, once, when the cart qualifies
  const giftItem = items.find(it => it.isFreeGift);
  const gift = settings.freeGift;
  if (giftItem && gift?.enabled && String(giftItem.productId) === String(gift.giftProductId)) {
    const eligibleIds = Array.isArray(gift.eligibleProductIds) ? gift.eligibleProductIds.map(String) : [];
    const qualifies = subtotal >= num(gift.minimumSpend) && (!eligibleIds.length || paid.some(it => eligibleIds.includes(String(it.productId))));
    const giftProduct = (await loadProducts([String(gift.giftProductId)])).get(String(gift.giftProductId));
    if (qualifies && giftProduct) {
      lines.push({ productId: String(gift.giftProductId), name: `${giftProduct.name} (Free Gift 🎁)`, qty: 1, price: 0, image: giftItem.image || giftProduct.image || '', size: 'Standard', color: 'Default', isFreeGift: true });
    }
  }

  // Coupon
  let discount = 0;
  let appliedCoupon = '';
  if (couponCode && String(couponCode).trim()) {
    if (!settings.couponsEnabled) throw new PricingError('Coupons are currently disabled', 'coupon_invalid');
    const coupon = settings.coupons.find(c => c.code && lc(c.code) === lc(couponCode));
    if (!coupon) throw new PricingError('Invalid coupon code', 'coupon_invalid');
    if (subtotal < num(coupon.minPurchase)) throw new PricingError(`Minimum purchase of ₹${num(coupon.minPurchase)} required for this coupon`, 'coupon_invalid');
    const cat = lc(coupon.category);
    if (cat && !STANDARD_COUPON_CATEGORIES.includes(cat)) {
      const catTotal = lines.filter(l => !l.isFreeGift && lc(l.category) === cat).reduce((s, l) => s + l.price * l.qty, 0);
      if (catTotal === 0) throw new PricingError(`This coupon is only valid for "${coupon.category}" items`, 'coupon_invalid');
      if (catTotal < num(coupon.minPurchase)) throw new PricingError(`Minimum purchase of ₹${num(coupon.minPurchase)} for "${coupon.category}" items is required`, 'coupon_invalid');
    }
    const limit = num(coupon.usageLimit);
    if (limit > 0) {
      if (!phoneKey(phone)) throw new PricingError('A valid phone number is required to use a coupon', 'coupon_invalid');
      const used = await couponUsageCount(coupon.code, phone, orderId);
      if (used >= limit) throw new PricingError(`This coupon has already been used ${used}/${limit} times with this phone number`, 'coupon_invalid');
    }
    discount = coupon.discountType === 'percentage'
      ? Math.round((subtotal * num(coupon.discountValue)) / 100)
      : Math.min(subtotal, num(coupon.discountValue));
    appliedCoupon = String(coupon.code).toUpperCase();
  }

  // Shipping
  let shippingCharge = 0;
  if (subtotal < settings.freeShippingThreshold) {
    const zone = settings.shippingZones.find(z => (z.states || []).some(s => lc(s) === lc(state)));
    if (!zone) {
      shippingCharge = NO_ZONE_RATE;
    } else {
      shippingCharge = num(zone.rate);
      const rules = zone.rules || [];
      for (const l of lines) {
        if (l.isFreeGift) continue;
        const rule = findShippingRule(rules, l.gender, l.category);
        if (rule) shippingCharge += num(rule.rate) * l.qty;
      }
    }
  }

  const total = Math.max(0, subtotal - discount) + shippingCharge;
  if (isCod && !settings.codEnabled) throw new PricingError('Cash on delivery is not available right now', 'cod_disabled');
  const codPercent = settings.codPercent;
  const advanceAmount = isCod ? Math.round(total * (codPercent / 100)) : total;

  return {
    itemsList: lines.map(({ category, gender, ...l }) => l),
    subtotal,
    discount,
    couponCode: appliedCoupon,
    shippingCharge,
    total,
    isPartialCod: Boolean(isCod),
    codPercent,
    advanceAmount,
    remainingAmount: total - advanceAmount,
  };
}
