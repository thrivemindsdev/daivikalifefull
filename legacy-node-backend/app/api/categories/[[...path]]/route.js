export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Category from '@/models/Category';
import Product from '@/models/Product';
import { isDatabaseConnected, memoryCategories, saveMemoryCategories, memoryProducts } from '@/lib/db';
import { uploadToCloudinaryOrLocal, deleteFromCloudinary } from '@/lib/cloudinary';
import { NextResponse } from 'next/server';
import { cleanExtraCategories } from '@/lib/product-categories';

// Subcategory names as the admin typed them: trimmed, no blanks, no case-insensitive duplicates
const cleanSubcategories = (list) => {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(s => String(typeof s === 'object' && s ? s.name : s || '').trim().replace(/\s+/g, ' ').slice(0, 60))
    .filter(s => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .slice(0, 100);
};

// Products keep their subcategory as lowercase text; clear it when that subcategory is removed from the category
const removedSubcategories = (before, after) => {
  const keep = new Set(after.map(s => s.toLowerCase()));
  return cleanSubcategories(before).map(s => s.toLowerCase()).filter(s => !keep.has(s));
};

// Keeps products' extra categories in step with a renamed, trimmed or deleted category:
// renames the category, clears removed subcategories, and drops the placement when the category is deleted.
async function syncExtraPlacements(oldName, { newName = oldName, removedSubs = [], deleted = false }) {
  const old = String(oldName || '').toLowerCase();
  const next = (product) => {
    const list = Array.isArray(product.extraCategories) ? product.extraCategories : [];
    if (!list.some(e => String(e?.category || '').toLowerCase() === old)) return null;
    const updated = list.flatMap(e => {
      if (String(e?.category || '').toLowerCase() !== old) return [e];
      if (deleted) return [];
      const sub = String(e.subcategory || '').toLowerCase();
      return [{ category: newName.toLowerCase(), subcategory: removedSubs.includes(sub) ? '' : sub }];
    });
    const cleaned = cleanExtraCategories(updated, product.category, product.subcategory);
    return JSON.stringify(cleaned) === JSON.stringify(list) ? null : cleaned;
  };

  if (!isDatabaseConnected) {
    memoryProducts.forEach(p => { const n = next(p); if (n) p.extraCategories = n; });
    return;
  }
  const products = await Product.find({});
  for (const p of products) {
    const n = next(p);
    if (n) await Product.findByIdAndUpdate(p._id || p.id, { extraCategories: n });
  }
}

// Category changes rewrite products (renamed category, cleared subcategories, extra placements),
// so drop the short-lived product response cache kept by the products API
const clearProductCache = () => globalThis.__productResponseCache?.clear();

// GET /api/categories
export async function GET(req, { params }) {
  await initAPI();
  try {
    if (!isDatabaseConnected) {
      return jsonResponse([...memoryCategories].reverse());
    }
    const categories = await Category.find({}).sort({ createdAt: -1 });
    return jsonResponse(categories);
  } catch (err) {
    return jsonResponse([...memoryCategories].reverse());
  }
}

// POST /api/categories (Admin Only)
export async function POST(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const rawGender = formData.get('gender');
    // Daivika is the only store: the old 'jewels' store is saved as 'daivika'
    const gender = rawGender && /^jewels?$/i.test(String(rawGender).trim()) ? 'daivika' : rawGender;
    const imageFile = formData.get('image');
    const subcategoriesStr = formData.get('subcategories');

    if (!name) return errorResponse('Category name is required', 400);

    let subcategories = [];
    if (subcategoriesStr) {
      try {
        subcategories = cleanSubcategories(JSON.parse(subcategoriesStr));
      } catch (e) {
        console.error('Failed to parse subcategories JSON in POST', e);
      }
    }

    let imageUrl = '';
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/categories');
    }

    if (!isDatabaseConnected) {
      const exists = memoryCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (exists) return errorResponse('Category already exists', 400);

      const newCat = {
        _id: 'cat_' + Date.now() + Math.random().toString(36).substr(2, 6),
        name: name.toLowerCase(),
        image: imageUrl,
        gender: gender || 'all',
        subcategories: subcategories,
        createdAt: new Date().toISOString()
      };
      memoryCategories.push(newCat);
      saveMemoryCategories();
      return jsonResponse(newCat, 201, { message: 'Category created (Memory Mode)' });
    }

    const exists = await Category.findOne({ name: name.toLowerCase() });
    if (exists) return errorResponse('Category already exists', 400);

    const category = await Category.create({ 
      name: name.toLowerCase(), 
      image: imageUrl, 
      gender: gender || 'all',
      subcategories: subcategories
    });
    return jsonResponse(category, 201, { message: 'Category created' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// PUT /api/categories/:id (Admin Only)
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Category ID is required', 400);
  const id = path[0];

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const rawGender = formData.get('gender');
    // Daivika is the only store: the old 'jewels' store is saved as 'daivika'
    const gender = rawGender && /^jewels?$/i.test(String(rawGender).trim()) ? 'daivika' : rawGender;
    const imageFile = formData.get('image');
    const subcategoriesStr = formData.get('subcategories');

    if (!name) return errorResponse('Category name is required', 400);

    let subcategories = null;
    if (subcategoriesStr) {
      try {
        subcategories = cleanSubcategories(JSON.parse(subcategoriesStr));
      } catch (e) {
        console.error('Failed to parse subcategories JSON in PUT', e);
      }
    }

    let imageUrl = '';
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/categories');
    }

    if (!isDatabaseConnected) {
      const category = memoryCategories.find(c => c._id === id);
      if (!category) return errorResponse('Category not found', 404);

      const exists = memoryCategories.find(c => c.name.toLowerCase() === name.toLowerCase() && c._id !== id);
      if (exists) return errorResponse('Category name already exists', 400);

      const oldName = category.name;
      const removed = subcategories ? removedSubcategories(category.subcategories, subcategories) : [];
      category.name = name.toLowerCase();
      if (gender) category.gender = gender;
      if (imageUrl) category.image = imageUrl;
      if (subcategories) category.subcategories = subcategories;

      // Cascade update to memory products
      memoryProducts.forEach(prod => {
        if (prod.category && prod.category.toLowerCase() === oldName.toLowerCase()) {
          prod.category = name.toLowerCase();
          if (removed.includes(String(prod.subcategory || '').toLowerCase())) prod.subcategory = '';
        }
      });
      await syncExtraPlacements(oldName, { newName: name, removedSubs: removed });
      clearProductCache();

      saveMemoryCategories();
      return jsonResponse(category, 200, { message: 'Category updated (Memory Mode)' });
    }

    const category = await Category.findById(id);
    if (!category) return errorResponse('Category not found', 404);

    const exists = await Category.findOne({ name: name.toLowerCase(), _id: { $ne: id } });
    if (exists) return errorResponse('Category name already exists', 400);

    const oldName = category.name;
    const removed = subcategories ? removedSubcategories(category.subcategories, subcategories) : [];
    category.name = name.toLowerCase();
    if (gender) category.gender = gender;
    if (imageUrl) {
      if (category.image) {
        await deleteFromCloudinary(category.image);
      }
      category.image = imageUrl;
    }
    if (subcategories) category.subcategories = subcategories;
    await category.save();

    // Cascade update to products
    await Product.updateMany({ category: oldName }, { category: name.toLowerCase() });
    for (const sub of removed) {
      await Product.updateMany({ category: name.toLowerCase(), subcategory: sub }, { subcategory: '' });
    }
    await syncExtraPlacements(oldName, { newName: name, removedSubs: removed });
    clearProductCache();

    return jsonResponse(category, 200, { message: 'Category updated' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// DELETE /api/categories/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Category ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const index = memoryCategories.findIndex(c => c._id === id);
      if (index === -1) return errorResponse('Category not found', 404);
      const oldName = memoryCategories[index].name;
      memoryCategories.splice(index, 1);

      // Cascade delete products in memory
      for (let i = memoryProducts.length - 1; i >= 0; i--) {
        if (memoryProducts[i].category && memoryProducts[i].category.toLowerCase() === oldName.toLowerCase()) {
          memoryProducts.splice(i, 1);
        }
      }
      // Products only listed here as an extra category stay, without this placement
      await syncExtraPlacements(oldName, { deleted: true });
      clearProductCache();

      saveMemoryCategories();
      return jsonResponse(null, 200, { message: 'Category deleted (Memory Mode)' });
    }

    const category = await Category.findById(id);
    if (!category) return errorResponse('Category not found', 404);

    const oldName = category.name;
    if (category.image) {
      await deleteFromCloudinary(category.image).catch(() => {});
    }
    if (typeof category.deleteOne === 'function') {
      await category.deleteOne();
    } else {
      await Category.findByIdAndDelete(id);
    }

    // Cascade delete products
    await Product.deleteMany({ category: oldName }).catch(() => {});
    // Products only listed here as an extra category stay, without this placement
    await syncExtraPlacements(oldName, { deleted: true }).catch(err => console.warn('Extra category cleanup failed:', err.message));
    clearProductCache();

    // Sync memory cache
    const memIdx = memoryCategories.findIndex(c => (c._id || c.id) === id);
    if (memIdx !== -1) {
      memoryCategories.splice(memIdx, 1);
      saveMemoryCategories();
    }

    return jsonResponse(null, 200, { message: 'Category deleted' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
