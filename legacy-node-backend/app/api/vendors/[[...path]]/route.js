export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Product from '@/models/Product';
import User from '@/models/User';
import { isDatabaseConnected, memoryProducts, memoryUsers } from '@/lib/db';
import {
  listVendors, getVendor, getVendorByUserId, createVendor, updateVendor, deleteVendor,
  listVendorStock, setVendorStock, removeVendorProduct, getVendorSettings, saveVendorSettings,
} from '@/lib/vendor-store';
import {
  routeOrder, routeUnassignedOrders, listAllOrders, getOrder, saveOrderPatch,
  rankVendorsForOrder, isConfirmedOrder, MAIN_STORE,
} from '@/lib/vendor-routing';

// Routes:
//  Admin   GET|POST /api/vendors, PUT|DELETE /api/vendors/:id
//          GET|PUT /api/vendors/:id/stock, POST /api/vendors/:id/products, DELETE /api/vendors/:id/products/:productId
//          GET /api/vendors/orders, PUT /api/vendors/orders/:orderId/route
//          GET /api/vendors/stock-overview, GET /api/vendors/product-map, GET /api/vendors/preview-route, GET|PUT /api/vendors/settings
//  Vendor  GET /api/vendors/me, GET /api/vendors/me/products, POST|DELETE /api/vendors/me/products[/:productId]
//          PUT /api/vendors/me/stock, GET /api/vendors/me/orders
//          PUT /api/vendors/me/orders/:orderId/status, POST /api/vendors/me/orders/:orderId/reject
//          PUT /api/vendors/me/password

const VENDOR_ORDER_STATUSES = ['Accepted', 'Packed', 'Shipped', 'Delivered'];

const idOf = (doc) => (doc?._id || doc?.id || '').toString();
const plain = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : { ...doc });

// Catalog with the variant/colour combinations a vendor can stock
async function getCatalog() {
  const products = isDatabaseConnected ? await Product.find({}).sort({ createdAt: -1 }) : [...memoryProducts].reverse();
  return products.map(p => {
    const inv = Array.isArray(p.inventory) && p.inventory.length ? p.inventory : [{ variant: '', color: '', stock: 0 }];
    return {
      _id: idOf(p),
      name: p.name,
      code: p.code || '',
      image: p.image,
      category: p.category,
      price: p.price,
      combos: inv.map(i => ({ variant: i.variant || '', color: i.color || '', mainStock: i.stock || 0 })),
    };
  });
}

// Groups stock rows by product and attaches product details
function groupStock(rows, catalog) {
  const byId = new Map(catalog.map(p => [p._id, p]));
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.productId)) {
      const p = byId.get(r.productId);
      groups.set(r.productId, {
        productId: r.productId,
        name: p?.name || '(deleted product)',
        code: p?.code || '',
        image: p?.image || '',
        category: p?.category || '',
        price: p?.price || 0,
        missing: !p,
        rows: [],
      });
    }
    groups.get(r.productId).rows.push({ id: r.id, variant: r.variant, color: r.color, stock: r.stock, isActive: r.isActive, vendorId: r.vendorId });
  }
  return [...groups.values()].map(g => ({
    ...g,
    totalStock: g.rows.reduce((s, r) => s + (r.isActive ? r.stock : 0), 0),
    isActive: g.rows.some(r => r.isActive),
  }));
}

// The vendor's stocked products plus the catalog products they don't carry yet
async function vendorProductsPayload(vendorId) {
  const catalog = await getCatalog();
  const products = groupStock(await listVendorStock({ vendorId }), catalog);
  const mineIds = new Set(products.map(g => g.productId));
  return {
    products,
    catalog: catalog.filter(p => !mineIds.has(p._id)).map(({ combos, ...p }) => ({ ...p, variants: combos.length })),
  };
}

// `initialStock` (admin only) is the starting quantity for each variant/colour the vendor didn't stock yet
async function addProductToVendor(vendorId, productId, initialStock = 0) {
  const catalog = await getCatalog();
  const product = catalog.find(p => p._id === productId);
  if (!product) throw new Error('Product not found');
  const stock = Math.max(0, parseInt(initialStock, 10) || 0);
  const existing = await listVendorStock({ vendorId, productId });
  for (const c of product.combos) {
    if (!existing.some(r => r.variant === c.variant && r.color === c.color)) {
      await setVendorStock(vendorId, productId, c.variant, c.color, { stock });
    }
  }
  return groupStock(await listVendorStock({ vendorId, productId }), catalog)[0];
}

async function applyStockUpdate(vendorId, body) {
  const { productId, variant, color, stock, mode, isActive } = body || {};
  if (!productId) throw new Error('productId is required');
  // Toggle a whole product on/off when no variant is given
  if (isActive !== undefined && variant === undefined && color === undefined) {
    for (const r of await listVendorStock({ vendorId, productId })) {
      await setVendorStock(vendorId, productId, r.variant, r.color, { isActive });
    }
    return true;
  }
  if (stock !== undefined && (isNaN(parseInt(stock, 10)))) throw new Error('Stock must be a number');
  return setVendorStock(vendorId, productId, variant, color, { stock, mode, isActive });
}

function orderSummary(o) {
  const x = plain(o);
  return {
    _id: idOf(o),
    invoiceNumber: x.invoiceNumber,
    user: x.user,
    phone: x.phone,
    email: x.email,
    total: x.total,
    status: x.status,
    paymentStatus: x.paymentStatus,
    paymentMethod: x.paymentMethod,
    address: x.address,
    itemsList: x.itemsList,
    date: x.date,
    time: x.time,
    createdAt: x.createdAt,
    vendorId: x.vendorId || null,
    vendorName: x.vendorName || '',
    vendorStatus: x.vendorStatus || '',
    routingLog: Array.isArray(x.routingLog) ? x.routingLog : [],
  };
}

async function vendorStats(vendorIds) {
  const [rows, orders] = await Promise.all([listVendorStock(), listAllOrders()]);
  const stats = {};
  for (const id of vendorIds) stats[id] = { products: new Set(), units: 0, openOrders: 0, deliveredOrders: 0 };
  for (const r of rows) {
    const s = stats[r.vendorId];
    if (!s) continue;
    s.products.add(r.productId);
    if (r.isActive) s.units += r.stock || 0;
  }
  for (const o of orders) {
    const s = stats[o.vendorId];
    if (!s || !isConfirmedOrder(o)) continue;
    if (o.status === 'Delivered') s.deliveredOrders++;
    else s.openOrders++;
  }
  for (const id of vendorIds) stats[id] = { ...stats[id], products: stats[id].products.size };
  return stats;
}

// ── Vendor (self-service) handlers ─────────────────────────

async function handleVendor(req, method, rest, user) {
  const vendor = await getVendorByUserId(idOf(user));
  if (!vendor) return errorResponse('Vendor profile not found', 404);
  if (!vendor.isActive && !(method === 'GET' && rest.length === 0)) {
    return errorResponse('Your vendor account is disabled. Please contact the admin.', 403);
  }
  const [section, sub, action] = rest;

  if (method === 'GET' && !section) {
    const stats = (await vendorStats([vendor.id]))[vendor.id];
    return jsonResponse({ vendor, stats });
  }

  if (section === 'products') {
    if (method === 'GET') return jsonResponse(await vendorProductsPayload(vendor.id));
    if (method === 'POST') {
      const { productId } = await req.json();
      return jsonResponse(await addProductToVendor(vendor.id, productId), 201);
    }
    if (method === 'DELETE' && sub) {
      await removeVendorProduct(vendor.id, sub);
      return jsonResponse({ removed: sub });
    }
  }

  if (section === 'stock' && method === 'PUT') {
    return jsonResponse(await applyStockUpdate(vendor.id, await req.json()));
  }

  if (section === 'orders') {
    if (method === 'GET' && !sub) {
      await routeUnassignedOrders();
      const orders = (await listAllOrders()).filter(o => o.vendorId === vendor.id && isConfirmedOrder(o));
      return jsonResponse(orders.map(orderSummary));
    }
    const order = sub ? await getOrder(sub) : null;
    if (!order || order.vendorId !== vendor.id) return errorResponse('Order not found', 404);

    if (method === 'PUT' && action === 'status') {
      const { status } = await req.json();
      if (!VENDOR_ORDER_STATUSES.includes(status)) return errorResponse('Invalid status', 400);
      const patch = { vendorStatus: status };
      if (status !== 'Accepted') patch.status = status;
      const log = Array.isArray(order.routingLog) ? [...order.routingLog] : [];
      log.push({ at: new Date().toISOString(), actor: 'vendor', status, vendorName: vendor.businessName || vendor.name });
      patch.routingLog = log;
      return jsonResponse(orderSummary(await saveOrderPatch(sub, patch)));
    }

    if (method === 'POST' && action === 'reject') {
      if (['Shipped', 'Delivered'].includes(order.status)) return errorResponse('Shipped orders cannot be rejected', 400);
      const { reason } = await req.json().catch(() => ({}));
      const patch = await routeOrder(plain(order), { actor: 'vendor', rejectedBy: vendor.id, note: reason || '' });
      patch.status = 'Processing';
      await saveOrderPatch(sub, patch);
      return jsonResponse({ rerouted: true, to: patch.vendorName || MAIN_STORE });
    }
  }

  if (section === 'password' && method === 'PUT') {
    const { currentPassword, newPassword } = await req.json();
    if (!newPassword || newPassword.length < 6) return errorResponse('New password must be at least 6 characters', 400);
    const account = isDatabaseConnected ? await User.findById(idOf(user)) : memoryUsers.find(u => u._id === idOf(user));
    const ok = account && account.password && (await bcrypt.compare(currentPassword || '', account.password));
    if (!ok) return errorResponse('Current password is incorrect', 400);
    await updateVendor(vendor.id, {}, newPassword);
    return jsonResponse({ updated: true });
  }

  return errorResponse('API endpoint not found', 404);
}

// ── Admin handlers ─────────────────────────────────────────

async function handleAdmin(req, method, path) {
  const [first, second, third] = path;

  if (first === 'settings') {
    if (method === 'GET') return jsonResponse(await getVendorSettings());
    if (method === 'PUT') {
      const body = await req.json();
      const patch = {};
      if (body.enabled !== undefined) patch.enabled = !!body.enabled;
      if (body.maxDistanceKm !== undefined) patch.maxDistanceKm = Math.max(0, parseInt(body.maxDistanceKm, 10) || 0);
      return jsonResponse(await saveVendorSettings(patch));
    }
  }

  if (first === 'preview-route' && method === 'GET') {
    const url = new URL(req.url);
    const fakeOrder = { address: { state: url.searchParams.get('state') || '', district: url.searchParams.get('district') || '' } };
    const ranked = await rankVendorsForOrder(fakeOrder);
    return jsonResponse(ranked.map(r => ({ vendorId: r.vendor.id, name: r.vendor.businessName || r.vendor.name, state: r.vendor.state, district: r.vendor.district, distanceKm: r.distanceKm })));
  }

  // { productId: [vendorId, ...] } for every product a vendor carries (active or paused)
  if (first === 'product-map' && method === 'GET') {
    const map = {};
    for (const r of await listVendorStock()) {
      if (!map[r.productId]) map[r.productId] = [];
      if (!map[r.productId].includes(r.vendorId)) map[r.productId].push(r.vendorId);
    }
    return jsonResponse(map);
  }

  if (first === 'stock-overview' && method === 'GET') {
    const [catalog, vendors, rows] = await Promise.all([getCatalog(), listVendors(), listVendorStock()]);
    const products = catalog.map(p => {
      const vendorStock = {};
      for (const r of rows) {
        if (r.productId !== p._id || !r.isActive) continue;
        vendorStock[r.vendorId] = (vendorStock[r.vendorId] || 0) + (r.stock || 0);
      }
      return {
        _id: p._id, name: p.name, code: p.code, image: p.image, category: p.category,
        mainStock: p.combos.reduce((s, c) => s + c.mainStock, 0),
        vendorStock,
      };
    });
    return jsonResponse({ vendors: vendors.map(v => ({ id: v.id, name: v.businessName || v.name, isActive: v.isActive })), products });
  }

  if (first === 'orders') {
    if (method === 'GET' && !second) {
      await routeUnassignedOrders();
      const orders = (await listAllOrders()).filter(isConfirmedOrder);
      return jsonResponse(orders.map(orderSummary));
    }
    if (method === 'PUT' && second && third === 'route') {
      const order = await getOrder(second);
      if (!order) return errorResponse('Order not found', 404);
      const { target } = await req.json();
      const patch = await routeOrder(plain(order), {
        target: target === 'auto' ? undefined : target,
        actor: 'admin',
        note: target === 'auto' ? 'Auto re-route by admin' : 'Assigned by admin',
      });
      return jsonResponse(orderSummary(await saveOrderPatch(second, patch)));
    }
  }

  if (!first) {
    if (method === 'GET') {
      const vendors = await listVendors();
      const stats = await vendorStats(vendors.map(v => v.id));
      return jsonResponse(vendors.map(v => ({ ...v, stats: stats[v.id] })));
    }
    if (method === 'POST') {
      const body = await req.json();
      const vendor = await createVendor(body, body.password);
      // Switch routing on automatically when the first vendor is added
      if (!(await getVendorSettings()).enabledAt) await saveVendorSettings({ enabled: true });
      return jsonResponse(vendor, 201);
    }
  }

  const vendor = first ? await getVendor(first) : null;
  if (!vendor) return errorResponse('Vendor not found', 404);

  if (!second) {
    if (method === 'PUT') {
      const body = await req.json();
      return jsonResponse(await updateVendor(vendor.id, body, body.password));
    }
    if (method === 'DELETE') {
      const open = (await listAllOrders()).filter(o => o.vendorId === vendor.id && isConfirmedOrder(o) && o.status !== 'Delivered');
      if (open.length) return errorResponse(`This vendor has ${open.length} open order(s). Re-assign them first.`, 400);
      await deleteVendor(vendor.id);
      return jsonResponse({ deleted: vendor.id });
    }
  }

  if (second === 'stock') {
    if (method === 'GET') return jsonResponse(groupStock(await listVendorStock({ vendorId: vendor.id }), await getCatalog()));
    if (method === 'PUT') return jsonResponse(await applyStockUpdate(vendor.id, await req.json()));
  }

  if (second === 'products') {
    if (method === 'GET') return jsonResponse(await vendorProductsPayload(vendor.id));
    if (method === 'POST') {
      const { productId, stock } = await req.json();
      return jsonResponse(await addProductToVendor(vendor.id, productId, stock), 201);
    }
    if (method === 'DELETE' && third) {
      await removeVendorProduct(vendor.id, third);
      return jsonResponse({ removed: third });
    }
  }

  return errorResponse('API endpoint not found', 404);
}

async function handle(req, { params }, method) {
  await initAPI();
  const path = (await params).path || [];
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse('Not authorized', 401);
  try {
    if (path[0] === 'me') {
      if (user.role !== 'vendor') return errorResponse('Not a vendor account', 403);
      return await handleVendor(req, method, path.slice(1), user);
    }
    if (user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);
    return await handleAdmin(req, method, path);
  } catch (err) {
    console.error('[Vendors API]', err);
    return errorResponse(err.message || 'Server error', 400);
  }
}

export const GET = (req, ctx) => handle(req, ctx, 'GET');
export const POST = (req, ctx) => handle(req, ctx, 'POST');
export const PUT = (req, ctx) => handle(req, ctx, 'PUT');
export const DELETE = (req, ctx) => handle(req, ctx, 'DELETE');
