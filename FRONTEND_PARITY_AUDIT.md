# Frontend Parity Audit: Next.js storefront vs PHP

**Date:** 2026-11-02 · **Type:** read-only audit. No project code was changed; this file is the only output.

This report has two parts, because "the frontend moved to PHP" covers two separate things in this repository:

- **Part A: Next.js → PHP (Blade) storefront.** The conversion the brief asks about. It started today, is **not committed** (untracked files under `backend/`, last edited 14:54), and so far covers **one page, `/faq`**. Part A audits that page in depth and lists everything not yet converted.
- **Part B: the Next.js storefront before vs after the backend moved to PHP.** The API was rewritten in Laravel and the storefront kept running on Next.js. Part B compares the pre-migration copy (`Downloads/lib`) with the current one, because that is what customers use today.

---

# Part A: Next.js → PHP (Blade) storefront

## A0. Scope

| Role | Location |
|---|---|
| **OLD (source of truth)** | Next.js storefront: `app/`, `components/`, `context/`, `hooks/`, `lib/`, `styles/` at commit `8a45720`. The live site runs this version. |
| **NEW (PHP)** | Uncommitted Blade pilot in `backend/`: `routes/web.php` (modified), `app/Http/Controllers/StorePageController.php`, `resources/views/{layouts/store, pages/faq, partials/footer, partials/breadcrumbs, partials/sub-page-header, components/icon}.blade.php`, `resources/icons/*.svg`, `public/css/{globals,App,daivika-blade}.css`, `public/js/{motion,faq}.js`, `public/{favicon.png,logo.png,logo-light.png}`. |

**How it was checked.** Every Blade/PHP/JS/CSS file above was read and compared line by line with its React counterpart. A snapshot of `backend/` (copied during the audit; the working tree was not touched) was built into a Docker image using the committed `vendor/` (Composer downloads fail on this network: TLS interception, `curl error 60`). It ran against an empty local Postgres, seeded with the live site's footer categories and company contact (read with GET from `daivikalife.com`). Then Playwright compared `http://localhost:8090/faq` (Blade) with `http://localhost:3000/faq` (Next.js) at 1440, 768 and 375 px: section-by-section screenshots, animation sampling (including per-frame), hover states, head tags, structured data, accessibility attributes, console errors, and rendering with JavaScript off or delayed.

## A1. Summary

| Severity | Count |
|---|---|
| Critical (blocks go-live) | 2 |
| High | 1 |
| Medium | 2 |
| Low | 4 |
| Improvements in the Blade version | 6 |
| Pre-existing in both | 4 |

**The converted `/faq` page body matches the React page closely.** All six sections (header, breadcrumbs, tabs, FAQ list, help card, footer) have the same computed styles and the same layout at all three widths. The visual diff is 0.6–4 % from text antialiasing and a 1 px offset; the 12 % on the mobile list is mostly React's mobile bottom navigation bar, which Blade does not have. All animations replay with the same values and curves. **The page is not shippable on its own**, though: the Blade layout has no navbar, cart or popups (A-P01), and 21 of 22 storefront routes are not converted yet (A-P02).

## A2. Mapping: routes and components

| Next.js | Blade / PHP | Status |
|---|---|---|
| `/faq`: `app/(store)/faq/page.jsx` | `GET /faq` → `StorePageController@faq` → `pages/faq.blade.php` + `public/js/faq.js` | **Converted** (audited below) |
| `/`, `/products`, `/product/[id]`, `/checkout`, `/login`, `/profile`, `/wishlist`, `/order-tracking`, `/about`, `/contact`, `/privacy-policy`, `/refund-policy`, `/returns-exchanges`, `/shipping-policy`, `/terms-of-service`, `/admin/dashboard`, `/vendor/dashboard`, `/sitemap.xml`, `/robots.txt`, `/uploads/*`, 404 page | none | **Missing in PHP** (21 routes) |
| `app/layout.jsx` (head, fonts, SEO, JSON-LD, `PageProgressBar`, `Providers`) | `layouts/store.blade.php` | Partial (A-P01, A-P03) |
| `app/(store)/layout.jsx` (Navbar, CartDrawer, WelcomeCouponPopup, FloatingCart, ScrollToTop, toasts, mouse glow, Footer) | `layouts/store.blade.php` | Footer only (A-P01, A-P04) |
| `components/Footer.jsx` | `partials/footer.blade.php` + `.dv-footer-*` in `daivika-blade.css` | Converted, matches |
| `components/Breadcrumbs.jsx` | `partials/breadcrumbs.blade.php` | Converted, matches |
| `components/SubPageHeader.jsx` | `partials/sub-page-header.blade.php` + `.subpage-*` in `daivika-blade.css` | Converted, matches |
| `lucide-react` icons | `components/icon.blade.php` + `resources/icons/*.svg` (each holds lucide's markup as JSON) | 7 icons converted (`plus`, `minus`, `chevron-right`, `home`, `mail`, `phone`, `message-square`) |
| `framer-motion` 12.40.0 | `public/js/motion.js` (Motion UMD build, 179 KB, version not stated in the file) | See §A6 |
| `styles/globals.css`, `styles/App.css` | `public/css/globals.css`, `public/css/App.css` | **Byte-identical copies** |
| Every other component (Navbar, CartDrawer, FloatingCart, WelcomeCouponPopup, ProductCard, LoginModal, …) and all contexts (Auth, Cart, Wishlist, Theme, Alert) | none | Missing in PHP |

## A3. Findings

| ID | Page / component | Cat. | Old (Next.js) | New (Blade) | Severity | Notes |
|---|---|---|---|---|---|---|
| A-P01 | Store layout (every page) | A, C, D, E | `app/(store)/layout.jsx:213-227` renders **Navbar** (announcement ticker, logo, search, category strip, account/cart/notification icons, menu, **mobile bottom tab bar**), **CartDrawer**, **WelcomeCouponPopup**, **FloatingCart**, **ScrollToTop** (`:89`), logout and global toasts. `app/layout.jsx:163` adds **PageProgressBar**. `components/Providers.jsx:15-45` adds Auth/Wishlist/Cart/Alert/Theme state, **MetaPixelTracker** and the Razorpay/Cashfree SDKs. | `layouts/store.blade.php:27-33` renders only the page and the footer. Its comment says: "Navbar, cart drawer and popups are converted after the page pilot". | **Critical** | Runtime: header/nav landmarks 3 → 1. The mobile bottom bar (Home / Shop / Cart / Profile) is absent. A visitor on the Blade `/faq` cannot navigate, search, see the cart or log in, and no Meta Pixel page view is sent. Expected for a pilot; it blocks go-live. |
| A-P02 | All other storefront routes | A, D | 22 routes (§A2) | Only `/faq` (`backend/routes/web.php:8`) | **Critical** | Nothing else is converted. Also unknown: how traffic reaches Laravel's `/faq`. In production nginx sends `/` to Next.js and only `/api` to Laravel (README), so the Blade page is not live yet (§A7). |
| A-P03 | `<head>` / SEO | G | `app/layout.jsx:13-51, 53-112, 143-158`: `keywords`, `robots` + `googlebot`, `og:site_name`, `og:url`, absolute `og:image`, Twitter card (`summary_large_image`, title, description, image), shortcut icon, logo preloads. JSON-LD **WebSite** (search box), **Organization**, **LocalBusiness**, **ItemList** (sitelinks). | `layouts/store.blade.php:4-15`: title, description, `og:title`, `og:description`, `og:type`, **relative** `og:image` (`/og-image.png`), theme-color, icons. JSON-LD: only the page's FAQPage and BreadcrumbList. | **High** | Runtime meta list: 19 tags in React vs 7 in Blade. Social cards (WhatsApp, Facebook, X) need an absolute `og:image` URL. Losing the WebSite and Organization schemas affects Google sitelinks and the search box. |
| A-P04 | Background mouse glow (every page) | F | `app/(store)/layout.jsx:72-83` writes `--mouse-x/--mouse-y` on `mousemove`. `styles/globals.css:291-302` (`.app-container::after`) draws a 600 px radial highlight that follows the cursor. | No script sets the variables, so the highlight stays fixed at the centre (`50% / 50%`). | Medium | Runtime: React `6.94% / 11.11%` after moving the mouse to (100,100); Blade `50% / 50%`. |
| A-P05 | FAQ list, first paint | F | Questions load in `useEffect` (`faq/page.jsx:148-179`); the list fades in once (`:229-236`). | The list is server-rendered **without** `opacity:0` (`faq.blade.php:30`), so it shows at full opacity until `motion.js` runs. Then `faq.js:79` animates it from 0, so the list **blinks out and fades back in**. The tabs (`:22`) and help card (`:50`) do start hidden. | Medium | Runtime with the script delayed 2 s: Blade list opacity 1.00 → 1.00 → 1.00 → **0.75** → 1.00; React list absent → 0.15 → 1.00. Noticeable on slow phones. |
| A-P06 | FAQ tabs | A, F | Clicking the **already active** tab changes nothing visually (same `key`, `faq/page.jsx:205-208, 231`) and only reopens the first question. | Re-runs the full fade-out / fade-in (`faq.js:53-74`). | Low | Runtime: React no change; Blade list opacity 0.66 → 0.07 → back to 1. |
| A-P07 | FAQ content source | B | `localStorage.vaugun_faqs`, else built-in defaults (`faq/page.jsx:89-120, 151-156`). | Hard-coded copy of the same six defaults (`StorePageController.php:15-22`). | Low | Visitors see the same six FAQs either way: only the admin dashboard writes `vaugun_faqs`, and only in the admin's own browser (§A8). When FAQs become editable, Blade must read them from settings. |
| A-P08 | Help-card contact details | B | From `localStorage.vaugun_invoice_settings`, refreshed after load (`faq/page.jsx:158-174`). Defaults `support@daivika.in` / `+91 75108 21228` until settings arrive. | From the `invoice_settings` setting on the server (`StorePageController.php:26-31`), same defaults. | Low | Same final output (`support@zodimithra.com`, `+91 8129789123` on live data). Blade has them in the first HTML, so first-time visitors no longer see the defaults flash. Improvement. |
| A-P09 | Motion library | F | `framer-motion` 12.40.0 (bundled). | Separate UMD file `public/js/motion.js`, loaded synchronously at the end of `<body>` on every page (`store.blade.php:34`). | Low | Version cannot be read from the file. Animations matched in testing (§A6). Pin and record the version, and consider `defer`. |

## A4. Missing in PHP

Navbar (with announcement ticker, search, category strip and mobile bottom bar), cart drawer, floating cart, welcome coupon popup, toasts, scroll-to-top, page progress bar, login/cart/wishlist state, Meta Pixel, payment SDKs, global SEO tags and schemas, the mouse-follow glow, and every page except `/faq`.

## A5. Improvements in the Blade version

1. **FAQ content is in the HTML.** With JavaScript off, Blade shows all 6 questions and React shows 0 (runtime). The FAQPage JSON-LD is server-rendered.
2. `aria-expanded` on each question (`faq.blade.php:33`, kept in sync by `faq.js:22`). React has none.
3. `type="button"` on all tabs and question buttons. SVG icons have `aria-hidden="true"` (11/12 vs 7/8 in React).
4. No console errors (React logs Razorpay/Cashfree SDK load failures on a page that does not need them).
5. Hover effects on footer links, social icons and breadcrumbs use CSS classes (`daivika-blade.css:15-23`) instead of inline `onMouseEnter` handlers. Same colours and transforms in testing.
6. Contact details and footer categories come from the server in the first response (A-P08).

## A6. Animation parity (sampled in the browser)

| Animation | React (Next.js) | Blade | Result |
|---|---|---|---|
| Tabs entrance | opacity 0→1, y 20→0, 0.8 s, delay 0.3 s | `faq.js:78` same values | Same curve. Blade starts sooner because there is no hydration wait. |
| Accordion open/close | height 0↔auto + opacity, 0.5 s, ease `[0.23,1,0.32,1]` | `faq.js:26-42` same | Same. Per-frame: React 0→18→43→63 px, Blade 14→30→46→59 px; final 122 px both. No layout jump (checked with `requestAnimationFrame`). |
| Plus/minus icon | rotate 0↔180°, framer default spring | `faq.js:5, 23` spring stiffness 500, damping 25 | Same final matrix `(-1,0,0,-1)`. |
| Open-card colours | bg `#fafafa`, title and icon `--color-primary`, icon bg `#fff` | `faq.js:14-24` | Same (bg sampled `255→253→250`). |
| Tab switch | AnimatePresence `mode="wait"`: exit opacity 0, y −20, 0.5 s; enter from y 20 | `faq.js:63, 73` | Same (Blade 0.81→0.33→0→0.64→0.99). Only difference: A-P06. |
| Help card on scroll | `whileInView` once: opacity 0.3 s ease `[0.25,0.1,0.35,1]`, y spring from 40 | `faq.js:82-86` same | Same, including the small spring overshoot. |
| Footer link / social / breadcrumb hover | colour `#fcd34d`, `translateX(6px)`; social `translateY(-3px)` + glow; breadcrumb `#000` | CSS `:hover` | Same computed values. |
| Mouse-follow glow | follows cursor | static | **A-P04** |

## A7. Needs manual verification (Part A)

1. **How `/faq` will be routed to Laravel** in production (nginx/Coolify), and whether Next.js keeps serving it until the switch.
2. **Motion library version** in `public/js/motion.js`. Match it to the `framer-motion` version (12.40.0) or document the difference.
3. **Real devices:** the A-P05 blink on a slow phone; Safari/iOS rendering of the copied CSS.
4. **The in-progress files changed during the audit** (footer and CSS at 14:54). Re-check them once the pilot is committed.

## A8. Pre-existing issues (in both React and Blade)

| Issue | Evidence |
|---|---|
| The sub-page header subtitle ("Frequently Asked Questions") is `#0a0a0a` text on a `#0a0a0a` background, so it is invisible. | `components/SubPageHeader.jsx:77` + `:25`; copied in `sub-page-header.blade.php:2, 7` (computed colour `rgb(10,10,10)` in both). |
| `/og-image.png` does not exist in `public/` (Next.js) or `backend/public/`. | File check; both pages reference it. |
| Breadcrumb JSON-LD uses `https://daivika.com`, not the live domain `daivikalife.com`. | `components/Breadcrumbs.jsx:26`; `breadcrumbs.blade.php:10`. |
| Admin "FAQ Setup" never saves to the server: the save button is `display:none` and edits go only to the admin's `localStorage`. | `app/(admin)/admin/dashboard/page.jsx:18068-18075`. In React, the FAQ page also outputs two `description`, `og:title` and `og:description` tags (root layout + `useDocumentSEO`). |

---

# Part B: Next.js storefront before vs after the backend moved to PHP

## B0. Scope

In this part, **only the API/backend moved to PHP** (Laravel 12, `backend/`). The storefront is still **Next.js 15 / React 19**, now a separate app that forwards `/api/*` to Laravel through `app/api/[...path]/route.js`. Part B compares the storefront as it was before the migration with the storefront as it is now:

| Role | Location | Notes |
|---|---|---|
| **OLD (source of truth)** | `C:\Users\safeer\Downloads\lib` | Next.js app with its own Node/Prisma API (`app/api/*`). Files dated 2026-10-26, before the first commit in the repo. |
| **NEW** | `C:\Users\safeer\daivikalifefull` @ `8a45720` | Same Next.js frontend; the API is in `backend/` (PHP). Includes the commits from 2026-10-28 and 2026-11-01. |
| Backend (reference) | `daivikalifefull/backend`, `legacy-node-backend/` | Used only to check that every endpoint the frontend calls still exists. |

The live site `daivikalife.com` already runs the **NEW** version (frontend and PHP API). Live and local NEW builds were compared earlier and match.

**About the differences:** the NEW side contains both the migration and the client feature work from 2026-10-28 (`4faf7b8`) and 2026-11-01 (`8f5d6b4`). The old copy is the only pre-migration snapshot available: the repo history starts after the migration, and the Wayback Machine has no captures of the site. So the code alone cannot say which differences came from the migration and which were requested features. Each finding is marked **"Intentional?"** where a commit message or code comment describes it as a deliberate change. Every such item still needs a yes/no from whoever owns the client relationship.

---

## 1. Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 5 |
| Medium | 12 |
| Low | 11 |
| Intentional improvements (listed separately, §5) | 9 |
| Pre-existing issues present in both versions (§6) | 4 |

**Nothing is broken or missing in a way that stops a guest from browsing, adding to cart or reaching payment.** The two versions are pixel-identical (≤ 0.1 % at desktop) on 12 of the 19 routes checked, apart from the footer credit line. The routes with real differences are the products list, product details, login (also the redirect target of `/profile`, `/admin/dashboard` and `/vendor/dashboard`) and checkout.

### Top 10 issues

1. **F01 (High):** the products page no longer offers the **Collection (gender) filter**. The dropdown is hidden by CSS and the new sidebar has no gender option.
2. **F02 (High):** **sign-up by email + password was removed.** Registering now needs a mobile number and an SMS OTP, on the login page, the login popup and at checkout.
3. **F03 (High):** the **welcome coupon popup** used to come back for guests every 2 minutes and on every visit. Now it shows **once per browser, ever**, and it also shows to logged-in customers.
4. **F04 (High):** products with **several variants but no inventory row** used to default to 50 in stock (buyable). They now default to **0, showing "Out of Stock"** and a "Notify me" form.
5. **F05 (High):** the **checkout login/register box** used to open on *Register* (code comment: "register cheyyunne anu best"). It now opens on *Login*, and the Register/Sign In tab switcher and the show-password button were removed.
6. **F06 (Medium):** the login page's **0.85 s sliding-panel animation** between Login and Register no longer runs (`isLogin` is now a constant).
7. **F07 (Medium):** the **"Full Name" expand animations** on the login page (0.45 s) and login popup (0.3 s) were removed.
8. **F10 (Medium):** the **products page layout changed** from a row of 4 dropdowns above a 4-column grid to a left filter sidebar beside a 3-column grid (desktop), with a "Filters" drawer on phones.
9. **F13 (Medium):** the **footer credit** changed from "Powered by ThriveMinds Technologies" (plain text) to "Powered by ZodiMithra" (link). The **Instagram link** changed from `instagram.com/daivika__` to `instagram.com/zodimithra`.
10. **F12 (Medium):** **product pages show new content blocks** (short description; Benefits, Astrology and How to Wear cards). The page is about 1,000 px taller, and the meta description now comes from `shortDescription`.

---

## 2. Inventory and mapping (Phase 1)

### 2.1 Pages / routes

All 22 page routes exist on both sides with the same URL. **No page was added or removed.**

| URL | Old file | New file | Status |
|---|---|---|---|
| `/` | `app/(store)/page.jsx` | same | Changed (3 lines: trending-tab matching) |
| `/products` | `app/(store)/products/page.jsx` + `ProductsClient.jsx` | same | **Changed (236 lines)** |
| `/product/[id]` | `app/(store)/product/[id]/page.jsx` + `ProductDetailsClient.jsx` | same | **Changed (67 lines)** in `ProductDetailsClient.jsx`; `page.jsx` whitespace only |
| `/checkout` | `app/(store)/checkout/page.jsx` | same | **Changed (382 lines)** |
| `/login` | `app/(auth)/login/page.jsx` | same | **Changed (352 lines)** |
| `/profile` | `app/(store)/profile/page.jsx` | same | **Changed (534 lines)** |
| `/order-tracking` | `app/(store)/order-tracking/page.jsx` | same | Changed (5 lines) |
| `/admin/dashboard` | `app/(admin)/admin/dashboard/page.jsx` | same | **Changed (897 lines, mostly additions)** |
| `/vendor/dashboard` | `app/(vendor)/vendor/dashboard/page.jsx` | same | Changed (8 lines) |
| `/about`, `/contact`, `/faq`, `/wishlist`, `/privacy-policy`, `/refund-policy`, `/returns-exchanges`, `/shipping-policy`, `/terms-of-service` | `app/(store)/*/page.jsx` | same | Identical or whitespace only |
| `/sitemap.xml` | `app/sitemap.js` | same | Changed (reads from the API instead of the DB) |
| `/robots.txt` | `app/robots.js` | same | Whitespace only |
| `/uploads/*` | `app/uploads/[[...path]]/route.js` | same | Whitespace only |
| `/api/*` | `app/api/<module>/[[...path]]/route.js` (17 Node handlers) | `app/api/[...path]/route.js` (proxy to Laravel) | Replaced by design |
| Layouts | `app/layout.jsx`, `app/(store)/layout.jsx`, `app/(admin)/layout.jsx`, `app/(auth)/layout.jsx`, `app/(vendor)/layout.jsx` | same | Identical or whitespace only |

### 2.2 Components, hooks, context, lib

| Group | Old | New | Notes |
|---|---|---|---|
| `components/` | 39 files | 42 files | 3 new: `NotifyMeForm.jsx`, `ProductFilterSidebar.jsx`, `admin/AdminUserModals.jsx`. 10 changed (see §3). The rest are identical or whitespace only. |
| `context/` | 5 | 5 | `AuthContext.jsx` changed (cross-tab sync, OTP purposes). Others identical. |
| `hooks/` | 2 | 4 | New: `useMobileAuth.js`, `usePincodeLookup.js`. |
| `lib/` (frontend) | 10 | 13 | New: `number-to-words.js`, `orders-excel.js`, `product-categories.js`. Changed: `help-content.js`, `home-sections.js`. |
| `lib/` (server-only) | 20 | 0 | Moved to `legacy-node-backend/lib/`. Verified that no page or component imports them (the NEW build passes). |
| `styles/` | 2 | 2 | Identical or whitespace only. |

### 2.3 Assets and libraries

| Item | Result |
|---|---|
| `public/` + `assets/` | Same file list on both sides (0 added, 0 removed). 1 file differs only in whitespace (`public/uploads/samples_cloudinary-logo-vector.svg`). |
| Fonts / icons / favicon | Same: loaded from the identical layout files. |
| `framer-motion` ^12.38.0, `gsap` ^3.15.0, `lucide-react`, `recharts`, `jspdf`, `exceljs`, `react-router-dom` | Same versions. `gsap` is listed but not imported anywhere, in both versions. |
| Removed packages | `@prisma/client`, `prisma`, `bcryptjs`, `jimp`, `jsonwebtoken`, `nodemailer`, `razorpay`, `sharp`, `web-push`: all server-only, now handled in PHP. |
| `next.config.js` | NEW adds `daivikalife.com` and `*.daivikalife.com` to allowed image hosts. |
| `package.json` scripts | `start` changed from `node ./scripts/start-server.js` to `next start`; `prisma generate` removed from `build`/`postinstall`. |
| Third-party scripts / CDNs | No change (Razorpay checkout script, Meta Pixel, Font Awesome load the same way). |
| `localStorage` keys | The same 42 keys, plus `daivika_coupon_popup_seen` (F03). |
| Image sizes | `lib/image-optimizer.js` asks for widths `[160, 320, 480, 640, 960, 1280]`. The PHP `ImageController::WIDTHS` uses the same list. |

---

## 3. Findings

Paths are relative to each project root. `old/` = `C:\Users\safeer\Downloads\lib`, `new/` = `C:\Users\safeer\daivikalifefull`. Categories: A functionality, B data/API, C auth/session/state, D routing, E styles, F animations, G other.

| ID | Page / Component | Cat. | Old behaviour | New behaviour | Severity | Notes |
|---|---|---|---|---|---|---|
| F01 | Products list | A, E | A visible "Collection" (gender) dropdown sits beside Category, Size and Sort. `old/app/(store)/products/ProductsClient.jsx:719` | The dropdown is still in the markup (`new/…/ProductsClient.jsx:807`) but hidden by `display:none` (`:1429`). `components/ProductFilterSidebar.jsx` has no gender/collection section. | **High** | Runtime: gender dropdown visible 1 → 0 on desktop and mobile. The filter still works through the URL (`?collection=`, `:327`), so links from the navbar still filter. Shoppers on `/products` just can't change it. Intentional? Category and size moved into the sidebar; gender did not. |
| F02 | Login page, login popup, checkout login box | A, C | Register with **name + email or mobile + password**, no OTP. `old/app/(auth)/login/page.jsx:111-160` (signup call `:146`), `old/components/LoginModal.jsx:53-76` (`:74`), `old/app/(store)/checkout/page.jsx:3403-3420` (`:3415`) | Register needs a **mobile number → SMS OTP → name + password + confirm**. Email sign-up is gone. `new/hooks/useMobileAuth.js:54-110`, used by `new/app/(auth)/login/page.jsx:19`, `new/components/LoginModal.jsx:43`, `new/app/(store)/checkout/page.jsx:3478` | **High** | Intentional? (`useMobileAuth.js:6-11`; the commit says "customers can log in with OTP".) Sign-up now depends on the SMS provider (`SMS_*` in `backend/.env`). If SMS fails, no one can register. |
| F03 | Welcome coupon popup (all store pages) | A, C | Guests only. Opens after `delaySeconds`, re-opens every **2 min** while browsing, and opens again on every new page load. Never shown to logged-in users. `old/components/WelcomeCouponPopup.jsx:9, 108, 113-119, 157` | Opens **once per browser, permanently** (`localStorage.daivika_coupon_popup_seen`). **Also shown to logged-in users**, with different copy. `new/components/WelcomeCouponPopup.jsx:11-16, 112, 334` | **High** | Runtime on `/about`: old visit + reload = shown, shown; new = shown, not shown. Fewer coupon impressions for returning guests. Intentional? (code comment says so) |
| F04 | Product card, Amazon-style card, product details | A, B | Variant with no matching inventory row: stock defaults to **50** (buyable). `old/components/ProductCard.jsx:266`, `old/components/AmazonProductCard.jsx:81`, `old/app/(store)/product/[id]/ProductDetailsClient.jsx:399` | If the product has **more than one** inventory row, a missing variant row means **0**: "Out of Stock" and a Notify-me form. A single row uses its stock; no rows still means 50. `new/components/ProductCard.jsx:266`, `new/components/AmazonProductCard.jsx:81`, `new/…/ProductDetailsClient.jsx:438, 1031, 2627, 2633` | **High** | Intentional ("Sold-out variants block buying; new variants start at 0 stock", commit `8f5d6b4`). Products whose variants were never given a stock row would become unbuyable. **Needs a data check** (§7). |
| F05 | Checkout → login/register box (guest who chooses to sign in) | A, E | Opens on **Register** ("register cheyyunne anu best", `old/…/checkout/page.jsx:3382`). Pill **tab switcher** Register / Sign In (`:3694`). **Show-password** eye button (`:3805`). Buttons "Register & Checkout" / "Sign In & Checkout" (`:3820`). | Opens on **Login** (`useMobileAuth` defaults to `'login'`, `new/hooks/useMobileAuth.js:14`). No tab switcher, only a "Create Account / Log In" link at the bottom. No show-password button. Buttons "Log In" / "Send OTP" / "Verify & Create Account". `new/…/checkout/page.jsx:3477-3800` | **High** | This reverses an explicit earlier product decision (the old code comment). Intentional? |
| F06 | Login page | F | Switching Login ⇄ Create Account slides the image panel and the form panel across (`transform … 0.85s cubic-bezier(0.76,0,0.24,1)`) and moves the ambient glow (1.2 s). `old/app/(auth)/login/page.jsx:11, 216-220, 411-416, 455-463, 683` | `const isLogin = true` (`new/…/login/page.jsx:14`), so the `state-signup` classes (`:591, 618, 620`) are never applied. Panels stay still and only a 150 ms fade plays (`switchMode`). | Medium | Runtime: panel x-position old 0 → 135 → 605 px, new 0 → 0 → 0. The old slide CSS is still in the file but unused. |
| F07 | Login page, login popup | F | "Full Name" field opens with a height and opacity animation: page 0.45 s (`old/…/login/page.jsx:750-756`), popup 0.3 s `AnimatePresence` (`old/components/LoginModal.jsx:222-230`). | Name field appears without animation, only after the OTP is sent (`new/…/login/page.jsx:715`, `new/components/LoginModal.jsx:254`). | Medium | Error box animations (scale-in) are unchanged. |
| F08 | Login page, popup, checkout login box | A, G | Field label "Email or Mobile Number", `type=text`. `old/…/login/page.jsx:774-779`, `old/components/LoginModal.jsx:249-253` | Label "Mobile Number" with phone keypad (`inputMode=tel`). An email address still logs in (`new/hooks/useMobileAuth.js:81`), but the screen does not say so. `new/…/login/page.jsx:669` | Medium | Customers or admins who signed up with an email will think email login is gone. Mobile keyboards make typing "@" harder. |
| F09 | Login page | A, G | Header copy "Please enter your details to log in to your account." Submit "Sign In"; register submit "Join Daivika". One "Login with OTP" toggle. | Copy "Log in with your mobile number and password." Login/Register tabs. Links "Log in with OTP" and **"Forgot password?"** (new reset-by-OTP flow). Submit "Log In". | Medium | New capability (password reset). Copy and labels differ. |
| F10 | Products list | E | Row of 4 dropdowns (Collection, Category, Size, Sort) above a full-width grid: 4 cards per row at 1440 px. `old/…/ProductsClient.jsx:719-1000, 1315` | Sort only, above the grid. Left **sticky filter sidebar** (260 px): category, sub-category, size, price ranges and custom range, discount, rating, in-stock, each with counts. Grid shows 3 per row at 1440 px. Phones get a "Filters" button and slide-in drawer. `new/…/ProductsClient.jsx:1116-1125, 1211-1218, 1450-1470`; `new/components/ProductFilterSidebar.jsx` | Medium | Visible layout change on every products view. Runtime: desktop page 9,314 → 12,072 px tall. Intentional? |
| F11 | Products list, category options | A | Categories sorted **A–Z**. `old/…/ProductsClient.jsx:493` | Sorted in the **admin-defined order**, unsaved ones last A–Z. `new/…/ProductsClient.jsx:510-517` | Medium | The new admin "Categories" ordering drives this (`/api/categories/order`). |
| F12 | Product details | A, G | Description only. Meta description = `product.description` (`old/…/ProductDetailsClient.jsx:761`). | Adds a **short description** under the title (`:1666-1671`), three coloured cards **Benefits & Key Features / Astrology & Spiritual Significance / How to Wear** (`:23-60, 2805-2808`), and a sub-category breadcrumb (`:1358`). Meta description = `shortDescription` first (`:800`). | Medium | Runtime: product page 2,285 → 3,260 px (desktop) and 4,222 → 6,149 px (mobile). New content, no animation on the cards. On live data the old meta description included a stray trailing "son.", which the new one avoids. |
| F13 | Footer (every page) | G, E | "© 2026 Daivika \| Powered by **ThriveMinds Technologies**" (plain text). Instagram → `instagram.com/daivika__…`. `old/components/Footer.jsx:191, 402` | "Powered by **ZodiMithra**", linked to `zodimithra.com`. Instagram → `instagram.com/zodimithra/`. `new/components/Footer.jsx:191, 402` | Medium | The only difference on 12 static routes. On phones the footer is 20 px shorter (shorter credit line). Confirm with the client. |
| F14 | Checkout address form | A, E | Order: Street → State → District → City → PIN. PIN is a plain field. `old/…/checkout/page.jsx:2026-2087` (City & PIN grid `:2057`) | Order: Street → **PIN → City** → State → District. A 6-digit PIN looks up state, district and city via `/api/public/pincode/:pin` and shows "Finding your location…" / "PIN code not found…". On ≤ 768 px all inputs are 16 px (stops iPhone zoom). `new/…/checkout/page.jsx:333-370, 1582-1585, 2112-2150` | Medium | Runtime confirms the field order changed on desktop and mobile. |
| F15 | Profile → Addresses | A, E | Add/Edit form had City / State / PIN in **3 columns**, then District. The form was rendered **twice** (top `:1871` and bottom `:2312`), so it appeared in two places. `old/app/(store)/profile/page.jsx:2081, 2312` | One form (top, same slide-in animation, `new/…/profile/page.jsx:2000`). Location fields in 2×2: PIN + City, State + District, with PIN auto-fill. `new/…/profile/page.jsx:195-320` | Medium | Removing the duplicate fixes an old bug. Layout change needs a logged-in check. |
| F16 | Profile, order tracking, invoice PDF, vendor dashboard, admin shipping label | A, G | Orders identified by internal `_id` (e.g. `#cmv…`). `old/…/order-tracking/page.jsx:300, 460`; `old/…/profile/page.jsx:1346`; `old/…/checkout/page.jsx:1372` | Shows `orderNumber` (prefix + sequence, e.g. `DVK…`) when present, falling back to `_id`. Tracking search also accepts the order number. `new/…/order-tracking/page.jsx:102, 301, 461`; `new/…/profile/page.jsx:1475`; `new/…/checkout/page.jsx:1454`; `new/…/vendor/dashboard/page.jsx:50` | Medium | Old orders without `orderNumber` keep their old IDs. |
| F17 | Admin → shipping label print | E | Label `max-width: 680px`, `@page size: auto; margin: 8mm`, centred "CUSTOMER ID" header. `old/…/admin/dashboard/page.jsx:2609-2690` | Fixed **6 in × 4 in** label (`@page size: 6in 4in; margin:0`), smaller fonts, Customer ID and Order No on one line. `new/…/admin/dashboard/page.jsx:2866-2975` | Medium | Intentional ("Shipping labels print at 6 x 4 inch"). Test on the real label printer. |
| F18 | Home → trending tabs, theme sections | A | Product matches a tab only by its main `category`. `old/app/(store)/page.jsx:667` | Also matches the product's `extraCategories` (`new/app/(store)/page.jsx:668`, `new/lib/home-sections.js:76-77`). | Low | Some products appear in more tabs. |
| F19 | Checkout → COD | A, B | If the server sends no `cod_settings`, the last cached value stays in effect. | Falls back to `{enabled:true, advancePercent:30}` and clears the cache (`new/…/checkout/page.jsx:700-703`). If COD is switched off while selected, the page switches to Razorpay (`:728-731`). | Low | |
| F20 | Checkout prefill | A, C | First/last name from `user.name` (2 words only). Phone empty. | Last name keeps all words after the first. Phone pre-filled from the account. On a new device, the latest order's address is used (`new/…/checkout/page.jsx:316-322, 404-416`). | Low | Calls `GET /api/orders` with the token. |
| F21 | Navbar, ProtectedRoute, login redirect | C, D | Admin menu and `/admin/*` for `role=admin` only. | Also for `role=staff` (sub-users), with per-section permissions. `new/components/Navbar.jsx:2701, 3335`; `new/components/ProtectedRoute.jsx:49`; `new/…/login/page.jsx:38` | Low | New role. |
| F22 | Auth (all pages) | C | Each tab keeps its own login state. | A login or logout in another tab is applied in every tab (`new/context/AuthContext.jsx:26-40`). | Low | |
| F23 | Product details, Buy Now | A | Always "Buy Now". | "Out of Stock" when the selected variant has stock 0, plus a **Notify me** form posting to `/api/public/stock-notify` (`new/…/ProductDetailsClient.jsx:2627-2640`). | Low | Linked to F04. |
| F24 | Admin → vendor form | A | Address and PIN after state/district. Email first, phone second. Hint "logs in with the email or phone". | PIN first, auto-fills state and district. "Mobile number \*" required, "Email (optional)". Hint "logs in with this mobile number and password". `new/components/admin/AdminVendorsPanel.jsx:38-108` | Low | |
| F25 | Sitemap | B, G | Built from the database (Prisma models). | Built from `GET {BACKEND_URL}/api/categories` and `/api/products`. Static pages only if the API is down (`new/app/sitemap.js:1-17`). | Low | Needs `BACKEND_URL` at runtime. |
| F26 | `data/*.json` | G | Offline fallback data for the old Node API. Real Meta Pixel id `1044941891490514`. | Different snapshot. Pixel id is a placeholder `123456789012345`. | Low | **Not used** by the new frontend or the PHP backend (grep shows no references). Pixel settings come from the database. Informational only. |
| F27 | `package.json` / deployment | G | `npm start` runs `scripts/start-server.js`. `npm run build` runs `prisma generate`. | `next start` / `next build`. | Low | Any server or hosting script that still calls the old start script must be updated. |
| F28 | Login popup after success | C | Popup login did not set `show_notification_prompt`. | Popup, page and checkout login all set it (`new/hooks/useMobileAuth.js:74`), so the push-notification prompt can appear after a popup login. | Low | |

---

## 4. Missing in new

Things the old frontend had that are no longer available to users:

1. **Collection (gender) selector on `/products`** (F01).
2. **Email + password sign-up** (F02).
3. **Repeating guest coupon popup**: every 2 minutes and on every visit (F03).
4. **Login ⇄ Register sliding-panel animation** on `/login` (F06).
5. **"Full Name" expand animations** on the login page and popup (F07).
6. **Register-first checkout login box**, its pill tab switcher and the show-password button (F05).
7. **"Email or Mobile Number" wording** on all login forms (F08).
8. **Plain "Powered by ThriveMinds Technologies" credit and the `daivika__` Instagram link** (F13).
9. **A–Z category order** on `/products` (F11).
10. Server-only `lib/*` and the Node API routes: moved to `legacy-node-backend/` and replaced by Laravel. Every endpoint the frontend calls is still served (§7.2).

---

## 5. New in the current version

**Intentional improvements** (commit messages or code comments describe them):

1. **Checkout total no longer adds the free gift.** With one ₹13,500 item plus the "FREE" ₹399 Anti-Fog Spray gift, the old checkout charged **₹13,899**; the new one charges **₹13,500** (runtime, desktop and mobile). The old version was overcharging. Code: `new/…/checkout/page.jsx:78, 94, 198`.
2. Removed products are taken out of the cart, with a message, when the order is created (`new/…/checkout/page.jsx:1246-1252`).
3. The Razorpay key from the server now wins over the cached key (`:1275`).
4. "Forgot password?" via OTP, and "Log in with OTP" on every login form (F09).
5. PIN-code auto-fill at checkout, in the profile and in the admin vendor form (F14, F15, F24).
6. Product filter sidebar and mobile filter drawer (F10).
7. Product information cards, short description and sub-category breadcrumbs (F12).
8. Back-in-stock "Notify me" form (F23).
9. Duplicate address form in the profile removed (F15).

**Admin and vendor additions** (logged-in only, not exercised in the browser): sub-users with per-section permissions (`components/admin/AdminUserModals.jsx`). Vendor / Main-Store tagging required on products. Extra categories per product. Product detail text fields (benefits, astrology, how to wear). Sub-category editor and category ordering. Order sort and date, city, state and price filters. Excel export (`lib/orders-excel.js`) for admin and vendor. Order number prefix and sequence. 6×4 in shipping labels (F17). COD and coupon settings saved to the server first, rolled back on failure (`new/…/admin/dashboard/page.jsx:2499-2530`). Customer details with order history. Updated help-centre text (`lib/help-content.js`).

---

## 6. Pre-existing issues (same in both versions, not regressions)

| Issue | Evidence |
|---|---|
| The product page asks for a free-gift product `prod_daivika_anti_fog_spray_001` and image `cmti78aoh0005r332hpz1762j`, both of which return **404**. Both versions show the same 3 failed requests. | Runtime `failed` lists, identical. Hard-coded default in `ProductDetailsClient.jsx:166` and the admin dashboard defaults. |
| Coupon text on product cards ("Get it for ₹… with CODE") can differ between loads: cards render before `/api/public/settings` saves the coupon list to `localStorage`, and are not told to refresh. | `components/ProductCard.jsx:169-201`; `components/Navbar.jsx:576-578` writes the key without dispatching `vaugun_coupons_updated`. |
| The rate-limit IP is the **first** `X-Forwarded-For` value, which the client can set. Old: `lib/rate-limit.js:10-11`. New: `backend/app/Support/Api.php:42-45`, fed by `app/api/[...path]/route.js:23-24`. | Same behaviour as before. Affects OTP and login throttling only if nginx passes the client's header through. |
| `gsap` is a dependency but never imported. | Both `package.json`; no `from 'gsap'` anywhere. |

---

## 7. Needs manual verification

1. **Logged-in screens** (customer profile, my orders, logged-in wishlist, admin dashboard, vendor dashboard). Code-reviewed only: rendering them needs real accounts, and logging in from the test build would act on live data. Particular checks: F15 address layout, F16 order numbers, F17 label print, F21 staff access.
2. **F04 stock data.** Run on the database: products with more than one inventory row where some variant has **no** row. Those variants now show "Out of Stock".
3. **SMS OTP end to end** (register, OTP login, forgot password) on the live SMS provider. F02 makes sign-up depend on it.
4. **Email-only accounts.** Confirm that existing customers or admins who registered with an email can still log in by typing the email into the "Mobile Number" field (code says yes, `useMobileAuth.js:81`), and decide whether the label should say so.
5. **Payment** (Razorpay test mode: create order, pay, verify, webhook). The runtime test blocked Razorpay and all non-GET API calls on purpose.
6. **API response shapes.** All 74 frontend endpoint paths exist in the PHP controllers (§7.2), and the guest pages render identically with live PHP data. Field-by-field response parity for authenticated endpoints (admin, vendor, orders) was not compared.
7. **Intent.** F01–F03, F05–F08, F10, F11 and F13 change what users see. Confirm each was requested; otherwise list it for restoring.
8. **Shipping label** on the physical printer (F17).

### 7.1 How the runtime check was done (Phase 3)

- The **old frontend** was copied to a scratch folder **without** its `.env` files or Node API (no database connection), given the new `/api` proxy, built and served on port 3001. The **new frontend** was served on port 3000. Both pointed at the live PHP API, so both showed the same data.
- **Playwright (Chromium)**: 19 routes × 3 widths (1440, 768, 375) × 2 versions. Pages were scrolled to trigger in-view animations, then full-page screenshots were taken and pixel-diffed, and visible text, DOM class structure, animated-element counts, SEO tags, images without `alt`, console errors and failed requests were compared.
- **Click flows**: login → Create Account transition; welcome popup on first visit and after reload; products filter controls (desktop and mobile); add to cart → checkout (desktop and mobile).
- **Safety**: every non-GET `/api` request was aborted, including Meta Pixel events, so nothing was written to the live store. Analytics and Razorpay scripts were blocked; that is why both versions log the same "Razorpay SDK failed to load" error.
- **Results**: console errors and failed requests are **identical** in both versions on every route. Images without `alt` are the same count on every route. `/does-not-exist` returns 404 in both. Page titles are unchanged; only the product meta description differs (F12).

### 7.2 Frontend → API endpoint coverage

All **74** distinct API paths called by the new frontend (`fetch`/`${API_BASE_URL}` in `app/`, `components/`, `context/`, `hooks/`, `lib/`) map to a PHP controller that handles that sub-path (`backend/routes/api.php`; `backend/app/Http/Controllers/Api/*`). Paths the new frontend calls that the old one did not: `/categories/order`, `/public/pincode/:pin`, `/public/stock-notify`, `/vendors`, `/vendors/:id/products`, `/vendors/product-map`. The old frontend called no path that the new one dropped.

### 7.3 Security notes

- `dangerouslySetInnerHTML`: 10 uses in 7 files in **both** versions. None added.
- No PHP-rendered HTML in the frontend, so there are no new unescaped-output or CSRF-token surfaces. API auth is still the Bearer token in `localStorage` (`vaugun_token`), as before.
- See §6 for the `X-Forwarded-For` note.

---

## 8. Coverage checklist

Every page, component, hook, context and frontend `lib` file on either side. "Identical" = byte-identical; "Whitespace only" = differs only in spaces or line endings; "Changed (n lines)" = n changed lines ignoring whitespace. **All rows were audited.**

| File | Status |
|---|---|
| `app/(admin)/admin/dashboard/page.jsx` | Changed (897 lines) |
| `app/(admin)/layout.jsx` | Identical |
| `app/(auth)/login/page.jsx` | Changed (352 lines) |
| `app/(store)/about/page.jsx` | Whitespace only |
| `app/(store)/checkout/page.jsx` | Changed (382 lines) |
| `app/(store)/contact/page.jsx` | Identical |
| `app/(store)/faq/page.jsx` | Identical |
| `app/(store)/layout.jsx` | Identical |
| `app/(store)/loading.jsx` | Identical |
| `app/(store)/order-tracking/page.jsx` | Changed (5 lines) |
| `app/(store)/page.jsx` | Changed (3 lines) |
| `app/(store)/privacy-policy/page.jsx` | Identical |
| `app/(store)/product/[id]/ProductDetailsClient.jsx` | Changed (67 lines) |
| `app/(store)/product/[id]/page.jsx` | Whitespace only |
| `app/(store)/products/ProductsClient.jsx` | Changed (236 lines) |
| `app/(store)/products/page.jsx` | Whitespace only |
| `app/(store)/profile/page.jsx` | Changed (534 lines) |
| `app/(store)/refund-policy/page.jsx` | Identical |
| `app/(store)/returns-exchanges/page.jsx` | Identical |
| `app/(store)/shipping-policy/page.jsx` | Identical |
| `app/(store)/terms-of-service/page.jsx` | Identical |
| `app/(store)/wishlist/page.jsx` | Identical |
| `app/(vendor)/layout.jsx` | Whitespace only |
| `app/(vendor)/vendor/dashboard/page.jsx` | Changed (8 lines) |
| `app/layout.jsx` | Identical |
| `app/loading.jsx` | Identical |
| `app/robots.js` | Whitespace only |
| `app/sitemap.js` | Changed (47 lines) |
| `app/uploads/[[...path]]/route.js` | Whitespace only |
| `components/AmazonProductCard.jsx` | Changed (6 lines) |
| `components/AnimatedTitle.jsx` | Identical |
| `components/AnnouncementBar.jsx` | Identical |
| `components/Breadcrumbs.jsx` | Whitespace only |
| `components/CartDrawer.jsx` | Whitespace only |
| `components/ErrorBoundary.jsx` | Identical |
| `components/FloatingCart.jsx` | Whitespace only |
| `components/Footer.jsx` | Changed (4 lines) |
| `components/GenderSelectionModal.jsx` | Whitespace only |
| `components/LoginModal.jsx` | Changed (206 lines) |
| `components/MetaAdsDashboardPanel.jsx` | Whitespace only |
| `components/MetaPixelTracker.jsx` | Whitespace only |
| `components/Navbar.jsx` | Changed (4 lines) |
| `components/Navigate.jsx` | Identical |
| `components/NotifyMeForm.jsx` | New |
| `components/PageLoader.jsx` | Identical |
| `components/PageProgressBar.jsx` | Identical |
| `components/PremiumHero.css` | Identical |
| `components/PremiumHero.jsx` | Whitespace only |
| `components/ProductCard.jsx` | Changed (2 lines) |
| `components/ProductFilterSidebar.jsx` | New |
| `components/ProtectedRoute.jsx` | Changed (2 lines) |
| `components/Providers.jsx` | Identical |
| `components/ScrollToTop.jsx` | Identical |
| `components/SearchableSelect.jsx` | Whitespace only |
| `components/SubPageHeader.jsx` | Identical |
| `components/WelcomeCouponPopup.jsx` | Changed (28 lines) |
| `components/WhatsAppAssist.jsx` | Identical |
| `components/admin/AdminOverview.jsx` | Whitespace only |
| `components/admin/AdminUserModals.jsx` | New |
| `components/admin/AdminVendorsPanel.jsx` | Changed (30 lines) |
| `components/admin/SacredStoriesEditor.jsx` | Whitespace only |
| `components/help/GuidedTour.jsx` | Whitespace only |
| `components/help/HelpCenter.jsx` | Whitespace only |
| `components/help/RichText.jsx` | Whitespace only |
| `components/home/SacredSection.jsx` | Whitespace only |
| `components/loaderLogo.js` | Whitespace only |
| `components/reports/ComparisonPanel.jsx` | Whitespace only |
| `components/reports/ReportUI.jsx` | Whitespace only |
| `components/reports/ReportsPanel.jsx` | Whitespace only |
| `components/vendor/VendorStockManager.jsx` | Whitespace only |
| `components/vendor/VendorUI.jsx` | Whitespace only |
| `context/AlertContext.jsx` | Identical |
| `context/AuthContext.jsx` | Changed (29 lines) |
| `context/CartContext.jsx` | Identical |
| `context/ThemeContext.jsx` | Whitespace only |
| `context/WishlistContext.jsx` | Identical |
| `hooks/useDocumentSEO.js` | Identical |
| `hooks/useMobileAuth.js` | New |
| `hooks/usePincodeLookup.js` | New |
| `hooks/useRouterShim.js` | Identical |
| `lib/admin-notifier.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/api-middleware.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/cloudinary-api.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/cloudinary-upload.js` | Whitespace only |
| `lib/cloudinary.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/company-details.js` | Whitespace only |
| `lib/db.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/ensure-tables.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/events.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/file-storage.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/help-content.js` | Changed (4 lines) |
| `lib/home-sections.js` | Changed (2 lines) |
| `lib/image-cache.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/image-optimizer.js` | Whitespace only |
| `lib/image-upload.js` | Whitespace only |
| `lib/india-districts.js` | Whitespace only |
| `lib/meta-pixel.js` | Whitespace only |
| `lib/number-to-words.js` | New |
| `lib/order-payment.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/order-pricing.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/orders-excel.js` | New |
| `lib/prisma-adapter.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/prisma.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/product-categories.js` | New |
| `lib/rate-limit.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/report-export.js` | Whitespace only |
| `lib/report-tables.js` | Whitespace only |
| `lib/reports.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/security-config.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/sms-otp.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/vendor-routing.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/vendor-store.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `lib/web-push-helper.js` | Moved to `legacy-node-backend/lib` (server-only) |
| `styles/App.css` | Identical |
| `styles/globals.css` | Identical |

