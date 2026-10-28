export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Size from '@/models/Size';
import { isDatabaseConnected, memorySizes } from '@/lib/db';

// GET /api/sizes
export async function GET(req, { params }) {
  await initAPI();
  try {
    if (!isDatabaseConnected) {
      return jsonResponse(memorySizes);
    }
    const sizes = await Size.find({}).sort({ createdAt: 1 });
    return jsonResponse(sizes);
  } catch (err) {
    return jsonResponse(memorySizes);
  }
}

// POST /api/sizes (Admin Only)
export async function POST(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  try {
    const body = await req.json().catch(() => ({}));
    const name = body.name;

    if (!name) return errorResponse('Size name is required', 400);

    const nameTrimmed = name.trim();

    if (!isDatabaseConnected) {
      const exists = memorySizes.find(s => s.name.toLowerCase() === nameTrimmed.toLowerCase());
      if (exists) return errorResponse('Size already exists', 400);

      const newSize = {
        _id: 'size_' + Date.now() + Math.random().toString(36).substr(2, 6),
        name: nameTrimmed,
        createdAt: new Date().toISOString()
      };
      memorySizes.push(newSize);
      return jsonResponse(newSize, 201, { message: 'Size created (Memory Mode)' });
    }

    const exists = await Size.findOne({ name: { $regex: new RegExp(`^${nameTrimmed}$`, 'i') } });
    if (exists) return errorResponse('Size already exists', 400);

    const size = await Size.create({ name: nameTrimmed });
    return jsonResponse(size, 201, { message: 'Size created' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// PUT /api/sizes/:id (Admin Only)
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Size ID is required', 400);
  const id = path[0];

  try {
    const body = await req.json().catch(() => ({}));
    const name = body.name;

    if (!name) return errorResponse('Size name is required', 400);

    const nameTrimmed = name.trim();

    if (!isDatabaseConnected) {
      const size = memorySizes.find(s => s._id === id);
      if (!size) return errorResponse('Size not found', 404);

      const exists = memorySizes.find(s => s.name.toLowerCase() === nameTrimmed.toLowerCase() && s._id !== id);
      if (exists) return errorResponse('Size name already exists', 400);

      size.name = nameTrimmed;
      return jsonResponse(size, 200, { message: 'Size updated (Memory Mode)' });
    }

    const size = await Size.findById(id);
    if (!size) return errorResponse('Size not found', 404);

    const exists = await Size.findOne({ name: { $regex: new RegExp(`^${nameTrimmed}$`, 'i') }, _id: { $ne: id } });
    if (exists) return errorResponse('Size name already exists', 400);

    size.name = nameTrimmed;
    await size.save();

    return jsonResponse(size, 200, { message: 'Size updated' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// DELETE /api/sizes/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Size ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const index = memorySizes.findIndex(s => s._id === id);
      if (index === -1) return errorResponse('Size not found', 404);
      
      memorySizes.splice(index, 1);
      return jsonResponse(null, 200, { message: 'Size deleted (Memory Mode)' });
    }

    const size = await Size.findById(id);
    if (!size) {
      const memIdx = memorySizes.findIndex(s => (s._id || s.id) === id);
      if (memIdx !== -1) {
        memorySizes.splice(memIdx, 1);
        return jsonResponse(null, 200, { message: 'Size deleted' });
      }
      return errorResponse('Size not found', 404);
    }

    if (typeof size.deleteOne === 'function') {
      await size.deleteOne();
    } else {
      await Size.findByIdAndDelete(id);
    }

    const memIdx = memorySizes.findIndex(s => (s._id || s.id) === id);
    if (memIdx !== -1) {
      memorySizes.splice(memIdx, 1);
    }

    return jsonResponse(null, 200, { message: 'Size deleted' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
