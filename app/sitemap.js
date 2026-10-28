export const revalidate = 3600;

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

// Categories and products come from the Laravel backend; the sitemap still works (static pages only)
// when the backend can't be reached.
async function fromApi(path) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch (e) {
    console.error(`Sitemap: could not load ${path}:`, e.message);
    return [];
  }
}

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const staticPages = [
    '',
    '/products',
    '/about',
    '/order-tracking',
    '/contact',
    '/faq',
    '/shipping-policy',
    '/returns-exchanges',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy'
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' || route === '/products' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : (route === '/products' || route === '/about' ? 0.9 : 0.7),
  }));

  const [categories, products] = await Promise.all([fromApi('categories'), fromApi('products')]);

  const categoryRoutes = categories.map(cat => ({
    url: `${baseUrl}/products?category=${encodeURIComponent(cat.name)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  const productRoutes = products.map(p => ({
    url: `${baseUrl}/product/${p._id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...categoryRoutes, ...productRoutes];
}
