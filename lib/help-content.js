// Help Center and guided-tour content for the admin and vendor dashboards.
// Text supports **bold**. `tab` is the dashboard tab a guide (or tour step) belongs to.

export const HELP_CATEGORIES = {
  admin: [
    { id: 'start', label: 'Getting started' },
    { id: 'sales', label: 'Orders & sales' },
    { id: 'catalog', label: 'Products & stock' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'website', label: 'Website content' },
    { id: 'settings', label: 'Settings' },
  ],
  vendor: [
    { id: 'start', label: 'Getting started' },
    { id: 'sales', label: 'Orders' },
    { id: 'catalog', label: 'Products & stock' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Account' },
  ],
};

// ── Admin guides ───────────────────────────────────────────

const ADMIN_GUIDES = [
  {
    id: 'admin-dashboard', tab: 'overview', category: 'start', icon: 'LayoutDashboard', minutes: 2,
    title: 'Your dashboard at a glance',
    summary: "Today's sales, trends, best sellers and everything that needs your attention, live.",
    steps: [
      'The wine banner at the top shows **today\'s sales, orders and items** with the change against the same time before.',
      'Use the period buttons (**Today, 7 days, 30 days, This month, This year**) to change every card and chart below.',
      'The four cards show **Revenue, Orders, Average order value and Customers**. The small line inside shows the trend.',
      '**Needs your attention** lists orders to process, low-stock products, unread enquiries and vendor reports to review. Tap any row to jump there.',
      'Scroll down for **best sellers, top states, latest orders, sales by category, most viewed products, newest customers** and online vs COD split.',
      'Press **Reports & export** for full reports with Excel / PDF downloads.',
    ],
    tips: ['Figures refresh by themselves every minute, so you can keep the dashboard open on a spare screen.', 'Only paid orders (and COD orders with the advance paid) are counted. Abandoned checkouts never appear.'],
  },
  {
    id: 'admin-orders', tab: 'orders', category: 'sales', icon: 'ShoppingCart', minutes: 4,
    title: 'Process orders from payment to delivery',
    summary: 'Find an order, move it through Packed → Shipped → Delivered and print invoices.',
    steps: [
      'Open **Orders List**. The badge on the menu shows how many orders are waiting to be processed.',
      'Search by **customer name, order ID or city**, or use the status filter.',
      'Open an order with **Details** to see items, sizes, address, phone and payment.',
      'Move it forward with the status buttons: **Processing → Packed → Shipped → Delivered**. The customer gets a notification at each step.',
      'Print the invoice or shipping label from the order details.',
      'To print many invoices at once, use **Bulk Invoice Dispatch** with an invoice-number range or date range.',
    ],
    tips: [
      '**Partially Paid** means a COD order where the customer paid the online advance. Collect the remaining amount on delivery (shown on the order).',
      'If vendors are switched on, the order shows which store is fulfilling it. See "Vendors & order routing".',
    ],
    warnings: ['Orders that were never paid stay hidden on purpose. If a customer says they paid but you cannot see the order, check the payment in your Razorpay dashboard first.'],
  },
  {
    id: 'admin-products', tab: 'products', category: 'catalog', icon: 'ShoppingBag', minutes: 6,
    title: 'Add and edit products',
    summary: 'Create a product with prices, images, variants, colours and bulk offers.',
    steps: [
      'Open **Products** and press **Register New Product**.',
      'Fill **Product Name** and **Product Code / SKU** (keep codes unique, e.g. KAR-MALA-108).',
      'Enter **MRP**, then either the **Discount %** or the **Selling Price**. The other is calculated for you.',
      'Choose the **Store Collection** and **Category**, and set the **Initial Stock**.',
      'Upload the **Product Image** (or use **Camera** on a phone) and up to 4 extra images.',
      'Optional: add **Colors / Textures** with their own photos, **Specifications**, two **highlight pills** and a **badge** like "Best Seller".',
      'For sizes or options, add **Product Variants**: pick a size, set its price and MRP, and an optional **Bulk Offer** (minimum quantity and bulk price).',
      'Save. The product appears on the website straight away.',
    ],
    tips: [
      'Photos are compressed automatically before upload and resized for each screen, so you can upload straight from your phone.',
      'Square photos (1:1) look best on product cards.',
      'Turn on **Popular Picks** for products you want in the home-page showcase.',
    ],
    warnings: ['Price must be more than ₹0 and stock cannot be negative. The form tells you if something is missing.'],
  },
  {
    id: 'admin-groups', tab: 'product-groups', category: 'catalog', icon: 'Layers', minutes: 3,
    title: 'Product groups and bulk offers',
    summary: 'Let customers mix different products to reach a bulk-price quantity.',
    steps: [
      'Open **Product Groups** and create a group with a clear name (e.g. "Rudraksha bracelets – any 3").',
      'Search and tick the products that belong together.',
      'Make sure the products have the **same bulk offer** (minimum quantity and bulk price) on their variants.',
      'Save. At checkout, quantities of all products in the group are added up to unlock the bulk price.',
    ],
    warnings: ['If you see **Variant Rate Mismatch Detected**, the grouped products have different bulk prices. Fix them so customers get a predictable price.'],
  },
  {
    id: 'admin-stock', tab: 'stock', category: 'catalog', icon: 'Package', minutes: 2,
    title: 'Keep stock correct',
    summary: 'Set or add stock for every size and colour.',
    steps: [
      'Open **Stock Control** and search for a product.',
      'For each size / colour, type the new quantity to **set** it, or add to it.',
      'Low-stock products (5 or fewer) appear under **Needs your attention** on the dashboard and in the Stock tab of Reports.',
    ],
    tips: [
      'Stock goes down automatically when an order is **paid**, not when it is placed, and comes back if you cancel an order.',
      'Customers cannot buy more than the available stock; the checkout checks it again on the server.',
    ],
  },
  {
    id: 'admin-vendors', tab: 'vendors', category: 'sales', icon: 'Truck', minutes: 5,
    title: 'Vendors & order routing',
    summary: 'Add partner stores and send each order to the nearest one that has the stock.',
    steps: [
      'Open **Vendors** and add a vendor: contact name, business name, phone / email, **State** and **District**, and a password. The vendor logs in with these details.',
      'Give the vendor products and stock (they can also add products themselves from their dashboard).',
      'In **Routing settings**, switch on **Send new orders to the nearest vendor** and optionally set a **Maximum distance (km)** (0 = no limit).',
      'Use **Test: which vendor is nearest?** with a customer state and district to check where an order would go.',
      'In **Order routing** you can see where each order went and **Re-assign** it to another vendor or the main store.',
    ],
    tips: [
      'If a vendor presses "Can\'t fulfil", the order moves automatically to the next nearest vendor with stock, or back to the main store.',
      'Paused vendors receive no new orders. Use this for holidays.',
    ],
  },
  {
    id: 'admin-reports', tab: 'reports', category: 'sales', icon: 'BarChart3', minutes: 5,
    title: 'Reports, comparisons and exports',
    summary: 'Sales, products, customers, regions and stock for any period, downloadable as Excel / PDF / CSV.',
    steps: [
      'Open **Reports & Analytics** → **Live analytics**.',
      'Pick a period (**Today, This week, This month, Last month, This year…**) or **Custom** with exact dates and times.',
      'Choose **Group by** (daily, weekly, monthly…) and the **Store**: all stores, the main store or one vendor.',
      'Press **Excel**, **PDF** or **CSV** to download. Use **Sections** to choose what goes into the file.',
      'Open **Compare periods** to put periods side by side: this month vs last month, year on year, or the last 2–24 months / weeks / quarters.',
      'Open **Vendor reports** to read reports vendors submitted, add a note and **Mark reviewed**.',
    ],
    tips: ['Downloads use the Daivika design with your logo and company details from Invoice Control.', 'All numbers are calculated from real orders at the moment you open the report.'],
  },
  {
    id: 'admin-categories', tab: 'categories', category: 'catalog', icon: 'Layers', minutes: 2,
    title: 'Categories',
    summary: 'Organise products so customers can browse and filter them.',
    steps: [
      'Open **Categories**.',
      'Enter a **Category Name**, upload a **Category Image** and save.',
      'Edit or delete from **Existing Categories**.',
    ],
    tips: ['Category names drive the home-page sections too: products named or categorised as Karungali, Rudraksha, crystals, pooja items or bracelets/pendants appear in the matching home sections automatically.'],
    warnings: ['Before deleting a category, move its products to another category so they stay easy to find.'],
  },
  {
    id: 'admin-sizes', tab: 'sizes', category: 'catalog', icon: 'Ruler', minutes: 1,
    title: 'Sizes',
    summary: 'The list of sizes you can pick when adding product variants.',
    steps: ['Open **Manage Sizes**, type a size (e.g. S, XL, 32 Inches, 108 Beads) and add it.', 'It becomes available in **Product Variants → Select Size**.'],
  },
  {
    id: 'admin-coupons', tab: 'coupons', category: 'marketing', icon: 'Sparkles', minutes: 3,
    title: 'Coupons',
    summary: 'Create discount codes with minimum order and per-customer limits.',
    steps: [
      'Open **Coupons** and enter a **Coupon Code** (customers type it at checkout).',
      'Choose a **Coupon Category**: Welcome / Referral / Festival / Other work on the whole cart. A **product category** name makes the coupon valid only when the cart has items from that category.',
      'Choose **Discount Type**: percentage or fixed amount, and the value.',
      'Set **Minimum Order Amount** and **Usage Limit per User Mobile** (how many times one phone number can use it).',
      'Save. Turn all coupons on or off at once in **Settings**.',
    ],
    tips: ['The server checks every coupon again at payment time, so limits cannot be bypassed.', 'The first "Welcome" coupon is shown to new customers in their welcome notification.'],
  },
  {
    id: 'admin-free-gift', tab: 'free-gift', category: 'marketing', icon: 'Gift', minutes: 3,
    title: 'Free gift offer with countdown',
    summary: 'Give a free product when customers check out before the timer ends.',
    steps: [
      'Open **Free Gift Offer** and switch it on.',
      'Pick the **gift product** and the **Timer Limit** in minutes.',
      'Choose **All Products** or **Specific Trigger Products Only**, and an optional minimum cart amount (0 = any).',
      'Write the **Offer Headline**, **Subtitle** and **Badge Label**, then **Save All Changes**.',
      'The second part controls the gift banner on **product pages** (all or selected products).',
    ],
    warnings: ['Keep the gift product in stock. When it runs out the offer stops showing.'],
  },
  {
    id: 'admin-reviews', tab: 'product-reviews', category: 'marketing', icon: 'Star', minutes: 2,
    title: 'Customer reviews',
    summary: 'Read, answer and moderate product reviews.',
    steps: ['Open **Product Reviews** to see every review with rating and order details.', 'Type a reply. It is shown as the official store reply with an admin badge.', 'Delete reviews that are spam or abusive.'],
  },
  {
    id: 'admin-leads', tab: 'leads-inbox', category: 'marketing', icon: 'Inbox', minutes: 2,
    title: 'Enquiries & newsletter subscribers',
    summary: 'Messages from the Contact page and footer newsletter sign-ups.',
    steps: ['Open **Leads Inbox**. Unread messages are counted on the menu.', 'Open a message, reply by email or phone, and mark it as replied.', 'Switch to **Subscribers** to see newsletter sign-ups.'],
  },
  {
    id: 'admin-broadcast', tab: 'broadcast', category: 'marketing', icon: 'Bell', minutes: 2,
    title: 'Send push notifications',
    summary: 'Announce offers to customers who allowed notifications.',
    steps: ['Open **Broadcast System**.', 'Write a **Notification Title** and **Message**, choose a type and an optional link (e.g. /products?theme=karungali).', 'Send. **Broadcast Logs** show what was sent and to how many people.'],
    warnings: ['Use broadcasts sparingly (a few per week at most) so customers keep notifications switched on.'],
  },
  {
    id: 'admin-meta', tab: 'meta-ads', category: 'marketing', icon: 'Target', minutes: 3,
    title: 'Meta ads & pixel',
    summary: 'Track Facebook / Instagram ad results and which orders they brought in.',
    steps: ['Open **Meta Ads & Pixel** and enter your Pixel ID (and access token for server events).', 'Choose which events to track (page view, add to cart, purchase…).', 'The dashboard shows orders attributed to each ad source and campaign, with estimated ROAS.'],
    tips: ['Add UTM parameters (utm_source, utm_campaign…) to your ad links so orders are attributed correctly.'],
  },
  {
    id: 'admin-invoice', tab: 'invoice-control', category: 'settings', icon: 'Printer', minutes: 2,
    title: 'Company details & invoices',
    summary: 'Your company name, address, phone, email, logo and invoice numbering.',
    steps: [
      'Open **Invoice Control**.',
      'Fill **Company/Brand Name**, **Corporate Logo**, address, city, state, PIN, phone and email.',
      'Set the invoice **Prefix Code** and **Starting Index**. New paid orders get the next number automatically.',
      'Check the **Live Paper Preview** and save.',
    ],
    tips: ['These details also appear on the website\'s Contact and FAQ pages and in report downloads.'],
    warnings: ['Do not lower the starting index below numbers already used, or invoice numbers will repeat.'],
  },
  {
    id: 'admin-shipping', tab: 'shipping-control', category: 'settings', icon: 'Truck', minutes: 3,
    title: 'Delivery charges',
    summary: 'Free-shipping threshold, delivery zones and extra charges per item.',
    steps: [
      'Open **Shipping Control** and set **Minimum Free Shipping Purchase**. Orders at or above it ship free.',
      'Create zones (e.g. South India) with a **Zone Minimum Shipping Charge** and assign states to each zone.',
      'Optionally add per-item rules by collection / category (e.g. +₹30 per heavy item).',
    ],
    tips: ['States that are not in any zone pay ₹100.', 'Checkout always recalculates delivery on the server with these settings.'],
  },
  {
    id: 'admin-site', tab: 'site-control', category: 'website', icon: 'Image', minutes: 5,
    title: 'Banners, logo, popup and pages',
    summary: 'Everything customers see on the website, without code.',
    steps: [
      'Open **Hero Banners & Branding** and pick a section from the dropdown.',
      '**Hero Banners**: upload a desktop image (**1920×640, 3:1**) and a mobile image (**1280×720, 16:9**), add title, button text and link. Up to 6 banners.',
      '**Welcome Offer Popup**: square (1:1) image, offer text, coupon code and link.',
      '**Announcement Bar**: up to 6 rotating messages at the top of the site.',
      '**Feature Cards**, **Sacred Stories** (home-page photo/video gallery), **FAQ Setup**, **Contact Info** and the **policy pages** (shipping, returns, refund, privacy, terms).',
      'Press the section\'s **Save** button (or **Save Changes** at the top).',
    ],
    tips: ['Sacred Stories accepts a photo, a YouTube / Instagram link, or both. The section stays hidden until you add the first story.'],
  },
  {
    id: 'admin-users', tab: 'users', category: 'settings', icon: 'Users', minutes: 1,
    title: 'Customers and admin access',
    summary: 'Find customers and control who can open the admin panel.',
    steps: ['Open **Manage Users** and search by name, email or role.', 'Use **Role Control** to give or remove admin access.'],
    warnings: ['Admins can see all orders and customer details and change prices. Give admin access only to people you trust.'],
  },
  {
    id: 'admin-settings', tab: 'settings', category: 'settings', icon: 'Settings', minutes: 2,
    title: 'Store settings',
    summary: 'Coupons on/off, cash-on-delivery advance and the offer popup.',
    steps: [
      'Open **Settings**.',
      'Switch coupons on or off for the whole store.',
      'Set the **Advance Online Deposit Percentage** for cash on delivery (the customer pays this part online, the rest on delivery).',
      'Configure the offer popup image, promo code and **Display Delay (Seconds)**.',
    ],
  },
];

const ADMIN_TROUBLESHOOTING = [
  { q: 'A customer paid but the order is not in the list', a: 'Orders appear only after the payment is verified. Check the payment in your Razorpay dashboard. If it shows "captured", make sure the Razorpay webhook (/api/payment/webhook, event payment.captured) is set up; it confirms orders even when the customer closes the browser.' },
  { q: 'Stock did not go down after an order', a: 'Stock is taken when the payment is confirmed. If the order was routed to a vendor, the vendor\'s stock goes down instead of the main store\'s.' },
  { q: 'An image will not upload', a: 'Use JPEG, PNG, WebP, GIF or AVIF up to 15 MB. Photos are shrunk automatically before upload. Check your internet connection for very large files.' },
  { q: 'A coupon is not accepted at checkout', a: 'Check that coupons are switched on (Settings), the cart meets the minimum amount, the coupon category matches the cart, and the customer\'s phone number has not used up the limit.' },
  { q: 'The checkout shows "Your order total has been updated"', a: 'The server recalculates every order with the latest prices, offers and delivery charges. This appears when a price or setting changed after the customer opened the page.' },
  { q: 'Company address on the Contact page is wrong', a: 'It comes from Invoice Control. Update it there and save; the website shows the new details immediately.' },
];

// ── Vendor guides ──────────────────────────────────────────

const VENDOR_GUIDES = [
  {
    id: 'vendor-dashboard', tab: 'orders', category: 'start', icon: 'LayoutDashboard', minutes: 2,
    title: 'Your vendor dashboard',
    summary: 'How orders reach you and what the numbers at the top mean.',
    steps: [
      'Daivika sends you orders **automatically** when a customer near you buys something you have in stock.',
      'The cards at the top show **New orders**, **Open orders**, **Units in stock** and the number of **Products** you sell.',
      'Use the tabs: **Orders**, **Products & Stock**, **Reports**, **Account** and **Help**.',
      'Press **Refresh** any time; orders also refresh by themselves every 30 seconds.',
    ],
    warnings: ['If your account is **paused** by the Daivika admin you will not receive new orders. Contact the admin to switch it back on.'],
  },
  {
    id: 'vendor-orders', tab: 'orders', category: 'sales', icon: 'ShoppingCart', minutes: 3,
    title: 'Handle an order step by step',
    summary: 'Accept, pack, ship and deliver, or pass on an order you cannot fulfil.',
    steps: [
      'New orders appear under **Open** with the badge **Assigned**.',
      'Check the items, sizes and the customer\'s address. Tap the phone number to call the customer if needed.',
      'Press **Accept order**, then **Mark packed**, **Mark shipped** and finally **Mark delivered** as you go.',
      'If you cannot supply it (e.g. out of stock), press **Can\'t fulfil** and give a short reason. This is possible until the order is shipped.',
    ],
    tips: ['When you press "Can\'t fulfil", the order goes automatically to the next nearest vendor or the main store, so the customer is not affected.', 'The customer sees the status on their order-tracking page.'],
    warnings: ['For cash-on-delivery orders, collect the remaining amount shown on the order when you deliver.'],
  },
  {
    id: 'vendor-stock', tab: 'stock', category: 'catalog', icon: 'Boxes', minutes: 3,
    title: 'Products & stock',
    summary: 'Choose which Daivika products you sell and keep your stock up to date.',
    steps: [
      'Open **Products & Stock** and press **Add products from the Daivika catalog**.',
      'Search by name, code or category and add the products you keep in your shop.',
      'Set the stock for each size / colour with the **− / +** buttons or by typing a number.',
      'Press **Pause** on a product to stop receiving orders for it without removing it, and **Resume** to sell it again.',
    ],
    tips: ['Your stock goes down automatically when an order is sent to you, and comes back if you pass the order on.', 'Orders only come to you when you have enough stock for **every** item in the order, so keep it accurate.'],
  },
  {
    id: 'vendor-reports', tab: 'reports', category: 'reports', icon: 'BarChart3', minutes: 4,
    title: 'Reports and submitting them to Daivika',
    summary: 'See your sales and stock, compare periods, download and send reports to the admin.',
    steps: [
      'Open **Reports** → **My sales & stock** and choose a period (today, this week, this month, custom dates…).',
      'Download with **Excel**, **PDF** or **CSV**.',
      'Press **Submit to admin**, add a title and an optional note, and submit. The admin is notified.',
      'Open **Compare periods** to compare e.g. this month with last month, then download or submit the comparison too.',
      'Open **Submitted reports** to see whether the admin has **Reviewed** your report and read their note.',
    ],
    tips: ['Submitted figures are calculated from your real orders, so there is nothing to type in yourself.'],
  },
  {
    id: 'vendor-account', tab: 'account', category: 'settings', icon: 'Store', minutes: 1,
    title: 'Account & password',
    summary: 'Your store details and changing your password.',
    steps: ['Open **Account** to see the store details Daivika has for you.', 'To change name, address or district, contact the Daivika admin.', 'Change your password in **Change password** (current password, new password twice).'],
    warnings: ['Never share your password. Anyone with it can see your customers\' addresses and phone numbers.'],
  },
];

const VENDOR_TROUBLESHOOTING = [
  { q: 'I am not receiving any orders', a: 'Check that your account is active, that you have stock for the products customers buy, and that customers are within the delivery distance the admin has set.' },
  { q: 'An order disappeared from my list', a: 'If you pressed "Can\'t fulfil" or the admin re-assigned it, the order moved to another store.' },
  { q: 'My stock number looks wrong', a: 'Stock goes down when an order is assigned to you and comes back when it leaves you. Correct it any time in Products & Stock.' },
];

// ── Setup checklists ───────────────────────────────────────

const ADMIN_CHECKLIST = [
  { id: 'company', label: 'Fill in company details and logo', tab: 'invoice-control', guide: 'admin-invoice' },
  { id: 'categories', label: 'Create your categories', tab: 'categories', guide: 'admin-categories' },
  { id: 'products', label: 'Add your first products with photos', tab: 'products', guide: 'admin-products' },
  { id: 'shipping', label: 'Set delivery charges and free-shipping amount', tab: 'shipping-control', guide: 'admin-shipping' },
  { id: 'banners', label: 'Upload home-page banners', tab: 'site-control', guide: 'admin-site' },
  { id: 'coupons', label: 'Create a welcome coupon', tab: 'coupons', guide: 'admin-coupons' },
  { id: 'vendors', label: 'Add vendors and switch on routing (optional)', tab: 'vendors', guide: 'admin-vendors' },
];

const VENDOR_CHECKLIST = [
  { id: 'products', label: 'Add the products you sell', tab: 'stock', guide: 'vendor-stock' },
  { id: 'stock', label: 'Enter your stock for each size / colour', tab: 'stock', guide: 'vendor-stock' },
  { id: 'password', label: 'Change your password', tab: 'account', guide: 'vendor-account' },
  { id: 'report', label: 'Download your first sales report', tab: 'reports', guide: 'vendor-reports' },
];

// ── Guided tours ───────────────────────────────────────────
// target: CSS selector of the element to highlight (missing / hidden → centred card)

const ADMIN_TOUR = [
  { title: 'Welcome to your Daivika admin panel 🙏', body: 'This short tour shows where everything is. Use **Next** or the arrow keys; press **Esc** to stop at any time.', tab: 'overview' },
  { target: '[data-tour="tab-overview"]', title: 'Dashboard', body: 'Your home screen with live sales, trends and tasks.', tab: 'overview' },
  { target: '[data-tour="overview-today"]', title: "Today's figures", body: "Sales, orders and items for today, compared with before.", tab: 'overview' },
  { target: '[data-tour="overview-range"]', title: 'Choose the period', body: 'Change every card and chart at once: today, 7 or 30 days, this month or this year.', tab: 'overview' },
  { target: '[data-tour="overview-attention"]', title: 'Needs your attention', body: 'Orders to process, low stock, unread enquiries and vendor reports. Tap a row to go straight there.', tab: 'overview' },
  { target: '[data-tour="tab-orders"]', title: 'Orders', body: 'Every paid order. Move them through **Packed → Shipped → Delivered** and print invoices.' },
  { target: '[data-tour="tab-products"]', title: 'Products', body: 'Add and edit products, prices, photos, sizes and bulk offers.' },
  { target: '[data-tour="tab-stock"]', title: 'Stock Control', body: 'Set stock for each size and colour. Stock also changes automatically with orders.' },
  { target: '[data-tour="tab-vendors"]', title: 'Vendors', body: 'Partner stores. Orders can go automatically to the nearest vendor with stock.' },
  { target: '[data-tour="tab-reports"]', title: 'Reports & Analytics', body: 'Detailed reports, period comparisons and Excel / PDF downloads, plus reports submitted by vendors.' },
  { target: '[data-tour="tab-coupons"]', title: 'Marketing', body: 'Coupons, free-gift offers, reviews, enquiries and push notifications live in this part of the menu.' },
  { target: '[data-tour="tab-site-control"]', title: 'Website content', body: 'Banners, logo, popup, announcement bar, stories, FAQs and policy pages, without code.' },
  { target: '[data-tour="tab-invoice-control"]', title: 'Company details', body: 'Your address, phone, email and invoice numbering. Shown on invoices and the Contact page.' },
  { target: '[data-tour="notifications"]', title: 'Notifications', body: 'New orders, reviews, enquiries and vendor reports arrive here.' },
  { target: '[data-tour="help-button"]', title: 'Help on every page', body: 'Press **?** on any page for the guide to that page.' },
  { target: '[data-tour="tab-help"]', title: 'Help & Tutorials', body: 'All guides, a setup checklist and fixes for common problems. You can replay this tour from there.' },
  { title: "You're ready! ✨", body: 'Start with the **setup checklist** in Help & Tutorials, or jump straight into Orders.' },
];

const VENDOR_TOUR = [
  { title: 'Welcome to your Daivika vendor dashboard 🙏', body: 'A one-minute tour of how orders reach you and how to handle them. Press **Esc** to stop at any time.', tab: 'orders' },
  { target: '[data-tour="vendor-stats"]', title: 'Your numbers', body: 'New orders, open orders, units in stock and how many products you sell.', tab: 'orders' },
  { target: '[data-tour="vendor-tab-orders"]', title: 'Orders', body: 'Orders from customers near you arrive here automatically. **Accept → Pack → Ship → Deliver**, or press **Can\'t fulfil** to pass one on.', tab: 'orders' },
  { target: '[data-tour="vendor-tab-stock"]', title: 'Products & Stock', body: 'Choose the Daivika products you sell and keep each size / colour\'s stock correct, so you get the right orders.' },
  { target: '[data-tour="vendor-tab-reports"]', title: 'Reports', body: 'Your sales and stock for any period, comparisons, Excel / PDF downloads and **Submit to admin**.' },
  { target: '[data-tour="vendor-tab-account"]', title: 'Account', body: 'Your store details and password.' },
  { target: '[data-tour="vendor-refresh"]', title: 'Refresh', body: 'Orders refresh by themselves every 30 seconds; press this to check right now.' },
  { target: '[data-tour="vendor-tab-help"]', title: 'Help', body: 'Step-by-step guides, a setup checklist and answers to common questions. You can replay this tour there.' },
  { title: "You're ready! ✨", body: 'Next step: add your products and stock so orders can come to you.' },
];

export const HELP = {
  admin: { guides: ADMIN_GUIDES, troubleshooting: ADMIN_TROUBLESHOOTING, checklist: ADMIN_CHECKLIST, tour: ADMIN_TOUR },
  vendor: { guides: VENDOR_GUIDES, troubleshooting: VENDOR_TROUBLESHOOTING, checklist: VENDOR_CHECKLIST, tour: VENDOR_TOUR },
};

export const guideForTab = (audience, tab) => HELP[audience].guides.find(g => g.tab === tab) || HELP[audience].guides[0];
