export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import PopularSearch from '@/models/PopularSearch';
import { isDatabaseConnected } from '@/lib/db';
import { NextResponse } from 'next/server';

const memoryPopularSearches = [
  { _id: 'pop1', query: 'Denim Jacket' },
  { _id: 'pop2', query: 'Linen Pants' },
  { _id: 'pop3', query: 'Satin Slip' }
];

// GET /api/popular-searches
export async function GET(req, { params }) {
  await initAPI();
  try {
    if (!isDatabaseConnected) {
      return jsonResponse(memoryPopularSearches);
    }
    const list = await PopularSearch.find({}).sort({ createdAt: -1 });
    return jsonResponse(list);
  } catch (err) {
    return jsonResponse(memoryPopularSearches);
  }
}

// POST /api/popular-searches (Admin Only)
export async function POST(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  try {
    const { query } = await req.json();
    if (!query) {
      return errorResponse('Search tag query is required.', 400);
    }

    if (!isDatabaseConnected) {
      const exists = memoryPopularSearches.find(s => s.query.toLowerCase() === query.toLowerCase());
      if (exists) {
        return errorResponse('Search tag already exists.', 400);
      }
      const newTag = { _id: 'pop_' + Date.now(), query };
      memoryPopularSearches.unshift(newTag);
      return jsonResponse(newTag, 201);
    }

    const exists = await PopularSearch.findOne({ query: { $regex: new RegExp(`^${query}$`, 'i') } });
    if (exists) {
      return errorResponse('Search tag already exists.', 400);
    }

    const newTag = await PopularSearch.create({ query });
    return jsonResponse(newTag, 201);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

// PUT /api/popular-searches/:id (Admin Only)
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Search tag ID is required', 400);
  const id = path[0];

  try {
    const { query } = await req.json();
    if (!query) {
      return errorResponse('Search tag query is required.', 400);
    }

    if (!isDatabaseConnected) {
      const idx = memoryPopularSearches.findIndex(s => s._id === id);
      if (idx !== -1) {
        memoryPopularSearches[idx].query = query;
        return jsonResponse(memoryPopularSearches[idx]);
      }
      return errorResponse('Search tag not found', 404);
    }

    const exists = await PopularSearch.findOne({
      query: { $regex: new RegExp(`^${query}$`, 'i') },
      _id: { $ne: id }
    });
    if (exists) {
      return errorResponse('Another search tag with this name already exists.', 400);
    }

    const updated = await PopularSearch.findByIdAndUpdate(
      id,
      { query },
      { new: true }
    );
    if (!updated) {
      return errorResponse('Search tag not found', 404);
    }
    return jsonResponse(updated);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

// DELETE /api/popular-searches/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Search tag ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const idx = memoryPopularSearches.findIndex(s => s._id === id);
      if (idx !== -1) {
        memoryPopularSearches.splice(idx, 1);
        return jsonResponse(null, 200, { message: 'Search tag removed successfully' });
      }
      return errorResponse('Search tag not found', 404);
    }

    const tag = await PopularSearch.findByIdAndDelete(id);
    if (!tag) {
      return errorResponse('Search tag not found', 404);
    }
    return jsonResponse(null, 200, { message: 'Search tag removed successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}
