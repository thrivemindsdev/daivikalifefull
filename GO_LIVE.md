# Going live with the PHP storefront

For the person who manages the Coolify server. Takes about 30 minutes. The shop keeps running on the old
Next.js storefront until step 4, and step 6 switches back in about a minute if anything is wrong.

## What changes

Today Coolify runs two applications from this repository:

- **Storefront** (Next.js, base directory `/`, port 3000) shows the pages at `daivikalife.com` and passes
  `/api/...` on to the API.
- **API** (Laravel, base directory `backend`, port 8000) holds the data, orders and payments.

The `php-frontend` branch adds every storefront page (and the admin and vendor dashboards) to the **API**
application. After the switch, `daivikalife.com` points at the API application and the Storefront
application is no longer needed.

## 1. Deploy the new code to the API application

In Coolify, open the **API** application:

1. Set the branch to `php-frontend` (or merge `php-frontend` into `master` first and keep `master`).
2. Redeploy.

The live site does not change: the domain still points at the Storefront application, and the API keeps
answering `/api/...` exactly as before.

## 2. Check the API application's settings (environment variables)

These should already be set, because payments and notifications already run in the API application.
Check that they have values:

| Variable | Value |
|---|---|
| `FRONTEND_URL` | `https://daivikalife.com` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | the live Razorpay keys (unchanged) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | the push notification keys (the same as the storefront's `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) |

If `FRONTEND_URL` is missing, the pages still work: they use the address the visitor opened.

## 3. Preview before switching

Give the API application a temporary address in Coolify (for example the generated `sslip.io` domain, or
`new.daivikalife.com`). Open it and check:

- Home, a product page, the products list and the cart open and look like the live site.
- Log in, open Profile and My Orders.
- Admin: open `/admin/dashboard` and log in.

Payments made on a preview address are real if the live Razorpay keys are set, so place the test order in
step 5 after the switch (or with Razorpay test keys on the preview).

## 4. Switch the domain

1. Storefront application: remove `daivikalife.com` (and `www.daivikalife.com`) from its domains.
2. API application: add `daivikalife.com` (and `www.`) with port 8000. Coolify issues the HTTPS certificate.
3. Keep the Storefront application stopped but do not delete it yet (it is the way back in step 6).

## 5. Check the live site

- `https://daivikalife.com/api/health` shows `{"status":"ok","database":"connected"}`.
- `https://daivikalife.com/sitemap.xml` and `/robots.txt` list `https://daivikalife.com/...` addresses.
- Place a small real order with Razorpay and confirm it shows in Admin → Orders as Paid with an invoice
  number. Refund it from the Razorpay dashboard afterwards if needed.
- The Razorpay webhook (`https://daivikalife.com/api/payment/webhook`) needs no change: the address stays the
  same.

## 6. Going back (only if something is wrong)

1. API application: remove `daivikalife.com`.
2. Storefront application: start it and add `daivikalife.com` again.

The old Next.js storefront is back. The data is the same database, so no orders are lost either way.

## Later

When the PHP storefront has run well for a while, the Storefront application can be deleted in Coolify.
Updating the admin or vendor dashboards' React code needs one extra step: see "Dashboards" in
`PHP_CONVERSION.md`.
