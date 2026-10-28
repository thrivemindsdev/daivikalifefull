export const dynamic = 'force-dynamic';

import { initAPI, getAuthenticatedUser, errorResponse, jsonResponse } from '@/lib/api-middleware';
import Product from '@/models/Product';
import Review from '@/models/Review';
import ProductGroup from '@/models/ProductGroup';
import { isDatabaseConnected, memoryProducts, saveMemoryProducts, connectDB, memoryReviews, memoryProductGroups } from '@/lib/db';
import { uploadToCloudinaryOrLocal, deleteFromCloudinary } from '@/lib/cloudinary';
import { NextResponse } from 'next/server';
import { productEvents } from '@/lib/events';
import { notifyAdmins } from '@/lib/admin-notifier';
import { getVendorStockTotals, withVendorStock } from '@/lib/vendor-store';
import { cleanExtraCategories } from '@/lib/product-categories';

// helper to parse input strings safely
const parseJsonField = (field) => {
  if (!field) return [];
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch (e) {
    console.warn("Failed to parse field", e);
    return [];
  }
};

// Long-form product content fields, sent as plain text by the admin product form
const DETAIL_FIELDS = ['shortDescription', 'benefits', 'astrologySignificance', 'howToWear'];
const readDetailFields = (formData) => Object.fromEntries(
  DETAIL_FIELDS.filter(k => formData.get(k) !== null).map(k => [k, String(formData.get(k)).trim()])
);

const attachProductGroup = async (pObj) => {
  if (!pObj) return pObj;
  try {
    const pIdStr = pObj._id.toString();
    if (!isDatabaseConnected) {
      const group = memoryProductGroups.find(g => (g.products || []).some(id => id.toString() === pIdStr));
      if (group) {
        const prods = group.products.map(pId => {
          const found = memoryProducts.find(p => p._id.toString() === pId.toString());
          if (!found) return null;
          return {
            _id: found._id,
            name: found.name,
            price: found.price,
            mrp: found.mrp,
            image: found.image,
            colors: found.colors || []
          };
        }).filter(Boolean);
        pObj.productGroup = {
          _id: group._id,
          name: group.name,
          products: prods
        };
      }
    } else {
      const group = await ProductGroup.findOne({ products: pObj._id }).populate({
        path: 'products',
        select: '_id name price mrp image colors'
      });
      if (group) {
        pObj.productGroup = typeof group.toObject === 'function' ? group.toObject() : { ...group };
      }
    }
  } catch (err) {
    console.warn("Failed to attach product group information:", err.message);
  }
  return pObj;
};

const getProductsRatingInfo = async (productIds) => {
  const statsMap = {};
  productIds.forEach(id => {
    statsMap[id.toString()] = { rating: 0, count: 0 };
  });

  if (!isDatabaseConnected) {
    const reviewsGrouped = {};
    memoryReviews.forEach(rev => {
      const pId = rev.productId;
      if (!reviewsGrouped[pId]) {
        reviewsGrouped[pId] = [];
      }
      reviewsGrouped[pId].push(rev);
    });

    Object.keys(reviewsGrouped).forEach(pId => {
      const revs = reviewsGrouped[pId];
      const avg = revs.reduce((sum, r) => sum + r.rating, 0) / revs.length;
      statsMap[pId] = {
        rating: avg,
        count: revs.length
      };
    });
    return statsMap;
  }

  try {
    const stringProductIds = productIds.map(id => id.toString());
    const reviewStats = await Review.aggregate([
      { $match: { productId: { $in: stringProductIds } } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    reviewStats.forEach(stat => {
      statsMap[stat._id] = {
        rating: stat.averageRating,
        count: stat.reviewCount
      };
    });
  } catch (err) {
    console.warn("Failed to aggregate reviews from database:", err.message);
  }

  return statsMap;
};

const ensureInventoryInitialized = async (product, defaultStock = 50, skipSave = false) => {
  let modified = false;
  if (!product.inventory) {
    product.inventory = [];
    modified = true;
  }
  
  if (product.inventory.length === 0) {
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(variant => {
        const vColors = variant.colors || [];
        vColors.forEach(cName => {
          product.inventory.push({
            variant: variant.name,
            color: cName,
            stock: defaultStock
          });
        });
      });
    } else if (product.colors && product.colors.length > 0) {
      product.colors.forEach(color => {
        product.inventory.push({
          variant: '',
          color: color.name,
          stock: defaultStock
        });
      });
    } else if (product.textures && product.textures.length > 0) {
      product.textures.forEach(texture => {
        product.inventory.push({
          variant: '',
          color: texture.name,
          stock: defaultStock
        });
      });
    } else {
      product.inventory.push({
        variant: '',
        color: '',
        stock: defaultStock
      });
    }
    modified = true;
  } else {
    // Add missing combinations if any
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(variant => {
        const vColors = variant.colors || [];
        vColors.forEach(cName => {
          const exists = product.inventory.some(inv => 
            (inv.variant || '') === (variant.name || '') && 
            (inv.color || '') === (cName || '')
          );
          if (!exists) {
            product.inventory.push({
              variant: variant.name,
              color: cName,
              stock: 50
            });
            modified = true;
          }
        });
      });
    } else if (product.colors && product.colors.length > 0) {
      product.colors.forEach(color => {
        const exists = product.inventory.some(inv => 
          (inv.variant || '') === '' && 
          (inv.color || '') === (color.name || '')
        );
        if (!exists) {
          product.inventory.push({
            variant: '',
            color: color.name,
            stock: 50
          });
          modified = true;
        }
      });
    } else if (product.textures && product.textures.length > 0) {
      product.textures.forEach(texture => {
        const exists = product.inventory.some(inv => 
          (inv.variant || '') === '' && 
          (inv.color || '').toLowerCase() === (texture.name || '').toLowerCase()
        );
        if (!exists) {
          product.inventory.push({
            variant: '',
            color: texture.name,
            stock: 50
          });
          modified = true;
        }
      });
    }
  }
  
  if (modified && !skipSave && product.save && typeof product.save === 'function') {
    await product.save();
  }
};

// GET /api/products and /api/products/:id
// Storefront stock = main store stock + stock held by active vendors
//
// Product lists and details are cached in memory for a few seconds: every visitor's browser asks for the
// catalogue, and one database query can answer all of them. Product edits clear the cache at once; stock
// changes from orders show up within PRODUCT_CACHE_MS.
const PRODUCT_CACHE_MS = 15000;
if (!globalThis.__productResponseCache) {
  globalThis.__productResponseCache = new Map();
  productEvents.on('product-updated', () => globalThis.__productResponseCache.clear());
}
const productCache = globalThis.__productResponseCache;

export async function GET(req, ctx) {
  const path = (await ctx.params).path || [];
  if (path.length > 1 || ['groups', 'events', 'stock'].includes(path[0])) return getProducts(req, ctx);

  const url = new URL(req.url);
  url.searchParams.delete('t'); // cache-busting parameter added by the storefront
  const key = `${path.join('/')}?${[...url.searchParams].sort().map(([k, v]) => `${k}=${v}`).join('&')}`;
  const hit = productCache.get(key);
  if (hit && Date.now() - hit.at < PRODUCT_CACHE_MS) return NextResponse.json(hit.body, { status: 200 });

  const res = await getProducts(req, ctx);
  if (res.status !== 200) return res;
  try {
    const body = await res.clone().json();
    if (!body?.success || !body.data) return res;
    const totals = await getVendorStockTotals();
    if (Object.keys(totals).length) {
      body.data = Array.isArray(body.data)
        ? body.data.map(p => withVendorStock(p, totals))
        : withVendorStock(body.data, totals);
    }
    if (productCache.size > 500) productCache.clear();
    productCache.set(key, { at: Date.now(), body });
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.warn('Vendor stock merge failed:', err.message);
    return res;
  }
}

async function getProducts(req, { params }) {
  await initAPI();
  const path = (await params).path || [];

  // GET /api/products/groups
  if (path[0] === 'groups') {
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
  
  // GET /api/products/events (SSE Stream)
  if (path[0] === 'events') {
    let isClosed = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        
        const listener = (data) => {
          if (isClosed) return;
          try {
            controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
          } catch (e) {
            console.error("Error writing to stream:", e);
          }
        };
        
        productEvents.on('product-updated', listener);
        
        req.signal.addEventListener('abort', () => {
          isClosed = true;
          productEvents.off('product-updated', listener);
          try {
            controller.close();
          } catch (e) {}
        });
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }
  
  // GET /api/products/stock
  if (path[0] === 'stock') {
    try {
      if (!isDatabaseConnected) {
        const stockData = memoryProducts.map(p => {
          // Initialize in-memory inventory
          if (!p.inventory || p.inventory.length === 0) {
            p.inventory = [];
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach(v => {
                const colors = v.colors || [];
                colors.forEach(c => {
                  p.inventory.push({ variant: v.name, color: c, stock: 50 });
                });
              });
            } else if (p.colors && p.colors.length > 0) {
              p.colors.forEach(c => {
                p.inventory.push({ variant: '', color: c.name, stock: 50 });
              });
            } else if (p.textures && p.textures.length > 0) {
              p.textures.forEach(t => {
                p.inventory.push({ variant: '', color: t.name, stock: 50 });
              });
            } else {
              p.inventory.push({ variant: '', color: '', stock: 50 });
            }
          }
          return {
            _id: p._id,
            name: p.name,
            image: p.image,
            category: p.category,
            inventory: p.inventory,
            variants: p.variants || [],
            colors: p.colors || []
          };
        });
        return jsonResponse(stockData);
      }

      const products = await Product.find({}).sort({ createdAt: -1 });
      for (let product of products) {
        if (!product.inventory || product.inventory.length === 0) {
          await ensureInventoryInitialized(product, 50, true);
        }
      }
      return jsonResponse(products);
    } catch (err) {
      console.warn("DB Stock list query failed. Falling back to memory:", err.message);
      const stockData = memoryProducts.map(p => {
        if (!p.inventory || p.inventory.length === 0) {
          p.inventory = [];
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
              const colors = v.colors || [];
              colors.forEach(c => {
                p.inventory.push({ variant: v.name, color: c, stock: 50 });
              });
            });
          } else if (p.colors && p.colors.length > 0) {
            p.colors.forEach(c => {
              p.inventory.push({ variant: '', color: c.name, stock: 50 });
            });
          } else if (p.textures && p.textures.length > 0) {
            p.textures.forEach(t => {
              p.inventory.push({ variant: '', color: t.name, stock: 50 });
            });
          } else {
            p.inventory.push({ variant: '', color: '', stock: 50 });
          }
        }
        return {
          _id: p._id,
          name: p.name,
          image: p.image,
          category: p.category,
          inventory: p.inventory,
          variants: p.variants || [],
          colors: p.colors || []
        };
      });
      return jsonResponse(stockData);
    }
  }

  // GET /api/products
  if (path.length === 0) {
    try {
      if (!isDatabaseConnected) {
        // Initialize in-memory
        memoryProducts.forEach(p => {
          if (!p.inventory || p.inventory.length === 0) {
            p.inventory = [];
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach(v => {
                const colors = v.colors || [];
                colors.forEach(c => {
                  p.inventory.push({ variant: v.name, color: c, stock: 50 });
                });
              });
            } else if (p.colors && p.colors.length > 0) {
              p.colors.forEach(c => {
                p.inventory.push({ variant: '', color: c.name, stock: 50 });
              });
            } else {
              p.inventory.push({ variant: '', color: '', stock: 50 });
            }
          }
        });
        const sorted = [...memoryProducts].reverse();
        const productIds = sorted.map(p => p._id);
        const ratingStatsMap = await getProductsRatingInfo(productIds);
        const responseData = sorted.map(p => ({
          ...p,
          ratingInfo: ratingStatsMap[p._id.toString()] || { rating: 0, count: 0 }
        }));
        return jsonResponse(responseData);
      }
      const products = await Product.find({}).sort({ createdAt: -1 });
      for (let product of products) {
        if (!product.inventory || product.inventory.length === 0) {
          await ensureInventoryInitialized(product, 50, true);
        }
      }
      const productIds = products.map(p => p._id);
      const ratingStatsMap = await getProductsRatingInfo(productIds);
      const responseData = products.map(p => {
        const pObj = typeof p.toObject === 'function' ? p.toObject() : { ...p };
        pObj.ratingInfo = ratingStatsMap[p._id.toString()] || { rating: 0, count: 0 };
        return pObj;
      });
      return jsonResponse(responseData);
    } catch (err) {
      console.warn("DB Products query failed. Falling back to memory:", err.message);
      memoryProducts.forEach(p => {
        if (!p.inventory || p.inventory.length === 0) {
          p.inventory = [];
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
              const colors = v.colors || [];
              colors.forEach(c => {
                p.inventory.push({ variant: v.name, color: c, stock: 50 });
              });
            });
          } else if (p.colors && p.colors.length > 0) {
            p.colors.forEach(c => {
              p.inventory.push({ variant: '', color: c.name, stock: 50 });
            });
          } else {
            p.inventory.push({ variant: '', color: '', stock: 50 });
          }
        }
      });
      const sorted = [...memoryProducts].reverse();
      const productIds = sorted.map(p => p._id);
      const ratingStatsMap = await getProductsRatingInfo(productIds);
      const responseData = sorted.map(p => ({
        ...p,
        ratingInfo: ratingStatsMap[p._id.toString()] || { rating: 0, count: 0 }
      }));
      return jsonResponse(responseData);
    }
  }

  // GET /api/products/:id
  const id = path[0];
  try {
    if (!isDatabaseConnected) {
      // Force database connection attempt for direct item detail queries
      await connectDB().catch(() => {});
    }
    if (!isDatabaseConnected) {
      const product = memoryProducts.find(p => p._id === id);
      if (product) {
        product.views = (product.views || 0) + 1;
        if (!product.inventory || product.inventory.length === 0) {
          product.inventory = [];
          if (product.variants && product.variants.length > 0) {
            product.variants.forEach(v => {
              const colors = v.colors || [];
              colors.forEach(c => {
                product.inventory.push({ variant: v.name, color: c, stock: 50 });
              });
            });
          } else if (product.colors && product.colors.length > 0) {
            product.colors.forEach(c => {
              product.inventory.push({ variant: '', color: c.name, stock: 50 });
            });
          } else {
            product.inventory.push({ variant: '', color: '', stock: 50 });
          }
        }
        const ratingStatsMap = await getProductsRatingInfo([id]);
        const pObj = {
          ...product,
          ratingInfo: ratingStatsMap[id.toString()] || { rating: 0, count: 0 }
        };
        await attachProductGroup(pObj);
        return jsonResponse(pObj);
      }
      return errorResponse('Product not found', 404);
    }
    // Increment views dynamically and genuinely in database
    const product = await Product.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    if (product) {
      await ensureInventoryInitialized(product, 50, true);
      const ratingStatsMap = await getProductsRatingInfo([id]);
      const pObj = typeof product.toObject === 'function' ? product.toObject() : { ...product };
      pObj.ratingInfo = ratingStatsMap[id.toString()] || { rating: 0, count: 0 };
      await attachProductGroup(pObj);
      return jsonResponse(pObj);
    }
    const memProduct = memoryProducts.find(p => p._id === id);
    if (memProduct) {
      const ratingStatsMap = await getProductsRatingInfo([id]);
      const pObj = {
        ...memProduct,
        ratingInfo: ratingStatsMap[id.toString()] || { rating: 0, count: 0 }
      };
      await attachProductGroup(pObj);
      return jsonResponse(pObj);
    }
    return errorResponse('Product not found', 404);
  } catch (err) {
    console.warn("DB Product query by ID failed. Falling back to memory:", err.message);
    const product = memoryProducts.find(p => p._id === id);
    if (product) {
      if (!product.inventory || product.inventory.length === 0) {
        product.inventory = [];
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(v => {
            const colors = v.colors || [];
            colors.forEach(c => {
              product.inventory.push({ variant: v.name, color: c, stock: 50 });
            });
          });
        } else if (product.colors && product.colors.length > 0) {
          product.colors.forEach(c => {
            product.inventory.push({ variant: '', color: c.name, stock: 50 });
          });
        } else {
          product.inventory.push({ variant: '', color: '', stock: 50 });
        }
      }
      const ratingStatsMap = await getProductsRatingInfo([id]);
      const pObj = {
        ...product,
        ratingInfo: ratingStatsMap[id.toString()] || { rating: 0, count: 0 }
      };
      await attachProductGroup(pObj);
      return jsonResponse(pObj);
    }
    return errorResponse(err.message, 500);
  }
}

// POST /api/products (Admin Only)
export async function POST(req, { params }) {
  await initAPI();
  const path = (await params).path || [];
  
  if (path[0] === 'stock') {
    try {
      const { action, productId, variant, color, stock, mode } = await req.json();

      // Stock is taken when an order's payment is confirmed (lib/order-payment.js); new-order
      // notifications are sent from there too, so there is no public "sell" action.

      // action: update (Admin Only) - Edit/override/increment stock levels
      if (action === 'update') {
        const user = await getAuthenticatedUser(req);
        if (!user || user.role !== 'admin') {
          return errorResponse('Not authorized as an admin', 401);
        }
        
        if (!productId) {
          return errorResponse('Product ID is required', 400);
        }
        
        if (!isDatabaseConnected) {
          const p = memoryProducts.find(x => x._id === productId);
          if (!p) return errorResponse('Product not found in cache', 404);
          if (!p.inventory) p.inventory = [];
          
          let invItem = p.inventory.find(inv => 
            inv.variant === (variant || '') && 
            inv.color === (color || '')
          );
          
          if (!invItem) {
            invItem = { variant: variant || '', color: color || '', stock: 0 };
            p.inventory.push(invItem);
          }
          
          if (mode === 'add') {
            invItem.stock += Number(stock) || 0;
          } else {
            invItem.stock = Number(stock) || 0;
          }
          if (invItem.stock < 0) invItem.stock = 0;
          saveMemoryProducts();
          return jsonResponse(p, 200, { message: 'Stock updated in cache successfully!' });
        }
        
        const product = await Product.findById(productId);
        if (!product) return errorResponse('Product not found', 404);
        
        await ensureInventoryInitialized(product);
        let invItem = product.inventory.find(inv => 
          inv.variant === (variant || '') && 
          inv.color === (color || '')
        );
        
        if (!invItem) {
          product.inventory.push({
            variant: variant || '',
            color: color || '',
            stock: 0
          });
          invItem = product.inventory[product.inventory.length - 1];
        }
        
        if (mode === 'add') {
          invItem.stock += Number(stock) || 0;
        } else {
          invItem.stock = Number(stock) || 0;
        }
        if (invItem.stock < 0) invItem.stock = 0;
        
        await product.save();
        return jsonResponse(product, 200, { message: 'Stock updated successfully!' });
      }
      
      return errorResponse('Invalid stock action', 400);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const code = formData.get('code') || '';
    const price = formData.get('price');
    const mrp = formData.get('mrp');
    const category = formData.get('category');
    const subcategory = formData.get('subcategory');
    const description = formData.get('description');
    const featured = formData.get('featured');
    const rawGender = formData.get('gender');
    // Daivika is the only store: the old 'jewels' store is saved as 'daivika'
    const gender = rawGender && /^jewels?$/i.test(String(rawGender).trim()) ? 'daivika' : rawGender;
    const specifications = formData.get('specifications');
    const highlights = formData.get('highlights');
    const variants = formData.get('variants');
    const colors = formData.get('colors');
    const textures = formData.get('textures');
    const imageFile = formData.get('image');
    const bulkMinQty = formData.get('bulkMinQty');
    const bulkPrice = formData.get('bulkPrice');
    const badge = formData.get('badge') || '';
    const badgeBg = formData.get('badgeBg') || '';
    const badgeColor = formData.get('badgeColor') || '';
    const initialStockStr = formData.get('initialStock');
    const initialStock = initialStockStr !== null ? Number(initialStockStr) : 50;
    const details = readDetailFields(formData);
    const extraCategories = cleanExtraCategories(formData.get('extraCategories'), category, subcategory);

    if (!String(name || '').trim()) return errorResponse('Product name is required', 400);
    if (String(name).length > 200) return errorResponse('Product name must be 200 characters or fewer', 400);
    if (!(Number(price) > 0) || Number(price) > 10000000) return errorResponse('Price must be a positive amount', 400);
    if (mrp !== null && mrp !== '' && !(Number(mrp) >= 0)) return errorResponse('MRP cannot be negative', 400);
    if (!Number.isInteger(initialStock) || initialStock < 0) return errorResponse('Stock must be a whole number of 0 or more', 400);
    if (!String(category || '').trim()) return errorResponse('Category is required', 400);

    const parsedColors = parseJsonField(colors);
    const parsedTextures = textures ? parseJsonField(textures) : [];
    const parsedSpecs = specifications ? parseJsonField(specifications) : [];
    const parsedHighlights = highlights ? parseJsonField(highlights) : [];
    const parsedVariants = variants ? parseJsonField(variants) : [];

    let productImageUrl = undefined;
    const firstColorWithImage = parsedColors?.find(c => c.image);
    const firstTextureWithImage = parsedTextures?.find(t => t.image);
    const hasMainFile = imageFile && typeof imageFile === 'object' && imageFile.size > 0;

    if (!hasMainFile && !firstColorWithImage?.image && !firstTextureWithImage?.image) {
      return errorResponse('Please upload a product image', 400);
    }

    let maxSubImageIndex = -1;
    for (const key of formData.keys()) {
      if (key.startsWith('subImage')) {
        const idx = parseInt(key.slice(8));
        if (!isNaN(idx) && idx > maxSubImageIndex) {
          maxSubImageIndex = idx;
        }
      }
    }
    const subFiles = [];
    for (let i = 0; i <= maxSubImageIndex; i++) {
      const subFile = formData.get(`subImage${i}`);
      if (subFile && typeof subFile === 'object' && subFile.size > 0) subFiles.push(subFile);
    }

    // Main and extra images are processed in parallel (each one is resized and stored)
    const store = async (file) => uploadToCloudinaryOrLocal(Buffer.from(await file.arrayBuffer()), file.name, 'seepo/products');
    const [mainUrl, ...subImages] = await Promise.all([hasMainFile ? store(imageFile) : null, ...subFiles.map(store)]);
    productImageUrl = mainUrl || firstColorWithImage?.image || firstTextureWithImage?.image;

    if (!isDatabaseConnected) {
      const product = {
        _id: 'mem_prod_' + Date.now(),
        name,
        code,
        price: Number(price) || 0,
        mrp: Number(mrp) || 0,
        category: category ? category.toLowerCase() : 'accessories',
        subcategory: subcategory ? subcategory.toLowerCase() : '',
        extraCategories,
        image: productImageUrl,
        subImages: subImages.slice(0, 4),
        description,
        ...details,
        specifications: parsedSpecs,
        highlights: parsedHighlights,
        featured: featured === 'true' || featured === true,
        gender: gender || 'all',
        badge: badge || '',
        badgeBg: badgeBg || '',
        badgeColor: badgeColor || '',
        bulkMinQty: bulkMinQty ? Number(bulkMinQty) : null,
        bulkPrice: bulkPrice ? Number(bulkPrice) : null,
        variants: parsedVariants,
        colors: parsedColors,
        textures: parsedTextures,
        createdAt: new Date().toISOString()
      };

      product.inventory = [];
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => {
          const colors = v.colors || [];
          colors.forEach(c => {
            product.inventory.push({ variant: v.name, color: c, stock: initialStock });
          });
        });
      } else if (product.colors && product.colors.length > 0) {
        product.colors.forEach(c => {
          product.inventory.push({ variant: '', color: c.name, stock: initialStock });
        });
      } else {
        product.inventory.push({ variant: '', color: '', stock: initialStock });
      }
      memoryProducts.push(product);
      saveMemoryProducts();
      productEvents.emit('product-updated', {
        type: 'create',
        productId: product._id,
        product
      });
      return jsonResponse(product, 201);
    }

    const createdProduct = await Product.create({
      name,
      code,
      price: Number(price) || 0,
      mrp: Number(mrp) || 0,
      category: category ? category.toLowerCase() : 'accessories',
      subcategory: subcategory ? subcategory.toLowerCase() : '',
      extraCategories,
      image: productImageUrl,
      subImages: subImages.slice(0, 4),
      description,
      ...details,
      specifications: parsedSpecs,
      highlights: parsedHighlights,
      featured: featured === 'true' || featured === true,
      gender: gender || 'all',
      badge: badge || '',
      badgeBg: badgeBg || '',
      badgeColor: badgeColor || '',
      bulkMinQty: bulkMinQty ? Number(bulkMinQty) : null,
      bulkPrice: bulkPrice ? Number(bulkPrice) : null,
      variants: parsedVariants,
      colors: parsedColors,
      textures: parsedTextures
    });

    await ensureInventoryInitialized(createdProduct, initialStock);

    // Sync to memoryProducts cache & disk
    const memIdx = memoryProducts.findIndex(p => (p._id || p.id) === (createdProduct._id || createdProduct.id));
    if (memIdx === -1) {
      memoryProducts.unshift(createdProduct);
    } else {
      memoryProducts[memIdx] = createdProduct;
    }
    saveMemoryProducts();

    productEvents.emit('product-updated', {
      type: 'create',
      productId: (createdProduct._id || createdProduct.id).toString(),
      product: createdProduct
    });
    return jsonResponse(createdProduct, 201);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// PUT /api/products/:id (Admin Only)
export async function PUT(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Product ID is required', 400);
  const id = path[0];

  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const code = formData.get('code');
    const price = formData.get('price');
    const mrp = formData.get('mrp');
    const category = formData.get('category');
    const subcategory = formData.get('subcategory');
    const description = formData.get('description');
    const featured = formData.get('featured');
    const rawGender = formData.get('gender');
    // Daivika is the only store: the old 'jewels' store is saved as 'daivika'
    const gender = rawGender && /^jewels?$/i.test(String(rawGender).trim()) ? 'daivika' : rawGender;
    const specifications = formData.get('specifications');
    const highlights = formData.get('highlights');
    const variants = formData.get('variants');
    const colors = formData.get('colors');
    const textures = formData.get('textures');
    const imageFile = formData.get('image');
    const bulkMinQty = formData.get('bulkMinQty');
    const bulkPrice = formData.get('bulkPrice');
    const badge = formData.get('badge');
    const badgeBg = formData.get('badgeBg');
    const badgeColor = formData.get('badgeColor');
    const details = readDetailFields(formData);
    const extraCategoriesRaw = formData.get('extraCategories');

    if (price !== null && price !== '' && (!(Number(price) > 0) || Number(price) > 10000000)) return errorResponse('Price must be a positive amount', 400);
    if (mrp !== null && mrp !== '' && !(Number(mrp) >= 0)) return errorResponse('MRP cannot be negative', 400);
    if (name !== null && !String(name).trim()) return errorResponse('Product name cannot be empty', 400);

    const parsedSpecs = specifications ? parseJsonField(specifications) : undefined;
    const parsedHighlights = highlights ? parseJsonField(highlights) : undefined;
    const parsedVariants = variants ? parseJsonField(variants) : undefined;
    const parsedColors = colors ? parseJsonField(colors) : undefined;
    const parsedTextures = textures ? parseJsonField(textures) : undefined;

    let productImageUrl = undefined;
    const firstColorWithImage = parsedColors?.find(c => c.image);
    const firstTextureWithImage = parsedTextures?.find(t => t.image);
    if (imageFile && typeof imageFile === 'object' && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      productImageUrl = await uploadToCloudinaryOrLocal(buffer, imageFile.name, 'seepo/products');
    } else if (firstColorWithImage && firstColorWithImage.image) {
      productImageUrl = firstColorWithImage.image;
    } else if (firstTextureWithImage && firstTextureWithImage.image) {
      productImageUrl = firstTextureWithImage.image;
    }

    const existingSubImages = formData.get('existingSubImages') ? parseJsonField(formData.get('existingSubImages')) : null;

    if (!isDatabaseConnected) {
      const product = memoryProducts.find(p => p._id === id);
      if (product) {
        if (name !== null && name !== undefined) product.name = name;
        if (code !== null && code !== undefined) product.code = code;
        if (price !== null && price !== undefined) product.price = Number(price) || 0;
        if (mrp !== null && mrp !== undefined) product.mrp = Number(mrp) || 0;
        if (category !== null && category !== undefined) product.category = category.toLowerCase();
        if (subcategory !== null && subcategory !== undefined) product.subcategory = subcategory.toLowerCase();
        if (description !== null && description !== undefined) product.description = description;
        Object.assign(product, details);
        if (extraCategoriesRaw !== null) product.extraCategories = cleanExtraCategories(extraCategoriesRaw, product.category, product.subcategory);
        if (parsedSpecs !== undefined) product.specifications = parsedSpecs;
        if (parsedHighlights !== undefined) product.highlights = parsedHighlights;
        if (featured !== null && featured !== undefined) product.featured = featured === 'true' || featured === true;
        if (gender !== null && gender !== undefined) product.gender = gender;
        if (badge !== null && badge !== undefined) product.badge = badge;
        if (badgeBg !== null && badgeBg !== undefined) product.badgeBg = badgeBg;
        if (badgeColor !== null && badgeColor !== undefined) product.badgeColor = badgeColor;
        if (bulkMinQty !== null && bulkMinQty !== undefined) product.bulkMinQty = bulkMinQty ? Number(bulkMinQty) : null;
        if (bulkPrice !== null && bulkPrice !== undefined) product.bulkPrice = bulkPrice ? Number(bulkPrice) : null;
        if (parsedVariants !== undefined) product.variants = parsedVariants;
        if (parsedColors !== undefined) product.colors = parsedColors;
        if (parsedTextures !== undefined) product.textures = parsedTextures;
        if (productImageUrl !== undefined) product.image = productImageUrl;
        
        if (existingSubImages && Array.isArray(existingSubImages)) {
          const memFinalSubImages = [];
          for (let i = 0; i < existingSubImages.length; i++) {
            const slotValue = existingSubImages[i];
            const newFile = formData.get(`subImage${i}`);
            if (newFile && typeof newFile === 'object' && newFile.size > 0) {
              const arrayBuffer = await newFile.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const url = await uploadToCloudinaryOrLocal(buffer, newFile.name, 'seepo/products');
              memFinalSubImages.push(url);
            } else if (slotValue && typeof slotValue === 'string') {
              memFinalSubImages.push(slotValue);
            }
          }
          product.subImages = memFinalSubImages.slice(0, 4);
        }
        
        if (!product.inventory) product.inventory = [];
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(v => {
            const colors = v.colors || [];
            colors.forEach(c => {
              const exists = product.inventory.some(inv => inv.variant === v.name && inv.color === c);
              if (!exists) {
                product.inventory.push({ variant: v.name, color: c, stock: 50 });
              }
            });
          });
        }
        saveMemoryProducts();
        productEvents.emit('product-updated', {
          type: 'update',
          productId: product._id,
          product
        });
        return jsonResponse(product, 200, { message: 'Product updated successfully in cache!' });
      }
      return errorResponse('Product not found in cache', 404);
    }

    const product = await Product.findById(id);
    if (product) {
      if (name !== null && name !== undefined) product.name = name;
      if (code !== null && code !== undefined) product.code = code;
      if (price !== null && price !== undefined) product.price = Number(price) || 0;
      if (mrp !== null && mrp !== undefined) product.mrp = Number(mrp) || 0;
      if (category !== null && category !== undefined) product.category = category.toLowerCase();
      if (subcategory !== null && subcategory !== undefined) product.subcategory = subcategory.toLowerCase();
      if (description !== null && description !== undefined) product.description = description;
      Object.assign(product, details);
      if (extraCategoriesRaw !== null) product.extraCategories = cleanExtraCategories(extraCategoriesRaw, product.category, product.subcategory);
      if (parsedSpecs !== undefined) product.specifications = parsedSpecs;
      if (parsedHighlights !== undefined) product.highlights = parsedHighlights;
      if (featured !== null && featured !== undefined) product.featured = featured === 'true' || featured === true;
      if (gender !== null && gender !== undefined) product.gender = gender;
      if (badge !== null && badge !== undefined) product.badge = badge;
      if (badgeBg !== null && badgeBg !== undefined) product.badgeBg = badgeBg;
      if (badgeColor !== null && badgeColor !== undefined) product.badgeColor = badgeColor;
      if (bulkMinQty !== null && bulkMinQty !== undefined) product.bulkMinQty = bulkMinQty ? Number(bulkMinQty) : null;
      if (bulkPrice !== null && bulkPrice !== undefined) product.bulkPrice = bulkPrice ? Number(bulkPrice) : null;
      if (parsedVariants !== undefined) product.variants = parsedVariants;
      if (parsedColors !== undefined) product.colors = parsedColors;
      if (parsedTextures !== undefined) product.textures = parsedTextures;
      
      if (productImageUrl !== undefined) {
        if (product.image && product.image !== productImageUrl) {
          const isImageUrlStillUsed = 
            (parsedColors && parsedColors.some(c => c.image === product.image)) ||
            (existingSubImages && existingSubImages.includes(product.image));
          if (!isImageUrlStillUsed) {
            await deleteFromCloudinary(product.image).catch(err => console.warn("Delete main image failed:", err));
          }
        }
        product.image = productImageUrl;
      }

      if (existingSubImages && Array.isArray(existingSubImages)) {
        // Delete removed sub-images from storage
        if (product.subImages && Array.isArray(product.subImages)) {
          for (const oldUrl of product.subImages) {
            if (oldUrl && !existingSubImages.includes(oldUrl)) {
              await deleteFromCloudinary(oldUrl);
            }
          }
        }

        const dbFinalSubImages = [];
        for (let i = 0; i < existingSubImages.length; i++) {
          const slotValue = existingSubImages[i];
          const newFile = formData.get(`subImage${i}`);
          if (newFile && typeof newFile === 'object' && newFile.size > 0) {
            const arrayBuffer = await newFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const url = await uploadToCloudinaryOrLocal(buffer, newFile.name, 'seepo/products');
            dbFinalSubImages.push(url);
          } else if (slotValue && typeof slotValue === 'string') {
            dbFinalSubImages.push(slotValue);
          }
        }
        product.subImages = dbFinalSubImages.slice(0, 4);
      }

      const updatedProduct = await product.save();
      await ensureInventoryInitialized(updatedProduct);

      // Sync to memoryProducts cache & disk
      const memIdx = memoryProducts.findIndex(p => (p._id || p.id) === (updatedProduct._id || updatedProduct.id || id));
      if (memIdx !== -1) {
        memoryProducts[memIdx] = updatedProduct;
      } else {
        memoryProducts.unshift(updatedProduct);
      }
      saveMemoryProducts();

      productEvents.emit('product-updated', {
        type: 'update',
        productId: (updatedProduct._id || updatedProduct.id).toString(),
        product: updatedProduct
      });
      return jsonResponse(updatedProduct, 200, { message: 'Product updated successfully!' });
    }
    return errorResponse('Product not found', 404);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

// DELETE /api/products/:id (Admin Only)
export async function DELETE(req, { params }) {
  await initAPI();
  const user = await getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') return errorResponse('Not authorized as an admin', 401);

  const path = (await params).path || [];
  if (path.length === 0) return errorResponse('Product ID is required', 400);
  const id = path[0];

  try {
    if (!isDatabaseConnected) {
      const index = memoryProducts.findIndex(p => (p._id || p.id) === id);
      if (index !== -1) {
        const deletedId = id;
        memoryProducts.splice(index, 1);
        saveMemoryProducts();
        productEvents.emit('product-updated', {
          type: 'delete',
          productId: deletedId
        });
        return jsonResponse(null, 200, { message: 'Product successfully removed' });
      }
      return errorResponse('Product not found in cache', 404);
    }

    const product = await Product.findById(id);
    if (product) {
      if (product.image) {
        await deleteFromCloudinary(product.image).catch(err => console.warn("Delete main image failed:", err));
      }
      if (product.subImages && Array.isArray(product.subImages)) {
        for (const subUrl of product.subImages) {
          if (subUrl) {
            await deleteFromCloudinary(subUrl).catch(err => console.warn("Delete subImage failed:", err));
          }
        }
      }
      if (typeof product.deleteOne === 'function') {
        await product.deleteOne();
      } else {
        await Product.findByIdAndDelete(id);
      }

      // Sync to memoryProducts cache & disk
      const memIdx = memoryProducts.findIndex(p => (p._id || p.id) === id);
      if (memIdx !== -1) {
        memoryProducts.splice(memIdx, 1);
        saveMemoryProducts();
      }

      productEvents.emit('product-updated', {
        type: 'delete',
        productId: id
      });
      return jsonResponse(null, 200, { message: 'Product successfully removed' });
    }
    return errorResponse('Product not found', 404);
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
