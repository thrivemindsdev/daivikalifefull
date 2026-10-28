# Daivika API (Laravel)

PHP backend for the Daivika store. It serves every `/api/...` endpoint the storefront uses, with the same
URLs, request formats and responses as the old Next.js API, and works on the same PostgreSQL database
(the tables are unchanged, so an existing database and backup work as they are).

- Laravel 12, PHP 8.3, PostgreSQL 14+
- PHP extensions: pdo_pgsql, gd (with WebP), mbstring, openssl, curl, intl, zip, bcmath, exif

## How it fits together

```
Browser ──> Next.js storefront (port 3000) ──/api/*──> Laravel API (port 8000) ──> PostgreSQL
```

The storefront forwards every `/api/*` request to `BACKEND_URL` (see `app/api/[...path]/route.js` in the
storefront), so the browser only ever talks to the store's own domain.

## Local development

```bash
cd backend
composer install
cp .env.example .env          # set DATABASE_URL, JWT_SECRET, ADMIN_EMAIL / ADMIN_PASSWORD
php artisan key:generate
php artisan migrate           # creates any missing store tables, never drops data
php artisan serve --port=8000

# storefront, in the project root
BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

Without SMS settings, OTP codes are written to `storage/logs/laravel.log` (not in production).

## Production

### Docker Compose (PostgreSQL + API + storefront on one server)

See `docker-compose.yml` in the project root:

```bash
cp backend/.env.example backend/.env    # DATABASE_URL=postgresql://daivika_user:PASSWORD@postgres:5432/daivika_db
cp .env.example .env                     # NEXT_PUBLIC_* values and POSTGRES_PASSWORD
docker compose up -d --build
```

### Coolify

Create two applications from the repository:

1. **API**: base directory `backend`, Dockerfile build, port 8000. Add the variables from
   `backend/.env.example` (APP_KEY, DATABASE_URL, JWT_SECRET, ADMIN_*, RAZORPAY_*, CLOUDINARY_*, SMS ...).
2. **Storefront**: base directory `/`, Dockerfile build, port 3000. Set `BACKEND_URL` to the API's internal
   address (for example `http://<api-container-name>:8000`) and the `NEXT_PUBLIC_*` build variables.

On every start the API container caches its configuration and runs `php artisan migrate --force`, which only
creates tables that are missing.

### After deploying

- Razorpay Dashboard → Webhooks: `https://YOUR_DOMAIN/api/payment/webhook`, event `payment.captured`,
  secret = `RAZORPAY_WEBHOOK_SECRET`.
- `https://YOUR_DOMAIN/api/health` should return `{"status":"ok","database":"connected"}`.
- Place a small test order: it should show in Admin → Orders as Paid with an invoice number, and stock
  should go down.

## Code layout

| Path | What it does |
|---|---|
| `routes/api.php` | URL → controller for each API module |
| `app/Http/Controllers/Api/` | One controller per module (auth, products, orders, payment, admin, vendors, reports ...) |
| `app/Services/OrderPricing.php` | Prices orders from database prices and admin settings (never from the browser) |
| `app/Services/OrderPayment.php` | The only place an order becomes paid: invoice number, vendor routing, stock |
| `app/Services/VendorRouting.php`, `VendorStore.php` | Nearest-vendor routing and vendor stock |
| `app/Services/Reports.php` | Sales and stock reports (IST time buckets) |
| `app/Services/MediaStorage.php`, `Cloudinary.php` | Image/video uploads (Cloudinary, or PostgreSQL when Cloudinary isn't set) |
| `app/Models/` | Eloquent models for the existing tables |
| `database/migrations/` | The store tables (`CREATE TABLE IF NOT EXISTS`) |

## Notes

- Login tokens are compatible with the old backend (same `JWT_SECRET`), so signed-in customers stay signed in.
- Rate limits and OTP codes are kept in the file cache. For more than one API server, set `CACHE_STORE=redis`.
- `/api/products/events` (live product updates) answers once and closes; the storefront then refreshes
  products every minute. PHP can't keep one connection open per visitor.
