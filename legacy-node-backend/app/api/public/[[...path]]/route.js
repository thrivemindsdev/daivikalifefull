export const dynamic = 'force-dynamic';

import { initAPI, errorResponse, jsonResponse } from '@/lib/api-middleware';
import ContactMessage from '@/models/ContactMessage';
import Newsletter from '@/models/Newsletter';
import Banner from '@/models/Banner';
import Setting from '@/models/Setting';
import prisma from '@/lib/prisma';
import { isDatabaseConnected, memoryContactMessages, memoryNewsletterSubscribers, memoryBanners, memorySettings } from '@/lib/db';
import { NextResponse } from 'next/server';
import { notifyAdmins } from '@/lib/admin-notifier';
import { listAllOrders, isConfirmedOrder } from '@/lib/vendor-routing';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { lookupPincode } from '@/lib/pincode';

const PRIVATE_SETTING_KEYS = ['meta_pixel_settings', 'meta_pixel_events_log', 'vendor_system'];

// GET /api/public/banners, /api/public/settings, /api/public/bestsellers
export async function GET(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const action = path[0];

  // GET /api/public/bestsellers -> [{ productId, sold }] by units sold in confirmed orders
  if (action === 'bestsellers') {
    try {
      const sold = new Map();
      for (const o of await listAllOrders()) {
        if (!isConfirmedOrder(o)) continue;
        for (const it of o.itemsList || []) {
          if (it.isFreeGift) continue;
          const id = (it.productId || it._id || '').toString();
          if (id) sold.set(id, (sold.get(id) || 0) + (parseInt(it.qty || it.quantity || 1, 10) || 1));
        }
      }
      const rows = [...sold].map(([productId, count]) => ({ productId, sold: count })).sort((a, b) => b.sold - a.sold).slice(0, 24);
      const res = jsonResponse(rows);
      res.headers.set('Cache-Control', 'public, max-age=300');
      return res;
    } catch (err) {
      return jsonResponse([]);
    }
  }

  if (action === 'banners') {
    try {
      const isLegacyDummyUrl = (url) => {
        if (!url || typeof url !== 'string') return true;
        const u = url.toLowerCase();
        return u.includes('/assets/b1') || 
               u.includes('/assets/b2') || 
               u.includes('/assets/b3') || 
               u.includes('/assets/slide') || 
               u.includes('unsplash.com');
      };

      const sanitizeBannerList = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map(b => {
          const img = isLegacyDummyUrl(b.image) ? '' : b.image;
          const mob = isLegacyDummyUrl(b.mobileImage) ? '' : b.mobileImage;
          return {
            ...b,
            image: img || mob,
            mobileImage: mob || img
          };
        }).filter(b => Boolean(b.image || b.mobileImage));
      };

      if (process.env.DATABASE_URL || isDatabaseConnected) {
        const banners = await prisma.banner.findMany({ orderBy: { createdAt: 'asc' } }).catch(() => []);
        const rawBanners = (Array.isArray(banners) && banners.length > 0) ? banners : memoryBanners;
        const sanitized = sanitizeBannerList(rawBanners);
        const res = jsonResponse(sanitized);
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        return res;
      }

      const finalBanners = sanitizeBannerList(memoryBanners);
      const res = jsonResponse(finalBanners);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res;
    } catch (err) {
      console.error('Get Banners Error:', err);
      const res = jsonResponse(memoryBanners);
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res;
    }
  }

  // GET /api/public/pincode/:pin -> { state, district, city } for checkout address autofill
  if (action === 'pincode') {
    const limited = rateLimit(`public:pincode:${clientIp(req)}`, 60, 15 * 60 * 1000);
    if (limited) return limited;
    try {
      const found = await lookupPincode(String(path[1] || ''));
      if (!found) return errorResponse('PIN code not found', 404);
      const res = jsonResponse(found);
      res.headers.set('Cache-Control', 'public, max-age=86400');
      return res;
    } catch (err) {
      return errorResponse('PIN code lookup is unavailable right now', 503);
    }
  }

  // GET /api/public/settings
  if (action === 'settings') {
    try {
      // Settings the storefront never needs (API tokens, event logs, internal vendor config) stay private
      const isPrivate = (key) => PRIVATE_SETTING_KEYS.includes(key) || /secret|token|password|_log$/i.test(key);
      const rows = isDatabaseConnected ? await Setting.find({}) : memorySettings;
      const result = {};
      rows.forEach(s => { if (!isPrivate(s.key)) result[s.key] = s.value; });
      return jsonResponse(result);
    } catch (err) {
      return jsonResponse({ free_shipping_threshold: 600 });
    }
  }

  return errorResponse('API endpoint not found', 404);
}

// POST /api/public/contact, /api/public/newsletter
export async function POST(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  const action = path[0];
  const limited = rateLimit(`public:${action}:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (limited) return limited;

  if (action === 'contact') {
    try {
      const { name, email, subject, message } = await req.json();

      if (!name || !email || !message) {
        return errorResponse('Please provide all required fields (Name, Email, and Message).', 400);
      }

      if (!isDatabaseConnected) {
        const newMessage = {
          _id: 'mem_' + Date.now() + Math.random().toString(36).substr(2, 5),
          name,
          email,
          subject: subject || 'General Inquiry',
          message,
          status: 'unread',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memoryContactMessages.push(newMessage);

        notifyAdmins({
          title: 'New Lead Message 💬',
          message: `Inquiry from ${name} (${email}) on "${subject || 'General Inquiry'}": "${message.length > 60 ? message.substring(0, 60) + '...' : message}"`,
          type: 'new_lead',
          link: '/admin/dashboard?tab=leads-inbox'
        }).catch(console.error);

        return jsonResponse(newMessage, 201, {
          message: 'Your inquiry has been received (Memory Mode)! We will get back to you shortly.'
        });
      }

      const newMessage = await ContactMessage.create({
        name,
        email,
        subject: subject || 'General Inquiry',
        message
      });

      notifyAdmins({
        title: 'New Lead Message 💬',
        message: `Inquiry from ${name} (${email}) on "${subject || 'General Inquiry'}": "${message.length > 60 ? message.substring(0, 60) + '...' : message}"`,
        type: 'new_lead',
        link: '/admin/dashboard?tab=leads-inbox'
      }).catch(console.error);

      return jsonResponse(newMessage, 201, {
        message: 'Your inquiry has been received! Our concierge team will contact you shortly.'
      });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  if (action === 'newsletter') {
    try {
      const { email } = await req.json();
      if (!email) {
        return errorResponse('Please provide a valid email address.', 400);
      }

      const emailTrim = email.trim().toLowerCase();

      if (!isDatabaseConnected) {
        const exists = memoryNewsletterSubscribers.find(s => s.email === emailTrim);
        if (exists) {
          return errorResponse('This email is already subscribed to our luxury drops!', 400);
        }

        const subscriber = {
          _id: 'mem_' + Date.now() + Math.random().toString(36).substr(2, 5),
          email: emailTrim,
          status: 'subscribed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        memoryNewsletterSubscribers.push(subscriber);

        notifyAdmins({
          title: 'New Newsletter Subscriber 📧',
          message: `${emailTrim} subscribed to Daivika premium drop announcements.`,
          type: 'new_subscriber',
          link: '/admin/dashboard?tab=leads-inbox'
        }).catch(console.error);

        return jsonResponse(subscriber, 201, {
          message: 'Successfully subscribed to Daivika premium drop announcements!'
        });
      }

      const exists = await Newsletter.findOne({ email: emailTrim });
      if (exists) {
        if (exists.status === 'unsubscribed') {
          exists.status = 'subscribed';
          await exists.save();

          notifyAdmins({
            title: 'Newsletter Subscribed (Reactivated) 📧',
            message: `${emailTrim} reactivated their newsletter subscription.`,
            type: 'new_subscriber',
            link: '/admin/dashboard?tab=leads-inbox'
          }).catch(console.error);

          return jsonResponse(exists, 200, {
            message: 'Welcome back! Your subscription has been reactivated successfully.'
          });
        }
        return errorResponse('This email is already subscribed to our luxury drops!', 400);
      }

      const subscriber = await Newsletter.create({
        email: emailTrim
      });

      notifyAdmins({
        title: 'New Newsletter Subscriber 📧',
        message: `${emailTrim} subscribed to Daivika premium drop announcements.`,
        type: 'new_subscriber',
        link: '/admin/dashboard?tab=leads-inbox'
      }).catch(console.error);

      return jsonResponse(subscriber, 201, {
        message: 'Successfully subscribed to Daivika premium drop announcements!'
      });
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  return errorResponse('API endpoint not found', 404);
}
