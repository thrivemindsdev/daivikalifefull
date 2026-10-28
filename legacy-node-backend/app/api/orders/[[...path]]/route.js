import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import crypto from 'crypto';
import Order from '@/models/Order';
import User from '@/models/User';
import { isDatabaseConnected, memoryOrders, saveMemoryOrders, memoryUsers } from '@/lib/db';
import { routeUnassignedOrders, getOrder, saveOrderPatch, adjustMainStock, listAllOrders } from '@/lib/vendor-routing';
import { adjustVendorStockForItems } from '@/lib/vendor-store';
import { priceOrder, PricingError, phoneKey } from '@/lib/order-pricing';
import { publicOrderView } from '@/lib/order-payment';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// GET  /api/orders                 the signed-in customer's orders (admins: all confirmed orders)
// POST /api/orders                 create a pending order; prices are computed here, never taken from the browser
// POST /api/orders/sync            link the signed-in customer's guest orders to their account
// PUT  /api/orders/:id/status      admin status change

const ADMIN_STATUSES = ['Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_IMAGE = /^(https?:\/\/|\/)[^\s"'<>]*$/i;

const ownsOrder = (user, o) => {
  if (!user || !o) return false;
  const id = (user._id || user.id || '').toString();
  const email = (user.email || '').toLowerCase().trim();
  const phone = phoneKey(user.phone);
  return (o.userId && o.userId === id) || (email && (o.email || '').toLowerCase().trim() === email) || (phone && phoneKey(o.phone) === phone);
};

async function newOrderId() {
  for (let i = 0; i < 5; i++) {
    const id = `ORD_${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    if (!(await getOrder(id))) return id;
  }
  throw new Error('Could not allocate an order number, please try again');
}

export async function GET(req, { params }) {
  await initAPI();
  const path = (await params).path || [];

  // GET /api/orders/track?ref=<order id or invoice>&phone=<mobile> — public tracking for guests.
  // Needs both the reference and the phone number on the order; returns no address or contact details.
  if (path[0] === 'track') {
    const limited = rateLimit(`track:${clientIp(req)}`, 20, 15 * 60 * 1000);
    if (limited) return limited;
    const url = new URL(req.url);
    const ref = clean(url.searchParams.get('ref'), 60).toLowerCase();
    const phone = phoneKey(url.searchParams.get('phone'));
    if (!ref || phone.length !== 10) return errorResponse('Enter your order ID (or invoice number) and the mobile number used for the order', 400);
    const order = (await listAllOrders()).find(o =>
      ((o._id || o.id || '').toString().toLowerCase() === ref || (o.invoiceNumber || '').toLowerCase() === ref) &&
      phoneKey(o.phone) === phone &&
      o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending'
    );
    if (!order) return errorResponse('No order found with these details', 404);
    return jsonResponse({
      _id: (order._id || order.id).toString(),
      invoiceNumber: order.invoiceNumber || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      date: order.date || '',
      createdAt: order.createdAt,
      total: order.total,
      itemsList: (order.itemsList || []).map(it => ({ name: it.name, qty: it.qty || it.quantity || 1, size: it.size || '', image: it.image || '' })),
    });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse('Not authorized to access orders', 401);

  try {
    if (user.role === 'admin') {
      // Route any confirmed orders that came in through payment webhooks
      await routeUnassignedOrders();
      if (!isDatabaseConnected) {
        return jsonResponse([...memoryOrders.filter(o => o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending')].reverse());
      }
      const allOrders = await Order.find({ status: { $ne: 'Pending Payment' }, paymentStatus: { $ne: 'Pending' } }).sort({ createdAt: -1 });
      return jsonResponse(allOrders);
    }

    // Customer: only their own confirmed orders
    const confirmed = (o) => o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending';
    if (!isDatabaseConnected) {
      return jsonResponse([...memoryOrders.filter(o => ownsOrder(user, o) && confirmed(o))].reverse());
    }
    const userIdStr = user._id.toString();
    const orConditions = [{ userId: userIdStr }];
    if (user.email) orConditions.push({ email: user.email.toLowerCase().trim() });
    if (user.phone) orConditions.push({ phone: user.phone.trim() });
    const userOrders = await Order.find({
      $and: [{ $or: orConditions }, { status: { $ne: 'Pending Payment' } }, { paymentStatus: { $ne: 'Pending' } }],
    }).sort({ createdAt: -1 });
    return jsonResponse(userOrders);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(req, { params }) {
  await initAPI();
  const path = (await params).path || [];

  // POST /api/orders/sync — links guest orders placed with this account's email / phone. Never creates orders.
  if (path[0] === 'sync') {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse('Not authorized to sync orders', 401);
    try {
      const userIdStr = user._id.toString();
      const email = user.email?.toLowerCase().trim();
      const phone = user.phone?.trim();
      if (isDatabaseConnected) {
        const match = [];
        if (email) match.push({ email });
        if (phone) match.push({ phone });
        if (match.length) {
          await Order.updateMany(
            { $and: [{ $or: match }, { $or: [{ isGuest: true }, { userId: null }] }] },
            { $set: { userId: userIdStr, isGuest: false } }
          );
        }
        const orders = await Order.find({
          $and: [{ $or: [{ userId: userIdStr }, ...match] }, { status: { $ne: 'Pending Payment' } }, { paymentStatus: { $ne: 'Pending' } }],
        }).sort({ createdAt: -1 });
        return jsonResponse(orders);
      }
      for (const o of memoryOrders) {
        if (ownsOrder(user, o) && (o.isGuest || !o.userId)) { o.userId = userIdStr; o.isGuest = false; }
      }
      saveMemoryOrders();
      return jsonResponse([...memoryOrders.filter(o => ownsOrder(user, o) && o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending')].reverse());
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  if (path.length) return errorResponse('API endpoint not found', 404);

  // POST /api/orders — create a pending order
  const limited = rateLimit(`order:${clientIp(req)}`, 30, 15 * 60 * 1000);
  if (limited) return limited;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid order data', 400);

    // An order that already exists can't be changed from the storefront: payment is confirmed by
    // /api/payment/*, and status changes are admin-only. Older checkouts re-post the paid order; answer
    // with its current state (without personal details) so they keep working.
    if (body._id) {
      const existing = await getOrder(String(body._id));
      if (existing) return jsonResponse(publicOrderView(existing), 200);
    }

    const user = await getAuthenticatedUser(req);
    const address = body.address || {};
    const order = {
      user: clean(body.user, 120),
      email: clean(body.email, 160).toLowerCase(),
      phone: clean(body.phone, 20),
      address: {
        street: clean(address.street, 300),
        city: clean(address.city, 100),
        district: clean(address.district, 100),
        state: clean(address.state, 100),
        pincode: clean(address.pincode, 10),
        country: 'India',
      },
    };
    if (!order.user) return errorResponse('Please enter your name', 400);
    if (phoneKey(order.phone).length !== 10) return errorResponse('Please enter a valid 10-digit mobile number', 400);
    if (order.email && !EMAIL_RE.test(order.email)) return errorResponse('Please enter a valid email address', 400);
    if (!order.address.street || !order.address.city || !order.address.state) return errorResponse('Please fill in your full delivery address', 400);
    if (!/^\d{6}$/.test(order.address.pincode)) return errorResponse('Please enter a valid 6-digit PIN code', 400);

    const isCod = Boolean(body.isPartialCod) || /cash on delivery/i.test(body.paymentMethod || '');
    const items = (Array.isArray(body.itemsList) ? body.itemsList : []).slice(0, 50).map(it => ({
      productId: clean(it.productId, 80),
      qty: it.qty ?? it.quantity,
      size: clean(it.size, 80),
      color: clean(it.color, 80),
      isFreeGift: Boolean(it.isFreeGift),
      image: SAFE_IMAGE.test(String(it.image || '')) ? String(it.image) : '',
      name: clean(it.name, 200),
    }));
    const pricing = await priceOrder({ items, state: order.address.state, couponCode: clean(body.couponCode, 40), phone: order.phone, isCod });

    let userId = user ? user._id.toString() : null;
    if (!userId && order.email) {
      const match = isDatabaseConnected
        ? await User.findOne({ email: order.email })
        : memoryUsers.find(u => u.email?.toLowerCase().trim() === order.email);
      if (match) userId = (match._id || match.id).toString();
    }

    const utm = body.utmData && typeof body.utmData === 'object' ? body.utmData : {};
    const utmData = Object.fromEntries(Object.entries(utm).slice(0, 20).map(([k, v]) => [clean(k, 40), clean(v, 300)]));
    const now = new Date();
    const finalOrder = {
      _id: await newOrderId(),
      ...order,
      ...pricing,
      invoiceNumber: '',
      razorpay_payment_id: '',
      status: 'Pending Payment',
      paymentStatus: 'Pending',
      paymentMethod: isCod ? 'Cash on Delivery (Advance Paid)' : 'Razorpay',
      isStockDecremented: false,
      userId,
      isGuest: !userId,
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }),
      date: now.toISOString().split('T')[0],
      companyDetails: { utmData },
      utmData,
    };
    delete finalOrder.subtotal;

    if (isDatabaseConnected) {
      const { utmData: _u, ...dbOrder } = finalOrder;
      return jsonResponse(await Order.create(dbOrder), 201);
    }
    memoryOrders.push({ ...finalOrder, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    saveMemoryOrders();
    return jsonResponse(finalOrder, 201);
  } catch (err) {
    if (err instanceof PricingError) return errorResponse(err.message, 400, err.productId ? { unavailableProductId: err.productId } : {});
    console.error('[Orders API] create failed:', err);
    return errorResponse('Could not create your order. Please try again.', 500);
  }
}

export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  const [id, subAction] = path;
  if (!id) return errorResponse('Order ID is required', 400);
  if (subAction !== 'status') return errorResponse('API endpoint not found', 404);

  try {
    const { status } = await req.json();
    if (!ADMIN_STATUSES.includes(status)) return errorResponse(`Status must be one of: ${ADMIN_STATUSES.join(', ')}`, 400);
    const order = await getOrder(id);
    if (!order) return errorResponse('Order not found', 404);
    if (order.status === 'Pending Payment' || order.paymentStatus === 'Pending') return errorResponse('This order has not been paid yet', 400);

    const patch = { status };
    const items = order.itemsList || [];
    // Cancelling gives the stock back to whoever holds it; re-opening takes it from the main store again
    if (status === 'Cancelled' && order.status !== 'Cancelled' && order.isStockDecremented) {
      if (order.stockSource === 'vendor' && order.vendorId) await adjustVendorStockForItems(order.vendorId, items, +1);
      else await adjustMainStock(items, +1);
      Object.assign(patch, { isStockDecremented: false, stockSource: '' });
    } else if (order.status === 'Cancelled' && status !== 'Cancelled' && !order.isStockDecremented) {
      await adjustMainStock(items, -1);
      Object.assign(patch, { isStockDecremented: true, stockSource: 'main' });
    }

    const updated = await saveOrderPatch(id, patch);
    return jsonResponse(updated, 200, { message: 'Order status updated successfully' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function DELETE() {
  return errorResponse('Order deletion is disabled', 403);
}
