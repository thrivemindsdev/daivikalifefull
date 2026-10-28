import { loadStoreSettings } from '@/lib/order-pricing';
import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { isDatabaseConnected, memoryNotifications, memoryUsers } from '@/lib/db';
import { sendPushNotification } from '@/lib/web-push-helper';

// GET /api/notifications  — fetch logged-in user's notifications
// GET /api/notifications/broadcast — admin: fetch all past broadcast notifications
export async function GET(req, { params }) {
  await initAPI();
  try {
    const user = await getAuthenticatedUser(req).catch(() => null);
    const path = (await params).path || [];

    // Public guest notifications (if not logged in)
    if (!user) {
      if (path[0] === 'broadcast') {
        return errorResponse('Not authorized as admin', 401);
      }
      const { freeShippingThreshold } = await loadStoreSettings();
      const publicNotifications = [
        {
          _id: 'notif_public_1',
          title: 'Welcome to Daivika! 🛍️',
          message: 'Discover sacred essentials — Karungali, Rudraksha, crystals and pooja items — delivered across India.',
          type: 'general',
          read: false,
          link: '/products',
          createdAt: new Date().toISOString()
        },
        ...(freeShippingThreshold > 0 ? [{
          _id: 'notif_public_2',
          title: 'Free Delivery 🚚',
          message: `Free shipping on orders of ₹${freeShippingThreshold.toLocaleString('en-IN')} or more.`,
          type: 'promotion',
          read: false,
          link: '/products',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }] : [])
      ];
      return jsonResponse(publicNotifications);
    }

    const userId = user._id || user.id;

    // GET /api/notifications/broadcast — admin only: return broadcast history
    if (path[0] === 'broadcast') {
      if (user.role !== 'admin') return errorResponse('Not authorized as admin', 401);

      if (!isDatabaseConnected) {
        // Return unique broadcasts from memory (grouped by broadcastId field)
        const broadcasts = memoryNotifications
          .filter(n => n.broadcastId)
          .reduce((acc, n) => {
            if (!acc.find(b => b.broadcastId === n.broadcastId)) {
              acc.push({
                broadcastId: n.broadcastId,
                title: n.title,
                message: n.message,
                link: n.link,
                type: n.type,
                recipientCount: memoryNotifications.filter(x => x.broadcastId === n.broadcastId).length,
                createdAt: n.createdAt
              });
            }
            return acc;
          }, [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return jsonResponse(broadcasts);
      }

      // DB mode: find all notifications with a broadcastId, group by broadcastId
      const broadcastDocs = await Notification.find({ broadcastId: { $exists: true, $ne: '' } }).sort({ createdAt: -1 });
      const grouped = [];
      const seen = new Set();
      for (const n of broadcastDocs) {
        if (!seen.has(n.broadcastId)) {
          seen.add(n.broadcastId);
          const count = await Notification.countDocuments({ broadcastId: n.broadcastId });
          grouped.push({
            broadcastId: n.broadcastId,
            title: n.title,
            message: n.message,
            link: n.link,
            type: n.type,
            recipientCount: count,
            createdAt: n.createdAt
          });
        }
      }
      return jsonResponse(grouped);
    }

    // Default: return user's own notifications
    if (!isDatabaseConnected) {
      let list = memoryNotifications
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (list.length === 0) {
        const defaultNotifs = [
          {
            _id: 'notif_welcome_' + userId,
            userId: userId,
            title: 'Welcome to Daivika! 🎉',
            message: 'Thank you for joining Daivika. Explore our premium collection today!',
            type: 'welcome',
            read: false,
            link: '/',
            createdAt: new Date().toISOString()
          },
          {
            _id: 'notif_promo_' + userId,
            userId: userId,
            title: 'Exclusive 10% OFF 🏷️',
            message: 'Use code DAIVIKA10 to get 10% instant discount on your order.',
            type: 'promotion',
            read: false,
            link: '/',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        memoryNotifications.push(...defaultNotifs);
        list = defaultNotifs;
      }
      return jsonResponse(list);
    }

    let list = await Notification.find({ userId }).sort({ createdAt: -1 });
    if (list.length === 0) {
      try {
        const defaultNotifs = [
          {
            userId,
            title: 'Welcome to Daivika! 🎉',
            message: 'Thank you for joining Daivika. Explore our premium collection today!',
            type: 'welcome',
            read: false,
            link: '/'
          },
          {
            userId,
            title: 'Exclusive 10% OFF 🏷️',
            message: 'Use code DAIVIKA10 to get 10% instant discount on your order.',
            type: 'promotion',
            read: false,
            link: '/'
          }
        ];
        list = await Notification.insertMany(defaultNotifs);
      } catch (e) {
        console.error('Failed to seed user default notifications:', e);
      }
    }
    return jsonResponse(list);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// POST /api/notifications/[[...path]]
export async function POST(req, { params }) {
  await initAPI();
  try {
    const user = await getAuthenticatedUser(req).catch(() => null);
    const path = (await params).path || [];
    const body = await req.json().catch(() => ({}));

    // Action: Read / Mark All Read (Supports guests)
    if (path.length > 0 && path[0] === 'read') {
      if (!user) {
        return jsonResponse({ success: true, message: 'Notifications marked as read' });
      }
      const authenticatedUserId = user._id || user.id;
      const { notificationId, markAllRead } = body;

      if (!isDatabaseConnected) {
        if (markAllRead) {
          memoryNotifications.forEach(n => {
            if (n.userId === authenticatedUserId) n.read = true;
          });
        } else if (notificationId) {
          const found = memoryNotifications.find(n => n._id === notificationId && n.userId === authenticatedUserId);
          if (found) found.read = true;
        }
        return jsonResponse({ success: true, message: 'Notifications marked as read' });
      }

      if (markAllRead) {
        await Notification.updateMany({ userId: authenticatedUserId, read: false }, { $set: { read: true } });
      } else if (notificationId) {
        await Notification.findOneAndUpdate({ _id: notificationId, userId: authenticatedUserId }, { $set: { read: true } });
      }
      return jsonResponse({ success: true, message: 'Notifications marked as read' });
    }

    // Action: Subscribe to Web Push
    if (path.length > 0 && path[0] === 'subscribe') {
      const { subscription } = body;
      if (!subscription || !subscription.endpoint) {
        return errorResponse('Missing subscription object or endpoint.', 400);
      }

      if (!isDatabaseConnected) {
        const cachedUser = memoryUsers.find(u => u._id === authenticatedUserId);
        if (cachedUser) {
          if (!cachedUser.pushSubscriptions) cachedUser.pushSubscriptions = [];
          const exists = cachedUser.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
          if (!exists) {
            cachedUser.pushSubscriptions.push(subscription);
          }
        }
        return jsonResponse({ success: true, message: 'Subscribed in cache successfully' });
      }

      const dbUser = await User.findById(authenticatedUserId);
      if (!dbUser) return errorResponse('User not found', 404);

      if (!dbUser.pushSubscriptions) dbUser.pushSubscriptions = [];
      const exists = dbUser.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
      if (!exists) {
        dbUser.pushSubscriptions.push(subscription);
        await dbUser.save();
      }

      return jsonResponse({ success: true, message: 'Subscribed to push notifications successfully' });
    }

    // Action: Broadcast to ALL users (admin only)
    if (path.length > 0 && path[0] === 'broadcast') {
      if (!isAdmin) return errorResponse('Not authorized as admin', 401);

      const { title, message, type, link } = body;
      if (!title || !message) return errorResponse('Missing title or message.', 400);

      const broadcastId = 'bcast_' + Date.now();
      const notifType = type || 'general';
      const notifLink = link || '';

      if (!isDatabaseConnected) {
        const targetUsers = memoryUsers.filter(u => u.role !== 'admin');
        const created = [];
        for (const u of targetUsers) {
          const notif = {
            _id: 'notif_' + Date.now() + '_' + u._id,
            userId: u._id,
            title,
            message,
            type: notifType,
            read: false,
            link: notifLink,
            broadcastId,
            createdAt: new Date().toISOString()
          };
          memoryNotifications.unshift(notif);
          created.push(notif);
        }
        return jsonResponse({ success: true, broadcastId, recipientCount: created.length }, 201);
      }

      // DB mode: get all non-admin users
      const allUsers = await User.find({ role: { $ne: 'admin' } }).select('_id');
      const docs = allUsers.map(u => ({
        userId: u._id.toString(),
        title,
        message,
        type: notifType,
        read: false,
        link: notifLink,
        broadcastId
      }));

      if (docs.length > 0) {
        await Notification.insertMany(docs);
        // Fire push notifications in background (non-blocking)
        for (const u of allUsers) {
          sendPushNotification(u._id.toString(), title, message, notifLink).catch(() => {});
        }
      }

      return jsonResponse({ success: true, broadcastId, recipientCount: docs.length }, 201);
    }

    // Creating a single notification (can be called internally by other API routers)
    const { title, message, type, link, userId } = body;
    if (!title || !message) {
      return errorResponse('Missing title or message.', 400);
    }

    const targetUserId = (isAdmin && userId) ? userId : authenticatedUserId;

    if (!isDatabaseConnected) {
      const newNotif = {
        _id: 'notif_' + Date.now(),
        userId: targetUserId,
        title,
        message,
        type: type || 'general',
        read: false,
        link: link || '',
        createdAt: new Date().toISOString()
      };
      memoryNotifications.unshift(newNotif);
      sendPushNotification(targetUserId, title, message, link).catch(console.error);
      return jsonResponse(newNotif, 201);
    }

    const notif = await Notification.create({
      userId: targetUserId,
      title,
      message,
      type: type || 'general',
      read: false,
      link: link || ''
    });
    sendPushNotification(targetUserId, title, message, link).catch(console.error);
    return jsonResponse(notif, 201);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
