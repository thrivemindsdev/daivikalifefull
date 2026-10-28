// The single place where an order becomes paid. Called only after the payment provider has been verified
// on the server (Razorpay signature / webhook, Cashfree API / webhook) — never because the browser said so.
import prisma from '@/lib/prisma';
import Setting from '@/models/Setting';
import { isDatabaseConnected, memoryOrders, memorySettings, saveMemoryOrders, saveMemorySettings } from '@/lib/db';
import { getOrder, saveOrderPatch, isConfirmedOrder, shouldAutoRoute, routeOrder, adjustMainStock } from '@/lib/vendor-routing';
import { notifyAdmins } from '@/lib/admin-notifier';

const CLAIM = 'Verifying';

export const DEFAULT_COMPANY = {
  companyName: 'DAIVIKA Store',
  companyLogo: '',
  companyStreet: 'Kuriyedam, Ayikkarapadi',
  companyCity: 'Malappuram',
  companyState: 'Kerala',
  companyPin: '673637',
  companyEmail: 'support@daivika.in',
  companyPhone: '+91 75108 21228',
  invoicePrefix: 'SPO',
  nextInvoiceNum: 1,
};

// Next invoice number from the admin's invoice settings (also returns the company block printed on invoices)
export async function takeInvoiceNumber() {
  let settings = { ...DEFAULT_COMPANY };
  if (isDatabaseConnected) {
    const row = await Setting.findOne({ key: 'invoice_settings' });
    if (row?.value) settings = { ...settings, ...row.value };
  } else {
    const row = memorySettings.find(s => s.key === 'invoice_settings');
    if (row?.value) settings = { ...settings, ...row.value };
  }
  const serial = Number(settings.nextInvoiceNum) || 1;
  const invoiceNumber = `${settings.invoicePrefix || 'SPO'}${String(serial).padStart(6, '0')}`;
  const next = { ...settings, nextInvoiceNum: serial + 1 };
  if (isDatabaseConnected) {
    await Setting.findOneAndUpdate({ key: 'invoice_settings' }, { value: next }, { upsert: true });
  } else {
    const row = memorySettings.find(s => s.key === 'invoice_settings');
    if (row) row.value = next; else memorySettings.push({ key: 'invoice_settings', value: next });
    saveMemorySettings();
  }
  const { invoicePrefix, nextInvoiceNum, ...company } = settings;
  return { invoiceNumber, company };
}

// Atomically moves a pending order into the "Verifying" state so two confirmations can't both run
async function claim(orderId) {
  if (isDatabaseConnected) {
    const { count } = await prisma.order.updateMany({ where: { id: orderId, paymentStatus: 'Pending' }, data: { paymentStatus: CLAIM } });
    return count === 1;
  }
  const o = memoryOrders.find(x => x._id === orderId);
  if (!o || o.paymentStatus !== 'Pending') return false;
  o.paymentStatus = CLAIM;
  return true;
}

async function release(orderId) {
  if (isDatabaseConnected) {
    await prisma.order.updateMany({ where: { id: orderId, paymentStatus: CLAIM }, data: { paymentStatus: 'Pending' } });
  } else {
    const o = memoryOrders.find(x => x._id === orderId);
    if (o && o.paymentStatus === CLAIM) o.paymentStatus = 'Pending';
  }
}

/**
 * Marks an order as paid after a verified payment.
 *  amountPaid: rupees actually received for this order (checked against the server-computed amount due)
 *  gateway:    label shown as the payment method for full online payments
 * Returns { order, alreadyConfirmed }. Throws if the order is missing or the amount is short.
 */
export async function confirmOrderPayment(orderId, { paymentId, amountPaid, gateway = 'Razorpay' }) {
  const order = await getOrder(orderId);
  if (!order) throw new Error('Order not found');
  if (isConfirmedOrder(order) && order.paymentStatus !== CLAIM) return { order, alreadyConfirmed: true };
  if (order.status === 'Cancelled') throw new Error('This order was cancelled');

  const due = Number(order.isPartialCod ? order.advanceAmount : (order.advanceAmount || order.total)) || 0;
  if (!(Number(amountPaid) + 0.5 >= due)) {
    notifyAdmins({
      title: 'Payment amount mismatch ⚠️',
      message: `Order ${orderId}: received ₹${amountPaid} but ₹${due} was due. The order was not confirmed.`,
      type: 'system',
      link: '/admin/dashboard?tab=orders',
    }).catch(() => {});
    throw new Error('Payment amount does not match the order');
  }

  if (!(await claim(orderId))) {
    // Another request is confirming (or already confirmed) this order
    const current = await getOrder(orderId);
    return { order: current, alreadyConfirmed: isConfirmedOrder(current) };
  }

  try {
    const { invoiceNumber, company } = order.invoiceNumber ? { invoiceNumber: order.invoiceNumber, company: order.companyDetails || {} } : await takeInvoiceNumber();
    const patch = {
      status: 'Processing',
      paymentStatus: order.isPartialCod ? 'Partially Paid' : 'Paid',
      paymentMethod: order.isPartialCod ? 'Cash on Delivery' : gateway,
      razorpay_payment_id: paymentId || order.razorpay_payment_id || '',
      invoiceNumber,
      companyDetails: { ...(order.companyDetails || {}), ...company },
    };

    const candidate = { ...(order.toObject ? order.toObject() : order), ...patch };
    let routed = false;
    try {
      if (await shouldAutoRoute(candidate)) {
        Object.assign(patch, await routeOrder(candidate));
        routed = true;
      }
    } catch (err) {
      console.error('[order-payment] vendor routing failed, using main store:', err.message);
    }
    if (!routed && !order.isStockDecremented) {
      await adjustMainStock(order.itemsList || [], -1);
      patch.isStockDecremented = true;
      patch.stockSource = 'main';
    }

    const saved = await saveOrderPatch(orderId, patch);
    if (!isDatabaseConnected) saveMemoryOrders();

    notifyAdmins({
      title: 'New Order Received 🛍️',
      message: `${order.user || 'A customer'} placed an order of ₹${order.total} (${patch.paymentStatus}).`,
      type: 'new_order',
      link: '/admin/dashboard?tab=orders',
    }).catch(() => {});

    return { order: saved, alreadyConfirmed: false };
  } catch (err) {
    await release(orderId);
    throw err;
  }
}

// What the storefront may see about an order it does not own (no address / phone / email)
export const publicOrderView = (o) => o && ({
  _id: (o._id || o.id || '').toString(),
  status: o.status,
  paymentStatus: o.paymentStatus,
  invoiceNumber: o.invoiceNumber || '',
  total: o.total,
  advanceAmount: o.advanceAmount,
  remainingAmount: o.remainingAmount,
});
