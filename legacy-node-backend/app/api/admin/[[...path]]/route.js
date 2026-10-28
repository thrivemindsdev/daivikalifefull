import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse, publicUser } from '@/lib/api-middleware';
import User from '@/models/User';
import Product from '@/models/Product';
import ContactMessage from '@/models/ContactMessage';
import Newsletter from '@/models/Newsletter';
import Category from '@/models/Category';
import Banner from '@/models/Banner';
import ProductGroup from '@/models/ProductGroup';
import Setting from '@/models/Setting';
import Order from '@/models/Order';
import PopularSearch from '@/models/PopularSearch';
import Size from '@/models/Size';
import { isDatabaseConnected, memoryUsers, memoryProducts, memoryContactMessages, memoryNewsletterSubscribers, memoryBanners, memoryProductGroups, memorySettings, memoryOrders, memorySizes, memoryCategories, saveMemoryBanners, saveMemorySettings } from '@/lib/db';
import { uploadToCloudinaryOrLocal, deleteFromCloudinary, signedUploadParams } from '@/lib/cloudinary';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/admin/stats, /api/admin/users, /api/admin/contact-messages, /api/admin/newsletter-subscribers
export async function GET(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  const action = path[0];

  // GET /api/admin/dashboard-init
  if (action === 'dashboard-init') {
    try {
      if (!isDatabaseConnected) {
        const groupMap = {};
        memoryProducts.forEach(p => {
          const cat = p.category || 'accessories';
          groupMap[cat] = (groupMap[cat] || 0) + 1;
        });
        const categoryBreakdown = Object.keys(groupMap).map(name => ({
          name,
          count: groupMap[name]
        }));
        const stats = {
          totalUsers: memoryUsers.length,
          totalProducts: memoryProducts.length,
          totalCategories: memoryCategories.length,
          categoryBreakdown,
          recentUsers: [...memoryUsers].reverse().slice(0, 5).map(publicUser)
        };

        const populatedGroups = memoryProductGroups.map(g => {
          const prods = g.products.map(pId => memoryProducts.find(p => p._id === pId)).filter(Boolean);
          return { ...g, products: prods };
        });

        return jsonResponse({
          stats,
          users: [...memoryUsers].reverse().map(publicUser),
          categories: [...memoryCategories].reverse(),
          productGroups: populatedGroups,
          orders: [...memoryOrders].filter(o => {
            const oid = (o?._id || o?.id || '').toString().toLowerCase();
            if (['ord_1', 'ord_2', 'ord_3', 'ord_140378', '140378'].includes(oid)) return false;
            if (o?.email && o.email.toLowerCase().includes('sheenaponnappan')) return false;
            if (o?.user && o.user.toLowerCase().includes('sheena ponnappan')) return false;
            return o.status !== 'Pending Payment' && o.paymentStatus !== 'Pending';
          }).reverse(),
          banners: memoryBanners,
          popularSearches: [],
          sizes: memorySizes,
          products: [...memoryProducts].reverse()
        });
      }

      // Fetch all database records concurrently in a single thread to save network RTT
      const [
        totalUsers,
        totalProducts,
        categoriesGroup,
        recentUsers,
        users,
        categories,
        productGroups,
        orders,
        banners,
        popularSearches,
        sizes,
        productsList
      ] = await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
        User.find({}).sort({ createdAt: -1 }).limit(5),
        User.find({}).sort({ createdAt: -1 }),
        Category.find({}).sort({ createdAt: -1 }),
        ProductGroup.find({}).populate('products'),
        Order.find({
        status: { $ne: 'Pending Payment' },
        paymentStatus: { $ne: 'Pending' }
      }).sort({ createdAt: -1 }),
        (process.env.DATABASE_URL ? prisma.banner.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => Banner.find({}).sort({ createdAt: 1 })) : Banner.find({}).sort({ createdAt: 1 })),
        PopularSearch.find({}).sort({ createdAt: -1 }),
        Size.find({}).sort({ createdAt: -1 }),
        Product.find({}).sort({ createdAt: -1 })
      ]);

      const totalCategories = categoriesGroup.length;
      const stats = {
        totalUsers,
        totalProducts,
        totalCategories,
        categoryBreakdown: categoriesGroup.map(g => ({ name: g._id, count: g.count })),
        recentUsers: recentUsers.map(publicUser)
      };

      return jsonResponse({
        stats,
        users: users.map(publicUser),
        categories,
        productGroups,
        orders: orders.filter(o => {
          const oid = (o?._id || o?.id || '').toString().toLowerCase();
          if (['ord_1', 'ord_2', 'ord_3', 'ord_140378', '140378'].includes(oid)) return false;
          if (o?.email && o.email.toLowerCase().includes('sheenaponnappan')) return false;
          if (o?.user && o.user.toLowerCase().includes('sheena ponnappan')) return false;
          return true;
        }),
        banners,
        popularSearches,
        sizes,
        products: productsList
      });

    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/stats
  if (action === 'stats') {
    try {
      if (!isDatabaseConnected) {
        const totalUsers = memoryUsers.length;
        const totalProducts = memoryProducts.length;

        const groupMap = {};
        memoryProducts.forEach(p => {
          const cat = p.category || 'accessories';
          groupMap[cat] = (groupMap[cat] || 0) + 1;
        });

        const categoryBreakdown = Object.keys(groupMap).map(name => ({
          name,
          count: groupMap[name]
        }));

        const totalCategories = categoryBreakdown.length;
        const recentUsers = [...memoryUsers].reverse().slice(0, 5);

        return jsonResponse({
          totalUsers,
          totalProducts,
          totalCategories,
          categoryBreakdown,
          recentUsers
        });
      }

      const totalUsers = await User.countDocuments();
      const totalProducts = await Product.countDocuments();

      const categoriesGroup = await Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);
      const totalCategories = categoriesGroup.length;
      const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(5);

      return jsonResponse({
        totalUsers,
        totalProducts,
        totalCategories,
        categoryBreakdown: categoriesGroup.map(g => ({ name: g._id, count: g.count })),
        recentUsers
      });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/users
  if (action === 'users') {
    try {
      if (!isDatabaseConnected) {
        return jsonResponse([...memoryUsers].reverse().map(publicUser));
      }
      const users = await User.find({}).sort({ createdAt: -1 });
      return jsonResponse(users.map(publicUser));
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/contact-messages
  if (action === 'contact-messages') {
    try {
      if (!isDatabaseConnected) {
        return jsonResponse([...memoryContactMessages].reverse());
      }
      const messages = await ContactMessage.find({}).sort({ createdAt: -1 });
      return jsonResponse(messages);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/newsletter-subscribers
  if (action === 'newsletter-subscribers') {
    try {
      if (!isDatabaseConnected) {
        return jsonResponse([...memoryNewsletterSubscribers].reverse());
      }
      const subscribers = await Newsletter.find({}).sort({ createdAt: -1 });
      return jsonResponse(subscribers);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/groups
  if (action === 'groups') {
    try {
      if (!isDatabaseConnected) {
        const populated = memoryProductGroups.map(g => {
          const prods = g.products.map(pId => memoryProducts.find(p => p._id === pId)).filter(Boolean);
          return { ...g, products: prods };
        });
        return jsonResponse(populated);
      }
      const groups = await ProductGroup.find({}).populate('products');
      return jsonResponse(groups);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // GET /api/admin/settings
  if (action === 'settings') {
    try {
      if (!isDatabaseConnected) {
        const result = {};
        memorySettings.forEach(s => { result[s.key] = s.value; });
        return jsonResponse(result);
      }
      const settings = await Setting.find({});
      const result = {};
      settings.forEach(s => { result[s.key] = s.value; });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}

// POST /api/admin/upload-logo
export async function POST(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  const action = path[0];

  if (action === 'upload-logo') {
    try {
      const formData = await req.formData();
      const imageFile = formData.get('image');
      if (!imageFile) return errorResponse('No image uploaded', 400);

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/settings');
      return jsonResponse({ imageUrl }, 200, { imageUrl, message: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Upload Logo Error:', error);
      return errorResponse('Image upload failed', 500);
    }
  }

  if (action === 'upload-image') {
    try {
      const formData = await req.formData();
      const imageFile = formData.get('image') || formData.get('file');
      if (!imageFile) return errorResponse('No image uploaded', 400);

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/products');
      return jsonResponse({ imageUrl }, 200, { imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload Image Error:', error);
      return errorResponse('Image upload failed', 500);
    }
  }

  // POST /api/admin/cloudinary-signature — lets the admin browser upload a large video straight to
  // Cloudinary (into CLOUDINARY_FOLDER) without the API secret ever leaving the server
  if (action === 'cloudinary-signature') {
    const signed = signedUploadParams();
    if (!signed) return errorResponse('Cloudinary is not configured on the server', 503);
    return jsonResponse(signed);
  }

  // POST /api/admin/groups
  if (action === 'groups') {
    try {
      const { name, products } = await req.json();
      if (!name) return errorResponse('Group name is required', 400);
      if (!products || !Array.isArray(products)) return errorResponse('Products list is required', 400);

      if (!isDatabaseConnected) {
        const newGroup = {
          _id: 'mem_group_' + Date.now(),
          name,
          products,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memoryProductGroups.push(newGroup);
        const prods = products.map(pId => memoryProducts.find(p => p._id === pId)).filter(Boolean);
        return jsonResponse({ ...newGroup, products: prods }, 201, { message: 'Product Group created in memory cache' });
      }

      const exists = await ProductGroup.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (exists) {
        return errorResponse('A product group with this name already exists', 400);
      }

      const newGroup = await ProductGroup.create({ name: name.trim(), products });
      const populated = await ProductGroup.findById(newGroup._id).populate('products');
      return jsonResponse(populated, 201, { message: 'Product Group created successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }


  // POST /api/admin/recover-pending-payments
  // Loops all Pending Payment Cashfree orders (or a specific orderId) and re-verifies them with Cashfree API
  if (action === 'recover-pending-payments') {
    try {
      const body = await req.json().catch(() => ({}));
      const specificOrderId = body.orderId?.trim();

      const cfAppId = process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID;
      const cfSecret = process.env.CASHFREE_SECRET_KEY;
      const cfEnv = process.env.CASHFREE_ENV || process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox';
      const cfBase = cfEnv === 'production'
        ? 'https://api.cashfree.com/pg/orders'
        : 'https://sandbox.cashfree.com/pg/orders';

      if (!cfAppId || !cfSecret) {
        return errorResponse('Cashfree credentials not configured', 500);
      }

      const results = { recovered: [], stillPending: [], errors: [] };

      // Helper to process a single Cashfree order
      const processCfOrder = async (orderId, existingOrder = null) => {
        try {
          const cfRes = await fetch(`${cfBase}/${orderId}`, {
            method: 'GET',
            headers: {
              'x-api-version': '2023-08-01',
              'x-client-id': cfAppId,
              'x-client-secret': cfSecret
            }
          });
          const cfData = await cfRes.json();

          if (cfRes.ok && (cfData.order_status === 'PAID' || cfData.order_status === 'SUCCESS')) {
            const isPartialCod = existingOrder?.isPartialCod ||
              (existingOrder?.paymentMethod || '').toLowerCase().includes('cash on delivery') ||
              (existingOrder?.paymentMethod || '').toLowerCase().includes('advance');

            const updateData = {
              status: 'Processing',
              paymentStatus: isPartialCod ? 'Partially Paid' : 'Paid',
              paymentMethod: isPartialCod ? 'Cash on Delivery' : 'Cashfree Online',
              razorpay_payment_id: cfData.cf_order_id || existingOrder?.razorpay_payment_id || ('CF_RECOVERED_' + Date.now())
            };

            if (isDatabaseConnected) {
              const foundInDb = await Order.findById(orderId);
              if (foundInDb) {
                await Order.findByIdAndUpdate(orderId, updateData);
              } else {
                // Auto-create from Cashfree data if order was never saved
                const cust = cfData.customer_details || {};
                const amt = Number(cfData.order_amount) || 0;
                await Order.create({
                  _id: orderId,
                  id: orderId,
                  invoiceNumber: 'SPO' + Math.floor(100000 + Math.random() * 900000),
                  user: cust.customer_name || 'Customer',
                  email: cust.customer_email || 'support@daivika.in',
                  phone: cust.customer_phone || '',
                  total: amt,
                  advanceAmount: amt,
                  remainingAmount: 0,
                  isPartialCod: false,
                  codPercent: 30,
                  shippingCharge: 0,
                  discount: 0,
                  couponCode: '',
                  status: 'Processing',
                  paymentStatus: 'Paid',
                  paymentMethod: 'Cashfree Online / UPI',
                  razorpay_payment_id: cfData.cf_order_id || ('CF_' + Date.now()),
                  time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  date: new Date().toISOString().split('T')[0],
                  address: { street: '', city: '', state: '', pincode: '', country: 'India' },
                  itemsList: [],
                  isGuest: true,
                  utmData: { source: 'cashfree_admin_recovery', cf_order_id: cfData.cf_order_id }
                });
              }
            } else {
              const { saveMemoryOrders } = await import('@/lib/db');
              const found = memoryOrders.find(o => (o._id || o.id) === orderId);
              if (found) {
                Object.assign(found, updateData);
              } else {
                const cust = cfData.customer_details || {};
                const amt = Number(cfData.order_amount) || 0;
                memoryOrders.push({
                  _id: orderId,
                  id: orderId,
                  invoiceNumber: 'SPO' + Math.floor(100000 + Math.random() * 900000),
                  user: cust.customer_name || 'Customer',
                  email: cust.customer_email || 'support@daivika.in',
                  phone: cust.customer_phone || '',
                  total: amt,
                  advanceAmount: amt,
                  remainingAmount: 0,
                  isPartialCod: false,
                  codPercent: 30,
                  shippingCharge: 0,
                  discount: 0,
                  couponCode: '',
                  status: 'Processing',
                  paymentStatus: 'Paid',
                  paymentMethod: 'Cashfree Online / UPI',
                  razorpay_payment_id: cfData.cf_order_id || ('CF_' + Date.now()),
                  time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                  date: new Date().toISOString().split('T')[0],
                  address: { street: '', city: '', state: '', pincode: '', country: 'India' },
                  itemsList: [],
                  isGuest: true,
                  utmData: { source: 'cashfree_admin_recovery', cf_order_id: cfData.cf_order_id }
                });
              }
              saveMemoryOrders();
            }

            results.recovered.push({
              id: orderId,
              user: existingOrder?.user || cfData.customer_details?.customer_name,
              total: existingOrder?.total || cfData.order_amount,
              paymentStatus: updateData.paymentStatus
            });
          } else {
            results.stillPending.push({ id: orderId, cfStatus: cfData.order_status || 'UNKNOWN' });
          }
        } catch (cfErr) {
          results.errors.push({ id: orderId, error: cfErr.message });
        }
      };

      if (specificOrderId) {
        await processCfOrder(specificOrderId);
      } else {
        // Only check orders not older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let pendingOrders = [];

        if (isDatabaseConnected) {
          pendingOrders = await Order.find({
            status: 'Pending Payment',
            paymentStatus: 'Pending',
            createdAt: { $gte: sevenDaysAgo }
          });
        } else {
          pendingOrders = memoryOrders.filter(o =>
            o.status === 'Pending Payment' &&
            (o.paymentStatus || '').toLowerCase() === 'pending' &&
            new Date(o.createdAt || 0) >= new Date(sevenDaysAgo)
          );
        }

        for (const order of pendingOrders) {
          const orderId = (order._id || order.id || '').toString();
          if (!orderId) continue;
          await processCfOrder(orderId, order);
        }
      }

      console.log('[Recovery] Recovered: ' + results.recovered.length + ', Still pending: ' + results.stillPending.length);
      return jsonResponse(results, 200, {
        message: 'Recovery complete. ' + results.recovered.length + ' order(s) recovered.'
      });
    } catch (err) {
      return errorResponse(err.message || 'Recovery failed', 500);
    }
  }
  return errorResponse('API endpoint not found', 404);
}

// PUT /api/admin/users/:id/role, /api/admin/contact-messages/:id/status, /api/admin/banners
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  const action = path[0];

  // PUT /api/admin/settings
  if (action === 'settings') {
    try {
      const body = await req.json();
      if (!body || typeof body !== 'object') return errorResponse('Invalid settings body', 400);

      if (!isDatabaseConnected) {
        // Update memory settings
        for (const [key, value] of Object.entries(body)) {
          const existing = memorySettings.find(s => s.key === key);
          if (existing) {
            if (key === 'invoice_settings' && existing.value && value) {
              existing.value = {
                ...existing.value,
                ...value,
                nextInvoiceNum: Math.max(Number(existing.value.nextInvoiceNum) || 1, Number(value.nextInvoiceNum) || 1)
              };
            } else {
              existing.value = value;
            }
          } else {
            memorySettings.push({ key, value });
          }
        }
        saveMemorySettings();
        const result = {};
        memorySettings.forEach(s => { result[s.key] = s.value; });
        return jsonResponse(result, 200, { message: 'Settings saved to memory cache and local storage' });
      }

      // Upsert each key-value pair into MongoDB
      for (const [key, value] of Object.entries(body)) {
        let finalValue = value;
        if (key === 'invoice_settings') {
          const existingSetting = await Setting.findOne({ key });
          if (existingSetting && existingSetting.value && value) {
            finalValue = {
              ...existingSetting.value,
              ...value,
              // Always preserve the highest nextInvoiceNum to prevent duplicate serials
              nextInvoiceNum: Math.max(Number(existingSetting.value.nextInvoiceNum) || 1, Number(value.nextInvoiceNum) || 1)
            };
          }
        }
        await Setting.findOneAndUpdate(
          { key },
          { key, value: finalValue },
          { upsert: true, new: true }
        );
      }
      const settings = await Setting.find({});
      const result = {};
      settings.forEach(s => { result[s.key] = s.value; });
      return jsonResponse(result, 200, { message: 'Settings saved to database successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // PUT /api/admin/banners
  if (action === 'banners') {
    try {
      const { banners, confirmRemoveAll } = await req.json();
      if (!banners || !Array.isArray(banners)) {
        return errorResponse('Invalid banners array format', 400);
      }

      // Saving replaces the whole list. An empty list (e.g. the dashboard failed to load the banners
      // and then saved) would delete every banner, so that needs an explicit confirmation.
      const withImage = banners.filter(b => b && (b.image || b.mobileImage));
      if (withImage.length === 0 && !confirmRemoveAll) {
        return errorResponse('No banners to save. Reload the page to load your banners first; nothing was changed.', 400);
      }

      const validBanners = banners.slice(0, 6);

      if (process.env.DATABASE_URL || isDatabaseConnected) {
        try {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Banner" (
              "id" TEXT NOT NULL,
              "image" TEXT NOT NULL DEFAULT '',
              "mobileImage" TEXT NOT NULL DEFAULT '',
              "title" TEXT NOT NULL DEFAULT 'Daivika Banner',
              "subtitle" TEXT NOT NULL DEFAULT '',
              "description" TEXT NOT NULL DEFAULT '',
              "link" TEXT NOT NULL DEFAULT '/products',
              "buttonText" TEXT NOT NULL DEFAULT 'Shop Now',
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
            );
          `).catch(() => {});

          const validIds = [];
          for (const b of validBanners) {
            const bannerId = (b.id || b._id || `banner_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`).toString();
            validIds.push(bannerId);
            const deskImg = b.image || b.mobileImage || '';
            const mobImg = b.mobileImage || b.image || '';
            await prisma.banner.upsert({
              where: { id: bannerId },
              update: {
                image: deskImg,
                mobileImage: mobImg,
                title: b.title || 'Daivika Banner',
                subtitle: b.subtitle || '',
                description: b.description || '',
                link: b.link || '/products',
                buttonText: b.buttonText || 'Shop Now'
              },
              create: {
                id: bannerId,
                image: deskImg,
                mobileImage: mobImg,
                title: b.title || 'Daivika Banner',
                subtitle: b.subtitle || '',
                description: b.description || '',
                link: b.link || '/products',
                buttonText: b.buttonText || 'Shop Now'
              }
            });
          }

          // Delete banners that were removed by admin
          if (validIds.length > 0) {
            await prisma.banner.deleteMany({
              where: { id: { notIn: validIds } }
            });
          } else {
            await prisma.banner.deleteMany({});
          }

          const updatedBanners = await prisma.banner.findMany({
            orderBy: { createdAt: 'asc' }
          });

          // Sync in-memory and disk backup
          memoryBanners.length = 0;
          updatedBanners.forEach(b => memoryBanners.push(b));
          saveMemoryBanners();

          return jsonResponse(updatedBanners, 200, { message: 'Hero banners saved to PostgreSQL successfully' });
        } catch (dbErr) {
          console.warn('PostgreSQL banner save warning, falling back to local memory & disk backup:', dbErr.message);
        }
      }

      // Memory-only fallback mode
      memoryBanners.length = 0;
      validBanners.forEach(b => {
        const deskImg = b.image || b.mobileImage || '';
        const mobImg = b.mobileImage || b.image || '';
        memoryBanners.push({
          _id: b._id || b.id || `banner_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          id: b.id || b._id,
          image: deskImg,
          mobileImage: mobImg,
          title: b.title || 'Daivika Banner',
          subtitle: b.subtitle || '',
          description: b.description || '',
          link: b.link || '/products',
          buttonText: b.buttonText || 'Shop Now'
        });
      });
      saveMemoryBanners();
      return jsonResponse(memoryBanners, 200, { message: 'Banners updated and saved to disk file successfully' });
    } catch (err) {
      console.error('Error saving banners:', err);
      return errorResponse(err.message, 500);
    }
  }

  // PUT /api/admin/users/:id/role
  if (action === 'users') {
    const id = path[1];
    const subAction = path[2];
    if (subAction === 'role') {
      try {
        if (!isDatabaseConnected) {
          const u = memoryUsers.find(x => x._id === id);
          if (!u) return errorResponse('User not found', 404);
          if (u._id === user._id) return errorResponse('You cannot change your own administrator role', 400);

          u.role = u.role === 'admin' ? 'user' : 'admin';
          return jsonResponse(publicUser(u), 200, { message: `User role updated to ${u.role} successfully` });
        }

        const u = await User.findById(id);
        if (!u) return errorResponse('User not found', 404);
        if (u._id.toString() === user._id.toString()) return errorResponse('You cannot change your own administrator role', 400);

        u.role = u.role === 'admin' ? 'user' : 'admin';
        await u.save();

        return jsonResponse(publicUser(u), 200, { message: `User role updated to ${u.role} successfully` });
      } catch (err) {
        return errorResponse(err.message, 500);
      }
    }
  }

  // PUT /api/admin/contact-messages/:id/status
  if (action === 'contact-messages') {
    const id = path[1];
    const subAction = path[2];
    if (subAction === 'status') {
      try {
        const { status, notes } = await req.json();

        if (!isDatabaseConnected) {
          const message = memoryContactMessages.find(m => m._id === id);
          if (!message) return errorResponse('Message not found', 404);

          if (status) message.status = status;
          if (notes !== undefined) message.notes = notes;
          message.updatedAt = new Date().toISOString();

          return jsonResponse(message, 200, { message: 'Message status updated successfully' });
        }

        const message = await ContactMessage.findById(id);
        if (!message) return errorResponse('Message not found', 404);

        if (status) message.status = status;
        if (notes !== undefined) message.notes = notes;
        await message.save();

        return jsonResponse(message, 200, { message: 'Message status updated successfully' });
      } catch (err) {
        return errorResponse(err.message, 500);
      }
    }
  }

  // PUT /api/admin/groups/:id
  if (action === 'groups') {
    const id = path[1];
    if (!id) return errorResponse('Group ID is required', 400);
    try {
      const { name, products } = await req.json();
      if (!isDatabaseConnected) {
        const index = memoryProductGroups.findIndex(g => g._id === id);
        if (index === -1) return errorResponse('Product Group not found', 404);
        
        if (name) memoryProductGroups[index].name = name.trim();
        if (products) memoryProductGroups[index].products = products;
        memoryProductGroups[index].updatedAt = new Date().toISOString();

        const prods = memoryProductGroups[index].products.map(pId => memoryProducts.find(p => p._id === pId)).filter(Boolean);
        return jsonResponse({ ...memoryProductGroups[index], products: prods }, 200, { message: 'Product Group updated in memory cache' });
      }

      const updated = await ProductGroup.findByIdAndUpdate(
        id,
        { name: name ? name.trim() : undefined, products },
        { new: true }
      ).populate('products');
      if (!updated) return errorResponse('Product Group not found', 404);
      return jsonResponse(updated, 200, { message: 'Product Group updated successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // PUT /api/admin/settings
  if (action === 'settings') {
    try {
      const { key, value } = await req.json();
      if (!key) return errorResponse('Setting key is required', 400);

      const Setting = (await import('@/models/Setting')).default;

      if (!isDatabaseConnected) {
        const idx = memorySettings.findIndex(s => s.key === key);
        if (idx >= 0) {
          memorySettings[idx].value = value;
        } else {
          memorySettings.push({ key, value });
        }
        const { saveMemorySettings } = await import('@/lib/db');
        saveMemorySettings();
        return jsonResponse({ key, value }, 200, { message: 'Setting updated in memory' });
      }

      await Setting.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
      return jsonResponse({ key, value }, 200, { message: 'Setting saved successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}

// DELETE /api/admin/users/:id, /api/admin/contact-messages/:id, /api/admin/newsletter-subscribers/:id, /api/admin/wipe-inventory
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  const action = path[0];

  // DELETE /api/admin/wipe-inventory
  if (action === 'wipe-inventory') {
    try {
      if (!isDatabaseConnected) {
        memoryProducts.length = 0;
        return jsonResponse(null, 200, { message: 'Memory-cache inventory wiped successfully' });
      }
      // Fetch all products and delete their images from storage
      const products = await Product.find({});
      for (const p of products) {
        if (p.image) {
          await deleteFromCloudinary(p.image).catch(err => console.warn("Delete main image failed:", err));
        }
        if (p.subImages && Array.isArray(p.subImages)) {
          for (const subUrl of p.subImages) {
            if (subUrl) {
              await deleteFromCloudinary(subUrl).catch(err => console.warn("Delete subImage failed:", err));
            }
          }
        }
      }

      // Fetch all categories and delete their images from storage
      const categories = await Category.find({});
      for (const c of categories) {
        if (c.image) {
          await deleteFromCloudinary(c.image).catch(err => console.warn("Delete category image failed:", err));
        }
      }

      await Product.deleteMany({});
      await Category.deleteMany({});
      return jsonResponse(null, 200, { message: 'Database inventory (all products & categories) wiped successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // DELETE /api/admin/orders/:id
  if (action === 'orders') {
    const id = path[1];
    try {
      if (id === 'clear-dummy' || id === 'clear-all-dummy') {
        if (isDatabaseConnected) {
          await prisma.$executeRawUnsafe(`
            DELETE FROM "Order" 
            WHERE "id" IN ('ORD_140378', '140378', 'ord_1', 'ord_2', 'ord_3') 
               OR "email" ILIKE '%sheenaponnappan%' 
               OR "user" ILIKE '%sheena%ponnappan%';
          `).catch(() => {});
        }
        const filtered = memoryOrders.filter(o => {
          const oid = (o._id || o.id || '').toString().toLowerCase();
          return !['ord_1', 'ord_2', 'ord_3', 'ord_140378', '140378'].includes(oid) && 
                 !o.email?.toLowerCase()?.includes('sheenaponnappan') &&
                 !o.user?.toLowerCase()?.includes('sheena ponnappan');
        });
        memoryOrders.length = 0;
        filtered.forEach(o => memoryOrders.push(o));
        saveMemoryOrders();
        return jsonResponse(null, 200, { message: 'Dummy test orders cleared successfully' });
      }

      if (id) {
        if (isDatabaseConnected) {
          await prisma.order.deleteMany({
            where: {
              OR: [
                { id },
                { id: `ORD_${id}` }
              ]
            }
          }).catch(() => {});
        }
        const idx = memoryOrders.findIndex(o => (o._id || o.id) === id || (o._id || o.id) === `ORD_${id}`);
        if (idx > -1) {
          memoryOrders.splice(idx, 1);
          saveMemoryOrders();
        }
        return jsonResponse(null, 200, { message: 'Order deleted successfully' });
      }
      return errorResponse('Order ID required', 400);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // DELETE /api/admin/users/:id
  if (action === 'users') {
    const id = path[1];
    try {
      if (!isDatabaseConnected) {
        const index = memoryUsers.findIndex(u => u._id === id);
        if (index === -1) return errorResponse('User not found', 404);
        if (memoryUsers[index]._id === user._id) return errorResponse('You cannot delete your own administrator account', 400);

        memoryUsers.splice(index, 1);
        return jsonResponse(null, 200, { message: 'User account deleted successfully' });
      }

      const u = await User.findById(id);
      if (!u) return errorResponse('User not found', 404);
      if (u._id.toString() === user._id.toString()) return errorResponse('You cannot delete your own administrator account', 400);

      if (u.avatar) {
        await deleteFromCloudinary(u.avatar).catch(err => console.warn("Delete avatar failed:", err));
      }
      await User.findByIdAndDelete(id);
      return jsonResponse(null, 200, { message: 'User account deleted successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // DELETE /api/admin/contact-messages/:id
  if (action === 'contact-messages') {
    const id = path[1];
    try {
      if (!isDatabaseConnected) {
        const index = memoryContactMessages.findIndex(m => m._id === id);
        if (index === -1) return errorResponse('Message not found', 404);
        memoryContactMessages.splice(index, 1);
        return jsonResponse(null, 200, { message: 'Message deleted successfully' });
      }

      const message = await ContactMessage.findByIdAndDelete(id);
      if (!message) return errorResponse('Message not found', 404);

      return jsonResponse(null, 200, { message: 'Message deleted successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // DELETE /api/admin/newsletter-subscribers/:id
  if (action === 'newsletter-subscribers') {
    const id = path[1];
    try {
      if (!isDatabaseConnected) {
        const index = memoryNewsletterSubscribers.findIndex(s => s._id === id);
        if (index === -1) return errorResponse('Subscriber not found', 404);
        memoryNewsletterSubscribers.splice(index, 1);
        return jsonResponse(null, 200, { message: 'Subscriber removed successfully' });
      }

      const subscriber = await Newsletter.findByIdAndDelete(id);
      if (!subscriber) return errorResponse('Subscriber not found', 404);

      return jsonResponse(null, 200, { message: 'Subscriber removed successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // DELETE /api/admin/groups/:id
  if (action === 'groups') {
    const id = path[1];
    if (!id) return errorResponse('Group ID is required', 400);
    try {
      if (!isDatabaseConnected) {
        const index = memoryProductGroups.findIndex(g => g._id === id);
        if (index === -1) return errorResponse('Product Group not found', 404);
        memoryProductGroups.splice(index, 1);
        return jsonResponse(null, 200, { message: 'Product Group deleted from memory cache successfully' });
      }

      const deleted = await ProductGroup.findByIdAndDelete(id);
      if (!deleted) return errorResponse('Product Group not found', 404);
      return jsonResponse(null, 200, { message: 'Product Group deleted successfully' });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}
