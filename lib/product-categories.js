// A product has one main category / subcategory (used for shipping rules, coupons, reports and breadcrumbs)
// and can also be listed under more categories via `extraCategories`: [{ category, subcategory }].
// Browsing and filtering by category look at all of them. Names are stored lowercase, like `category`.

const key = (v) => String(v || '').toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

const MAX_EXTRA_CATEGORIES = 20;

// Cleans the list sent by the admin form: lowercase, no blanks, no duplicates, nothing equal to the main placement
export function cleanExtraCategories(list, mainCategory = '', mainSubcategory = '') {
  let parsed = list;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  const seen = new Set([`${key(mainCategory)}|${key(mainSubcategory)}`]);
  const out = [];
  for (const item of Array.isArray(parsed) ? parsed : []) {
    const category = String(item?.category || '').toLowerCase().trim().slice(0, 80);
    const subcategory = String(item?.subcategory || '').toLowerCase().trim().slice(0, 80);
    if (!category) continue;
    const id = `${key(category)}|${key(subcategory)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ category, subcategory });
    if (out.length >= MAX_EXTRA_CATEGORIES) break;
  }
  return out;
}

// Every { category, subcategory } a product is listed under, main placement first
export function productPlacements(product) {
  if (!product) return [];
  const main = { category: String(product.category || ''), subcategory: String(product.subcategory || '') };
  const extra = Array.isArray(product.extraCategories) ? product.extraCategories : [];
  return [main, ...extra.filter(e => e && e.category)];
}

// Is the product listed under this category (and subcategory, when one is given)?
export function productInCategory(product, category, subcategory) {
  const c = key(category);
  const s = key(subcategory);
  if (!c || c === 'all') return true;
  return productPlacements(product).some(p => key(p.category) === c && (!s || s === 'all' || key(p.subcategory) === s));
}

// All category names a product appears under (for lists of available categories)
export function productCategoryNames(product) {
  return productPlacements(product).map(p => String(p.category || '').trim()).filter(Boolean);
}
