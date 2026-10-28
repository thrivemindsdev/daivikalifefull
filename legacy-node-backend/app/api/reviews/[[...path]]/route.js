export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Review from '@/models/Review';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Product from '@/models/Product';
import { isDatabaseConnected, memoryUsers, memoryNotifications, memoryReviews, memoryProducts } from '@/lib/db';
import { sendPushNotification } from '@/lib/web-push-helper';
import { NextResponse } from 'next/server';
import { notifyAdmins } from '@/lib/admin-notifier';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// GET /api/reviews
export async function GET(req, { params }) {
  await initAPI();
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!isDatabaseConnected) {
      let list = memoryReviews;
      if (productId) {
        list = memoryReviews.filter(r => r.productId === productId);
      }
      return jsonResponse(list);
    }

    const query = {};
    if (productId) {
      query.productId = productId;
    }
    const list = await Review.find(query).sort({ createdAt: -1 });
    return jsonResponse(list);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// POST /api/reviews
// Supports:
// 1. POST /api/reviews/reply -> adds a reply to a review
// 2. POST /api/reviews/like -> increments likes count
// 3. POST /api/reviews -> creates a new review
export async function POST(req, { params }) {
  await initAPI();
  
  const path = (await params).path || [];
  const limited = rateLimit(`review:${path[0] || 'create'}:${clientIp(req)}`, path[0] === 'like' ? 60 : 15, 15 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json();

    // 1. Reply Action
    if (path.length > 0 && path[0] === 'reply') {
      const { reviewId, user: replyUser } = body;
      const text = String(body.text || '').trim().slice(0, 1000);
      if (!reviewId || !text) {
        return errorResponse('Missing reviewId or text/comment for reply.', 400);
      }

      // Only a signed-in admin can reply as the store; anyone else can't borrow the name or the badge
      let resolvedUser = String(replyUser || '').trim().slice(0, 60) || 'Guest User';
      if (/admin|daivika/i.test(resolvedUser)) resolvedUser = 'Guest User';
      let resolvedIsAdmin = false;

      const authUser = await getAuthenticatedUser(req).catch(() => null);
      if (authUser && authUser.role === 'admin') {
        resolvedUser = 'Admin';
        resolvedIsAdmin = true;
      }

      if (!isDatabaseConnected) {
        const review = memoryReviews.find(r => r._id === reviewId);
        if (!review) return errorResponse('Review not found in cache', 404);
        
        const newReply = {
          user: resolvedUser,
          text,
          isAdmin: resolvedIsAdmin,
          createdAt: new Date().toISOString()
        };
        review.replies = review.replies || [];
        review.replies.push(newReply);

        // Trigger memory notification to review author if they are a registered user
        if (review.email) {
          const authorUser = memoryUsers.find(u => u.email?.toLowerCase() === review.email.toLowerCase());
          if (authorUser && authorUser._id !== authUser?._id) {
            const notifTitle = 'New Reply on your Review 💬';
            const notifMessage = `${resolvedUser} replied to your review on ${review.productName}: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`;
            const notifLink = `/product/${review.productId}`;

            memoryNotifications.unshift({
              _id: 'notif_reply_' + Date.now(),
              userId: authorUser._id,
              title: notifTitle,
              message: notifMessage,
              type: 'review_reply',
              read: false,
              link: notifLink,
              createdAt: new Date().toISOString()
            });

            sendPushNotification(authorUser._id, notifTitle, notifMessage, notifLink).catch(console.error);
          }
        }

        return jsonResponse(review, 200, { message: 'Reply added successfully!' });
      }

      const review = await Review.findById(reviewId);
      if (!review) return errorResponse('Review not found', 404);

      review.replies.push({
        user: resolvedUser,
        text,
        isAdmin: resolvedIsAdmin,
        createdAt: new Date()
      });

      await review.save();

      // Trigger DB notification to review author if they are a registered user
      if (review.email) {
        try {
          const authorUser = await User.findOne({ email: review.email });
          if (authorUser && authorUser._id.toString() !== authUser?._id?.toString()) {
            await Notification.create({
              userId: authorUser._id.toString(),
              title: 'New Reply on your Review 💬',
              message: `${resolvedUser} replied to your review on ${review.productName}: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`,
              type: 'review_reply',
              link: `/product/${review.productId}`
            });
          }
        } catch (notifErr) {
          console.warn('Failed to save reply notification to DB:', notifErr);
        }
      }

      return jsonResponse(review, 200, { message: 'Reply added successfully!' });
    }

    // 2. Like Action
    if (path.length > 0 && path[0] === 'like') {
      const { reviewId, action } = body;
      if (!reviewId) return errorResponse('Missing reviewId.', 400);

      const isUnlike = action === 'unlike';

      if (!isDatabaseConnected) {
        const review = memoryReviews.find(r => r._id === reviewId);
        if (!review) return errorResponse('Review not found in cache', 404);
        review.likes = Math.max(0, (review.likes || 0) + (isUnlike ? -1 : 1));
        return jsonResponse(review, 200, { message: 'Likes updated successfully!' });
      }

      const review = await Review.findById(reviewId);
      if (!review) return errorResponse('Review not found', 404);

      review.likes = Math.max(0, (review.likes || 0) + (isUnlike ? -1 : 1));
      await review.save();
      return jsonResponse(review, 200, { message: 'Likes updated successfully!' });
    }

    // 3. Create Review Action
    const { productId, email, orderId } = body;
    const user = String(body.user || '').trim().slice(0, 60);
    const productName = String(body.productName || '').trim().slice(0, 200);
    const comment = String(body.comment || '').trim().slice(0, 2000);
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return errorResponse('Rating must be a whole number from 1 to 5.', 400);
    }

    let resolvedProductId = productId;
    if (!resolvedProductId && productName) {
      if (!isDatabaseConnected) {
        const found = memoryProducts.find(p => p.name.toLowerCase() === productName.toLowerCase());
        if (found) resolvedProductId = found._id;
      } else {
        const escaped = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const found = await Product.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
        if (found) resolvedProductId = found._id.toString();
      }
    }

    if (!resolvedProductId) {
      resolvedProductId = 'temp_prod_' + Date.now();
    }

    if (!user || !productName || !rating) {
      return errorResponse('Required review parameters (user, productName, rating) are missing.', 400);
    }

    const resolvedOrderId = orderId || 'ORD_' + Math.floor(100000 + Math.random() * 900000);
    const resolvedEmail = email || '';

    if (!isDatabaseConnected) {
      const newReview = {
        _id: 'rev_' + Date.now(),
        productId: resolvedProductId,
        user,
        email: resolvedEmail,
        productName,
        rating: Number(rating),
        comment: comment || '',
        orderId: resolvedOrderId,
        likes: 0,
        replies: [],
        createdAt: new Date().toISOString()
      };
      memoryReviews.unshift(newReview);

      notifyAdmins({
        title: 'New Review Submitted ⭐',
        message: `${user} gave ${rating} stars for ${productName}: "${comment || 'No comment'}"`,
        type: 'new_review',
        link: '/admin/dashboard?tab=product-reviews'
      }).catch(console.error);

      return jsonResponse(newReview, 201, { message: 'Review submitted successfully!' });
    }

    const exists = await Review.findOne({ email: resolvedEmail, productId: resolvedProductId, orderId: resolvedOrderId });
    if (exists) {
      exists.rating = Number(rating);
      exists.comment = comment || '';
      await exists.save();

      notifyAdmins({
        title: 'Review Updated ⭐',
        message: `${user} updated their review for ${productName} to ${rating} stars: "${comment || 'No comment'}"`,
        type: 'new_review',
        link: '/admin/dashboard?tab=product-reviews'
      }).catch(console.error);

      return jsonResponse(exists, 200, { message: 'Review updated successfully!' });
    }

    const review = await Review.create({
      productId: resolvedProductId,
      user,
      email: resolvedEmail,
      productName,
      rating: Number(rating),
      comment: comment || '',
      orderId: resolvedOrderId,
      likes: 0,
      replies: []
    });

    notifyAdmins({
      title: 'New Review Submitted ⭐',
      message: `${user} gave ${rating} stars for ${productName}: "${comment || 'No comment'}"`,
      type: 'new_review',
      link: '/admin/dashboard?tab=product-reviews'
    }).catch(console.error);

    return jsonResponse(review, 200, { message: 'Review submitted successfully!' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

// DELETE /api/reviews/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Review ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const idx = memoryReviews.findIndex(r => r._id === id);
      if (idx !== -1) {
        memoryReviews.splice(idx, 1);
        return jsonResponse(null, 200, { message: 'Review deleted successfully' });
      }
      return errorResponse('Review not found', 404);
    }

    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) {
      return errorResponse('Review not found', 404);
    }
    return jsonResponse(null, 200, { message: 'Review deleted successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}
