import { initAPI, errorResponse, jsonResponse } from '@/lib/api-middleware';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getOrder, saveOrderPatch } from '@/lib/vendor-routing';
import { confirmOrderPayment } from '@/lib/order-payment';
import { notifyAdmins } from '@/lib/admin-notifier';

// POST /api/payment/create-order   { orderId }  -> Razorpay order for the amount due on our pending order
// POST /api/payment/verify         { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// POST /api/payment/webhook        Razorpay webhook (payment.captured)
// POST /api/payment/cashfree-verify, /api/payment/cashfree-webhook   (legacy Cashfree return / webhook)
//
// An order is only ever marked paid by confirmOrderPayment() after the provider has been verified here.

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

const orderIdOf = (o) => (o?._id || o?.id || '').toString();

function cashfreeConfig() {
  const env = process.env.CASHFREE_ENV || process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox';
  return {
    appId: process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    base: env === 'production' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders',
  };
}

export async function POST(req, { params }) {
  await initAPI();
  const action = ((await params).path || [])[0];

  // Razorpay order for a pending order. The amount comes from the order saved on the server.
  if (action === 'create-order') {
    try {
      const { orderId } = await req.json();
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) return errorResponse('Online payment is not configured. Please contact the store.', 503);
      if (!orderId) return errorResponse('Order ID is required', 400);

      const order = await getOrder(String(orderId));
      if (!order) return errorResponse('Order not found', 404);
      if (order.status !== 'Pending Payment' || order.paymentStatus !== 'Pending') return errorResponse('This order has already been paid', 409);

      const amountDue = Number(order.isPartialCod ? order.advanceAmount : (order.advanceAmount || order.total));
      if (!(amountDue > 0)) return errorResponse('Nothing to pay for this order', 400);

      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(amountDue * 100),
        currency: 'INR',
        receipt: orderIdOf(order).slice(0, 40),
        payment_capture: 1,
        notes: { orderId: orderIdOf(order) },
      });
      // Until payment, this field holds the Razorpay order id; verify() checks the signature against it
      await saveOrderPatch(orderIdOf(order), { razorpay_payment_id: rzpOrder.id });
      return jsonResponse({ ...rzpOrder, keyId }, 200, { order: rzpOrder, keyId });
    } catch (error) {
      console.error('Razorpay Order Creation Error:', error);
      return errorResponse('Could not start the payment. Please try again.', 502);
    }
  }

  // Checkout handler response: signature proves Razorpay order <-> payment, and the Razorpay order was
  // created by us for this order's amount, so the amount is guaranteed.
  if (action === 'verify') {
    try {
      const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) return errorResponse('Online payment is not configured on the server', 503);
      if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return errorResponse('Incomplete payment details', 400);

      const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (!safeEqual(expected, razorpay_signature)) return errorResponse('Invalid payment signature', 400);

      const order = await getOrder(String(orderId));
      if (!order) return errorResponse('Order not found', 404);
      const alreadyPaidWithThis = order.razorpay_payment_id === razorpay_payment_id;
      if (order.razorpay_payment_id !== razorpay_order_id && !alreadyPaidWithThis) return errorResponse('Payment does not belong to this order', 400);

      const due = Number(order.isPartialCod ? order.advanceAmount : (order.advanceAmount || order.total));
      const { order: confirmed } = await confirmOrderPayment(orderIdOf(order), { paymentId: razorpay_payment_id, amountPaid: due, gateway: 'Razorpay' });
      return jsonResponse(confirmed, 200, { message: 'Payment verified successfully' });
    } catch (error) {
      console.error('Payment Verification Error:', error);
      return errorResponse(error.message || 'Payment verification failed', 400);
    }
  }

  // Razorpay webhook: confirms orders even when the customer closes the browser after paying
  if (action === 'webhook' || action === 'razorpay-webhook') {
    try {
      const signature = req.headers.get('x-razorpay-signature');
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) return errorResponse('Razorpay webhook secret not configured', 500);
      const rawBody = await req.text();
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      if (!safeEqual(expected, signature)) return errorResponse('Invalid signature', 400);

      const payload = JSON.parse(rawBody);
      if (payload.event !== 'payment.captured') return jsonResponse({ message: 'Event ignored' });

      const payment = payload.payload?.payment?.entity || {};
      let order = payment.notes?.orderId ? await getOrder(String(payment.notes.orderId)) : null;
      if (!order && payment.order_id) {
        const { listAllOrders } = await import('@/lib/vendor-routing');
        order = (await listAllOrders()).find(o => o.razorpay_payment_id === payment.order_id || o.razorpay_payment_id === payment.id) || null;
      }
      if (!order) {
        console.warn('[Razorpay webhook] captured payment without a matching order:', payment.id);
        notifyAdmins({
          title: 'Payment without order ⚠️',
          message: `Razorpay payment ${payment.id} (₹${(payment.amount || 0) / 100}) has no matching order. Check the Razorpay dashboard.`,
          type: 'system',
          link: '/admin/dashboard?tab=orders',
        }).catch(() => {});
        return jsonResponse({ message: 'No matching order' });
      }

      try {
        await confirmOrderPayment(orderIdOf(order), { paymentId: payment.id, amountPaid: (Number(payment.amount) || 0) / 100, gateway: 'Razorpay' });
      } catch (err) {
        // Permanent problems (amount mismatch, cancelled order) are reported to the admin; don't make Razorpay retry
        console.warn('[Razorpay webhook] not confirmed:', err.message);
        return jsonResponse({ message: err.message });
      }
      return jsonResponse({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Razorpay Webhook Processing Error:', error);
      return errorResponse('Webhook processing failed', 500);
    }
  }

  // Cashfree return page: ask Cashfree directly whether our order was paid
  if (action === 'cashfree-verify') {
    try {
      const { orderId } = await req.json();
      if (!orderId) return errorResponse('Missing orderId', 400);
      const { appId, secretKey, base } = cashfreeConfig();
      if (!appId || !secretKey) return errorResponse('Cashfree is not configured', 503);

      const order = await getOrder(String(orderId));
      if (!order) return errorResponse('Order not found', 404);

      const res = await fetch(`${base}/${encodeURIComponent(orderId)}`, {
        headers: { 'x-api-version': '2023-08-01', 'x-client-id': appId, 'x-client-secret': secretKey },
      });
      const data = await res.json();
      if (!res.ok || !['PAID', 'SUCCESS'].includes(data.order_status)) {
        return errorResponse(data.message || 'Payment is pending or failed', 400);
      }
      const { order: confirmed } = await confirmOrderPayment(orderIdOf(order), { paymentId: data.cf_order_id, amountPaid: Number(data.order_amount) || 0, gateway: 'Cashfree Online' });
      return jsonResponse(confirmed, 200, { message: 'Cashfree payment verified' });
    } catch (error) {
      console.error('Cashfree Verify Exception:', error);
      return errorResponse(error.message || 'Error verifying Cashfree payment', 400);
    }
  }

  // Cashfree webhook: only trusted with a valid signature
  if (action === 'cashfree-webhook') {
    try {
      const timestamp = req.headers.get('x-webhook-timestamp');
      const signature = req.headers.get('x-webhook-signature');
      const { secretKey } = cashfreeConfig();
      const rawBody = await req.text();
      if (!secretKey || !timestamp || !signature) return errorResponse('Unauthorized webhook', 401);
      const expected = crypto.createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64');
      if (!safeEqual(expected, signature)) return errorResponse('Invalid signature', 401);

      const event = JSON.parse(rawBody);
      const orderId = event?.data?.order?.order_id;
      const status = event?.data?.payment?.payment_status;
      if (orderId && status === 'SUCCESS') {
        const order = await getOrder(String(orderId));
        if (order) {
          await confirmOrderPayment(orderIdOf(order), {
            paymentId: event.data.payment.cf_payment_id,
            amountPaid: Number(event.data.payment.payment_amount) || 0,
            gateway: 'Cashfree Online',
          });
        }
      }
      return jsonResponse({ status: 'OK' });
    } catch (error) {
      console.error('Cashfree Webhook Error:', error);
      return errorResponse('Webhook processing failed', 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}
