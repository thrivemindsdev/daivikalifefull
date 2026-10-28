import webpush from 'web-push';
import User from '@/models/User';
import { isDatabaseConnected, memoryUsers } from '@/lib/db';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@daivika.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('⚠️ Web Push: VAPID keys not configured in environment variables');
}

/**
 * Sends a push notification to a user's active device subscriptions.
 * Automatically cleans up dead or expired subscriptions.
 * 
 * @param {string} userId - ID of the target user
 * @param {string} title - Push Notification Title
 * @param {string} message - Push Notification Body Message
 * @param {string} [link] - Redirection URL path
 */
export async function sendPushNotification(userId, title, message, link = '/') {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ Web Push: Aborted push notification due to missing VAPID configuration');
    return { success: false, error: 'VAPID keys not configured' };
  }

  let subscriptions = [];

  // 1. Retrieve subscriptions
  if (isDatabaseConnected) {
    try {
      const dbUser = await User.findById(userId).select('pushSubscriptions');
      if (dbUser && dbUser.pushSubscriptions) {
        subscriptions = dbUser.pushSubscriptions;
      }
    } catch (dbErr) {
      console.error('Failed to query user subscriptions:', dbErr);
    }
  } else {
    // Online cache fallback
    const cachedUser = memoryUsers.find(u => u._id === userId);
    if (cachedUser && cachedUser.pushSubscriptions) {
      subscriptions = cachedUser.pushSubscriptions;
    }
  }

  if (subscriptions.length === 0) {
    console.log(`ℹ️ Web Push: No push subscriptions found for user: ${userId}`);
    return { success: true, sentCount: 0 };
  }

  console.log(`🚀 Web Push: Triggering push to ${subscriptions.length} devices for user: ${userId}`);
  
  const payload = JSON.stringify({
    title,
    body: message,
    link
  });

  const deadSubscriptions = [];
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      // Browser push servers expect endpoint, keys.p256dh and keys.auth
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        },
        payload
      );
    } catch (err) {
      // 410 Gone or 404 Not Found indicates subscription expired or unregistered
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`Removing expired subscription: ${sub.endpoint}`);
        deadSubscriptions.push(sub.endpoint);
      } else {
        console.error(`Failed to deliver push to endpoint ${sub.endpoint}:`, err);
      }
    }
  });

  await Promise.all(sendPromises);

  // 2. Clean up invalid subscriptions
  if (deadSubscriptions.length > 0) {
    if (isDatabaseConnected) {
      try {
        await User.findByIdAndUpdate(userId, {
          $pull: {
            pushSubscriptions: { endpoint: { $in: deadSubscriptions } }
          }
        });
      } catch (err) {
        console.error('Failed to clean up dead subscriptions in DB:', err);
      }
    } else {
      const cachedUser = memoryUsers.find(u => u._id === userId);
      if (cachedUser && cachedUser.pushSubscriptions) {
        cachedUser.pushSubscriptions = cachedUser.pushSubscriptions.filter(
          sub => !deadSubscriptions.includes(sub.endpoint)
        );
      }
    }
  }

  return { success: true, sentCount: subscriptions.length - deadSubscriptions.length };
}
