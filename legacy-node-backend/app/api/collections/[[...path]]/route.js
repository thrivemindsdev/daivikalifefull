export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Collection from '@/models/Collection';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { isDatabaseConnected, memoryCollections, memoryCategories, memoryProducts } from '@/lib/db';
import { uploadToCloudinaryOrLocal, deleteFromCloudinary } from '@/lib/cloudinary';

// GET /api/collections
export async function GET(req, { params }) {
  await initAPI();
  try {
    if (!isDatabaseConnected) {
      return jsonResponse(memoryCollections);
    }
    const collections = await Collection.find({}).sort({ createdAt: 1 });
    return jsonResponse(collections);
  } catch (err) {
    return jsonResponse(memoryCollections);
  }
}

// POST /api/collections (Admin Only)
export async function POST(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const imageFile = formData.get('image');

    if (!name) return errorResponse('Collection name is required', 400);

    const nameLower = name.trim().toLowerCase();

    let imageUrl = '';
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/collections');
    }

    if (!isDatabaseConnected) {
      const exists = memoryCollections.find(c => c.name.toLowerCase() === nameLower);
      if (exists) return errorResponse('Collection already exists', 400);

      const newCol = {
        _id: 'col_' + Date.now() + Math.random().toString(36).substr(2, 6),
        name: nameLower,
        image: imageUrl,
        createdAt: new Date().toISOString()
      };
      memoryCollections.push(newCol);
      return jsonResponse(newCol, 201, { message: 'Collection created (Memory Mode)' });
    }

    const exists = await Collection.findOne({ name: nameLower });
    if (exists) return errorResponse('Collection already exists', 400);

    const collection = await Collection.create({ name: nameLower, image: imageUrl });
    return jsonResponse(collection, 201, { message: 'Collection created' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// PUT /api/collections/:id (Admin Only)
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Collection ID is required', 400);
  const id = path[0];

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const imageFile = formData.get('image');

    if (!name) return errorResponse('Collection name is required', 400);

    const nameLower = name.trim().toLowerCase();

    let imageUrl = '';
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/collections');
    }

    if (!isDatabaseConnected) {
      const collection = memoryCollections.find(c => c._id === id);
      if (!collection) return errorResponse('Collection not found', 404);

      const exists = memoryCollections.find(c => c.name.toLowerCase() === nameLower && c._id !== id);
      if (exists) return errorResponse('Collection name already exists', 400);

      const oldName = collection.name;
      collection.name = nameLower;
      if (imageUrl) {
        collection.image = imageUrl;
      }

      // Cascade update to memory categories
      memoryCategories.forEach(cat => {
        if (cat.gender && cat.gender.toLowerCase() === oldName) {
          cat.gender = nameLower;
        }
      });

      // Cascade update to memory products
      memoryProducts.forEach(prod => {
        if (prod.gender && prod.gender.toLowerCase() === oldName) {
          prod.gender = nameLower;
        }
      });

      return jsonResponse(collection, 200, { message: 'Collection updated (Memory Mode)' });
    }

    const collection = await Collection.findById(id);
    if (!collection) return errorResponse('Collection not found', 404);

    const exists = await Collection.findOne({ name: nameLower, _id: { $ne: id } });
    if (exists) return errorResponse('Collection name already exists', 400);

    const oldName = collection.name;
    collection.name = nameLower;
    if (imageUrl) {
      if (collection.image) {
        await deleteFromCloudinary(collection.image);
      }
      collection.image = imageUrl;
    }
    await collection.save();

    // Cascade update to categories
    await Category.updateMany({ gender: oldName }, { gender: nameLower });

    // Cascade update to products
    await Product.updateMany({ gender: oldName }, { gender: nameLower });

    return jsonResponse(collection, 200, { message: 'Collection updated & cascaded' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// DELETE /api/collections/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Collection ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const index = memoryCollections.findIndex(c => c._id === id);
      if (index === -1) return errorResponse('Collection not found', 404);
      
      const oldName = memoryCollections[index].name;
      memoryCollections.splice(index, 1);

      // Cascade delete/update in memory
      for (let i = memoryCategories.length - 1; i >= 0; i--) {
        if (memoryCategories[i].gender && memoryCategories[i].gender.toLowerCase() === oldName) {
          memoryCategories.splice(i, 1);
        }
      }

      for (let i = memoryProducts.length - 1; i >= 0; i--) {
        if (memoryProducts[i].gender && memoryProducts[i].gender.toLowerCase() === oldName) {
          memoryProducts.splice(i, 1);
        }
      }

      return jsonResponse(null, 200, { message: 'Collection deleted (Memory Mode)' });
    }

    const collection = await Collection.findById(id);
    if (!collection) return errorResponse('Collection not found', 404);

    const oldName = collection.name;

    // Delete image from storage
    if (collection.image) {
      await deleteFromCloudinary(collection.image).catch(() => {});
    }

    if (typeof collection.deleteOne === 'function') {
      await collection.deleteOne();
    } else {
      await Collection.findByIdAndDelete(id);
    }

    // Delete categories under this collection
    await Category.deleteMany({ gender: oldName }).catch(() => {});

    // Delete products under this collection
    await Product.deleteMany({ gender: oldName }).catch(() => {});

    // Sync memory cache
    const memIdx = memoryCollections.findIndex(c => (c._id || c.id) === id);
    if (memIdx !== -1) {
      memoryCollections.splice(memIdx, 1);
    }

    return jsonResponse(null, 200, { message: 'Collection deleted & cascaded' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
