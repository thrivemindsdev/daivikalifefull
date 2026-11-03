# Storefront conversion: Next.js → PHP (Laravel Blade)

**Goal (from the client):** run the whole storefront on PHP **with no visible change**. Same layout, styles, text and animations as the Next.js site. The API is already PHP (`backend/`, Laravel 12). This file says where the conversion stands and how to continue it.

Branch: `php-frontend` (local only; the GitHub repo belongs to the client, so do not push without their permission).

## Status (2026-11-03)

Each item marked done was compared with the Next.js page in a browser at 1440, 768 and 375 px. Text, computed styles and screenshots match (0.00 % pixel difference unless noted), and the animations replay with the same values.

| Part | Status | Files |
|---|---|---|
| Layout: head, SEO tags, JSON-LD, scripts | Done | `backend/resources/views/layouts/store.blade.php` |
| Navbar: ticker, header, search, account menu, notifications, push prompt, side menu, WhatsApp chat, phone bottom bar | Done | `partials/navbar.blade.php`, `public/js/navbar.js`, `app/View/StoreChrome.php` |
| Cart drawer | Done | `partials/cart-drawer.blade.php`, `cart-mandala`, `cart-divider`, `public/js/cart-drawer.js` |
| Floating "Sacred Order" bar | Done | `partials/floating-cart.blade.php`, `public/js/floating-cart.js` |
| Welcome coupon popup | Done | `partials/welcome-popup.blade.php`, `public/js/welcome-popup.js` |
| Toasts, logout message | Done | `partials/toasts.blade.php`, `public/js/toasts.js` |
| Footer, breadcrumbs, sub-page header | Done | `partials/footer`, `breadcrumbs`, `sub-page-header` |
| Shared state (login, cart with bulk prices / gifts / live price updates, settings, Meta Pixel, image URLs) | Done | `public/js/daivika.js` |
| `/faq` | Done | `pages/faq.blade.php`, `public/js/faq.js` |
| `/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/returns-exchanges`, `/shipping-policy` | Done | `pages/policy.blade.php`, `app/Support/PolicyPages.php`, `public/js/fade-in.js` |
| `/about`, `/contact`, `/wishlist`, `/order-tracking` | **Next** | `app/(store)/…/page.jsx` |
| `/`, `/products`, `/product/[id]`, `/login`, `/profile`, `/checkout` | To do | |
| `/admin/dashboard` (24k lines), `/vendor/dashboard` | To do (last) | |
| `/sitemap.xml`, `/robots.txt`, `/uploads/*`, 404 page | To do | `app/sitemap.js`, `app/robots.js`, `app/uploads/` |

Routes: `backend/routes/web.php`. Controller: `backend/app/Http/Controllers/StorePageController.php`.

Two differences are on purpose:
- The floating cart bar on short-at-load pages: Next.js hides it there because of a timing bug. Blade shows it, as intended.
- The logout message: it also appears on the page that opens after logging out.

## How a page is converted

1. Read the React page and every component it uses. Copy the markup into Blade with the **same inline styles**.
2. Rules that bite:
   - `styles/globals.css` forces `border-radius: 6px !important` on every button unless its `style` contains `radius: 50%` **with the space**. Always write `border-radius: 50%`.
   - Hover effects that React sets with `onMouseEnter` go in CSS classes in `backend/public/css/daivika-blade.css`, not inline (inline would beat `:hover`).
   - Inside `white-space: pre-line` text, keep `{{ $text }}` on the same line as its tags.
   - `[hidden]` is `display:none !important`; show elements by removing `hidden`.
   - `isMobile` checks become CSS media queries with the same breakpoint (Navbar 1024 px, cart and floating cart 768 px).
3. Animations: `public/js/motion.js` is the Motion library (`window.Motion.animate`). Use the exact framer-motion values. Defaults: tween ease `easeOut`; `x`/`y` springs stiffness 500, damping 25.
4. Data the React page read from `localStorage` (filled from `/api/public/settings`) comes from `App\Services\Settings` on the server in Blade. Keep the same `localStorage` keys and `/api` calls in JS (`vaugun_token`, `drop_cart`, `wishlist`, `vaugun_*`), so carts and logins carry over.
5. Icons: `node tools/php-conversion/make-icons.cjs <repo root> IconName …` writes lucide icons exactly as React renders them to `backend/resources/icons/`. Use them with `<x-icon name="kebab-name" size="16" stroke="2" color="#fff" />`.
6. Compare with Next.js (next section) and fix until it matches.

## Running and comparing

**Next.js (reference):** in the repo root, put `BACKEND_URL=https://daivikalife.com` in `.env.local`, then run `npm run build` and `npx next start -p 3000`. It uses live data, so only browse (no login, orders or admin changes).

**Blade (PHP):** no PHP on this PC, so it runs in Docker. Composer downloads fail on this network (TLS interception), so the image uses the committed `backend/vendor`.

```bash
cd backend
docker build -f ../tools/php-conversion/Dockerfile.dev -t daivika-dev-php:local .
docker network create daivika-dev-net
docker run -d --name daivika-dev-db --network daivika-dev-net -e POSTGRES_DB=daivika_db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=devpass postgres:17-alpine
docker run -d --name daivika-dev-php --network daivika-dev-net -p 8090:8000 \
  -v "C:/Users/safeer/daivikalifefull/backend:/var/www/html" \
  -e APP_KEY="base64:$(head -c 32 /dev/urandom | base64)" -e APP_ENV=local -e APP_DEBUG=true \
  -e DATABASE_URL="postgresql://dev:devpass@daivika-dev-db:5432/daivika_db" -e DB_CONNECTION=pgsql \
  -e JWT_SECRET=dev -e VIEW_COMPILED_PATH=/tmp/views -e LOG_CHANNEL=stderr -e PHP_CLI_SERVER_WORKERS=10 \
  --entrypoint sh daivika-dev-php:local -c 'printf "opcache.validate_timestamps=1\nopcache.revalidate_freq=0\n" > /usr/local/etc/php/conf.d/zz-dev.ini && mkdir -p /tmp/views && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000'
docker exec -i daivika-dev-db psql -U dev -d daivika_db < ../tools/php-conversion/dev-categories.sql
```

Open `http://localhost:8090/faq`. On Windows each page takes about 5–15 s because of the shared folder. Every page keeps an SSE connection open, so the server needs several workers. If it stops answering, run `docker restart daivika-dev-php`.

**Comparison scripts** (`tools/php-conversion`, run `npm install` there first). They send Blade's `/api` calls to the live API so both sides show the same data. In Git Bash, prefix commands with `MSYS_NO_PATHCONV=1`.

- `node pageparity.js /about /contact`: text, computed styles, header/body/footer screenshots, fade timing
- `node navparity.js /faq`: navbar, account menu, side menu, chat, search
- `node cartparity.js`, `node popupparity.js`: cart drawer, floating bar, welcome popup
- `faqparity.js`, `frames.js`, `flash.js`: deeper animation checks used for the FAQ

## Before go-live

- Copy any new files from `public/` (Next.js) into `backend/public/`. The current files are already copied, including `uploads/`.
- Decide how nginx/Coolify routes pages to Laravel instead of Next.js. Today only `/api` goes to Laravel.
- Set `VAPID_PUBLIC_KEY` and `FRONTEND_URL` in `backend/.env` (push alerts, social-share URLs).
- `FRONTEND_PARITY_AUDIT.md` lists other findings, such as the missing `/og-image.png`.
