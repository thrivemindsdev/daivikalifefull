# Daivika store

- **Storefront, admin dashboard and vendor dashboard:** Next.js 15 (this folder)
- **API:** Laravel 12 / PHP 8.3 in [`backend/`](backend/README.md)
- **Database:** PostgreSQL (same tables as before; an existing database or backup works unchanged)

```
Browser ──> Next.js (port 3000) ──/api/*──> Laravel API (port 8000) ──> PostgreSQL
```

The browser only calls `/api/...` on the store's own domain. `app/api/[...path]/route.js` forwards those
requests to the Laravel API at `BACKEND_URL`.

The previous Node.js API (Next.js route handlers + Prisma) is kept for reference in `legacy-node-backend/`.
It is not built or used.

## Local development

```bash
# 1. API (see backend/README.md)
cd backend && composer install && cp .env.example .env
php artisan key:generate && php artisan migrate && php artisan serve --port=8000

# 2. Storefront (project root)
npm install
cp .env.example .env.local   # BACKEND_URL=http://127.0.0.1:8000
npm run dev                  # http://localhost:3000
```

## How checkout and payment work

1. The checkout page sends the cart and address to `POST /api/orders`. The API prices the order from the
   database (variant and bulk prices, product groups, coupon, shipping zone, free gift, COD advance), checks stock,
   and saves it as **Pending Payment**. Prices or totals sent by the browser are ignored.
2. `POST /api/payment/create-order { orderId }` creates the Razorpay order for the amount the API computed.
3. After payment, `POST /api/payment/verify` checks the Razorpay signature. The Razorpay webhook
   (`/api/payment/webhook`) does the same in the background if the customer closes the browser.
4. Only then does `backend/app/Services/OrderPayment.php` mark the order paid, assign the invoice number, route it to
   a vendor or the main store, and take the stock (exactly once, even if verify and the webhook arrive together).

## Production deployment

See [backend/README.md](backend/README.md) for Docker Compose and Coolify. In short:

1. API: set every variable in `backend/.env.example` (APP_KEY, DATABASE_URL, JWT_SECRET, ADMIN_EMAIL /
   ADMIN_PASSWORD, Razorpay, Cloudinary, SMS, SMTP).
2. Storefront: set `BACKEND_URL` (runtime) and the `NEXT_PUBLIC_*` values (build time).
3. In the Razorpay dashboard add a webhook to `https://YOUR_DOMAIN/api/payment/webhook` for the
   `payment.captured` event, using the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. Serve the site over HTTPS only (the storefront sends `Strict-Transport-Security`).
5. Back up the PostgreSQL database regularly. Uploaded images are stored in it (`StoredImage`) unless Cloudinary
   is configured.

### After each deployment

- `https://YOUR_DOMAIN/api/health` returns `{"status":"ok","database":"connected"}`.
- Place a small real order with Razorpay test mode first, then live: it should appear in Admin → Orders as Paid
  with an invoice number, and stock should go down by the ordered quantity.
- Track it on `/order-tracking` with the order ID and phone number.
- Check Admin → Reports & Analytics shows the order.
