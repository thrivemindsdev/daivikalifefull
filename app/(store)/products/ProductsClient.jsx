'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from '@/hooks/useRouterShim';
import ProductCard from '@/components/ProductCard';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { Filter, ChevronDown, Search, Sparkles, SlidersHorizontal, Layers, Tag, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/config';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import { useCart } from '@/context/CartContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useTheme } from '@/context/ThemeContext';
import { SHOP_INTRO, getTheme, productMatchesTheme } from '@/lib/home-sections';
import { productInCategory, productPlacements, productCategoryNames } from '@/lib/product-categories';
import ProductFilterSidebar, { ProductFilterDrawer } from '@/components/ProductFilterSidebar';

// Sidebar filter options (min inclusive, max exclusive)
const PRICE_RANGES = [
  { id: 'u500', label: 'Under ₹500', min: 0, max: 500 },
  { id: '500-1000', label: '₹500 – ₹1,000', min: 500, max: 1000 },
  { id: '1000-2000', label: '₹1,000 – ₹2,000', min: 1000, max: 2000 },
  { id: '2000-5000', label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { id: 'o5000', label: 'Over ₹5,000', min: 5000, max: Infinity },
];
const DISCOUNT_STEPS = [50, 40, 30, 20, 10];
const RATING_STEPS = [4, 3, 2];
const EMPTY_SIDEBAR_FILTERS = { priceRange: '', priceMin: '', priceMax: '', minDiscount: 0, minRating: 0, inStockOnly: false };

const productDiscount = (p) => {
  const mrp = Number(p.mrp), price = Number(p.price);
  return mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
};
const isProductInStock = (p) => !Array.isArray(p.inventory) || p.inventory.length === 0 || p.inventory.some(i => Number(i.stock) > 0);

const isJewelsCategory = () => false;
const isJewelsProduct = () => false;

// Daivika is the only store: anything saved under the old "jewels" store counts as Daivika
const storeKey = (g) => {
  const v = String(g || '').toLowerCase().trim();
  return v === 'jewels' || v === 'jewel' ? 'daivika' : v;
};

const isGenderMatch = (prodGender, filterGender) => {
  if (!filterGender || filterGender === 'all') return true;
  if (!prodGender) return false;
  const pg = storeKey(prodGender);
  const fg = storeKey(filterGender);
  if (pg === 'all') return true;
  if (pg === fg) return true;
  if ((fg === 'women' || fg === 'womens' || fg === "women's") && (pg === 'women' || pg === 'womens' || pg === "women's")) return true;
  if ((fg === 'men' || fg === 'mens' || fg === "men's") && (pg === 'men' || pg === 'mens' || pg === "men's")) return true;
  if ((fg === 'kids' || fg === 'kid' || fg === 'children') && (pg === 'kids' || pg === 'kid' || pg === 'children')) return true;
  return false;
};

const isCategoryMatch = (prodCategory, filterCategory) => {
  if (!filterCategory || filterCategory === 'all') return true;
  if (!prodCategory) return false;
  const pc = prodCategory.toLowerCase().trim().replace(/[-_]/g, ' ');
  const fc = filterCategory.toLowerCase().trim().replace(/[-_]/g, ' ');
  return pc === fc;
};

const ProductCardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem', padding: '0 0.5rem' }}>
    <div className="shimmer-bg product-card-image-link" style={{ 
      width: '100%', 
      aspectRatio: '1 / 1', 
      borderRadius: '18px' 
    }} />
    <div className="shimmer-bg" style={{ width: '80%', height: '1.1rem', borderRadius: '6px', marginTop: '0.4rem' }} />
    <div className="shimmer-bg" style={{ width: '50%', height: '0.8rem', borderRadius: '6px' }} />
    <div className="shimmer-bg" style={{ width: '35%', height: '1.4rem', borderRadius: '6px', marginBottom: '1rem' }} />
  </div>
);

const isSizeMatch = (variantName, sizeName) => {
  if (!variantName || !sizeName) return false;
  const v = variantName.toLowerCase().trim();
  const s = sizeName.toLowerCase().trim();
  
  if (v === s) return true;
  
  const parts = v.split(/[\/\-\(\)]+/).map(p => p.trim());
  if (parts.includes(s)) return true;
  
  if (s === 's' && (parts.includes('small') || v.includes(' small') || v.startsWith('small'))) return true;
  if (s === 'm' && (parts.includes('medium') || v.includes(' medium') || v.startsWith('medium'))) return true;
  if (s === 'l' && (parts.includes('large') || v.includes(' large') || v.startsWith('large')) && !v.includes('xl') && !v.includes('xxl') && !v.includes('extra')) return true;
  if (s === 'xl' && (parts.includes('extra large') || parts.includes('x-large') || v.includes('extra large') || v.includes('xl'))) return true;
  if (s === 'xxl' && (parts.includes('xxl') || parts.includes('2xl') || v.includes('xxl') || v.includes('2xl'))) return true;
  
  const words = v.split(/\s+/);
  if (words.includes(s)) return true;

  return false;
};

const ProductList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { latestProductsMap } = useCart();
  const { isJewels, setTheme } = useTheme();
  const [dataLoading, setDataLoading] = useState(() => {
    if (typeof window !== 'undefined' && latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      return false;
    }
    return true;
  });
  const [allProducts, setAllProducts] = useState(() => {
    if (typeof window !== 'undefined' && latestProductsMap) {
      return Object.values(latestProductsMap);
    }
    return [];
  });

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveSubcategory('all');
    setActiveGender('all');
    setActiveSize('all');
    setSearchInput('');
    setSidebarFilters(EMPTY_SIDEBAR_FILTERS);
    navigate('/products');
  };

  useEffect(() => {
    if (latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      setAllProducts(Object.values(latestProductsMap));
      setDataLoading(false);
    }
  }, [latestProductsMap]);

  // Independent direct fetch — ensures products always load even if CartContext cache is empty or stale
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          const list = json.success && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
          if (list.length > 0) {
            setAllProducts(list);
            setDataLoading(false);
          }
        }
      } catch (e) {
        console.warn('ProductsClient: direct product fetch failed', e);
      } finally {
        setDataLoading(false);
      }
    };
    fetchProducts();
  }, []);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [fetchedCollections, setFetchedCollections] = useState([]);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [popularSearches, setPopularSearches] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [activeGender, setActiveGender] = useState('all');
  const [activeSize, setActiveSize] = useState('all');
  const [activeThemeId, setActiveThemeId] = useState('');
  const activeTheme = getTheme(activeThemeId);
  const [sizesList, setSizesList] = useState([]);
  const [isSizeFilterOpen, setIsSizeFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarFilters, setSidebarFilters] = useState(EMPTY_SIDEBAR_FILTERS);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const updateSidebarFilters = (patch) => setSidebarFilters(prev => ({ ...prev, ...patch }));

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamically set page title and Breadcrumb JSON-LD schema based on current catalog view
  const rawCategoryName = activeCategory === 'all' 
    ? (activeGender === 'all' ? SHOP_INTRO.title : `${activeGender.charAt(0).toUpperCase() + activeGender.slice(1)}'s Collection`)
    : (fetchedCategories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase())?.name || activeCategory);
  
  const categoryName = activeTheme && activeCategory === 'all'
    ? activeTheme.title
    : rawCategoryName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const introText = activeCategory !== 'all' ? '' : activeTheme ? activeTheme.description : activeGender === 'all' ? SHOP_INTRO.description : '';

  const pageTitle = activeCategory === 'all'
    ? `All Sacred Collections | DAIVIKA by Zodimithra - Authentic Spiritual Wearables`
    : `${categoryName} | DAIVIKA by Zodimithra - Consecrated Spiritual Wearables`;

  const pageDescription = activeCategory === 'all'
    ? `Browse DAIVIKA by Zodimithra for authentic Karungali malas, Himalayan Rudraksha, sacred Tulasi beads, Panchaloha, and pure pooja essentials.`
    : `Explore DAIVIKA by Zodimithra's authentic ${categoryName} collection. Consecrated by Vedic rituals for spiritual blessings.`;

  useDocumentSEO({
    title: pageTitle,
    description: pageDescription,
    schema: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": typeof window !== 'undefined' ? window.location.origin : 'https://daivika.in'
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Products",
          "item": typeof window !== 'undefined' ? `${window.location.origin}/products` : 'https://daivika.in/products'
        },
        ...(activeCategory !== 'all' ? [{
          "@type": "ListItem",
          "position": 3,
          "name": categoryName,
          "item": typeof window !== 'undefined' ? `${window.location.origin}/products?category=${activeCategory}` : `https://daivika.in/products?category=${activeCategory}`
        }] : [])
      ]
    }
  });

  const [sortBy, setSortBy] = useState('featured');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const genderDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const sizeDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // Close dropdowns on outside click / tap on mobile
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(e.target)) {
        setIsGenderOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryOpen(false);
      }
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target)) {
        setIsSizeFilterOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Fetch Categories from Database or derive from products
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (res.ok) {
          const data = await res.json();
          const cats = Array.isArray(data) ? data : (data.data || []);
          if (cats.length > 0) {
            setFetchedCategories(cats);
            return;
          }
        }
      } catch (e) {}
      if (allProducts && allProducts.length > 0) {
        const uniqueCatNames = [...new Set(allProducts.flatMap(p => productCategoryNames(p)).filter(Boolean))];
        setFetchedCategories(uniqueCatNames.map(c => ({ _id: c, name: c })));
      }
    };
    fetchCats();
    setDataLoading(false);
  }, [allProducts]);



  const [searchInput, setSearchInput] = useState(new URLSearchParams(location.search).get('search') || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Auto-focus search bar when navigated from navbar mobile search icon
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('focus') === 'search') {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [location.search]);

  // Sync URL parameters to state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    const subcategoryParam = params.get('subcategory');
    const searchParam = params.get('search');
    const collectionParam = params.get('collection');
    const sizeParam = params.get('size');
    setActiveThemeId(params.get('theme') || '');

    if (categoryParam) {
      setActiveCategory(categoryParam);
    } else {
      setActiveCategory('all');
    }

    if (subcategoryParam) {
      setActiveSubcategory(subcategoryParam);
    } else {
      setActiveSubcategory('all');
    }

    if (collectionParam) {
      setActiveGender(collectionParam);
    } else {
      setActiveGender('all');
    }

    if (searchParam) {
      setSearchInput(searchParam);
    } else {
      setSearchInput('');
    }

    if (sizeParam) {
      setActiveSize(sizeParam);
    } else {
      setActiveSize('all');
    }

    // Scroll to top when route / URL search parameters change
    window.scrollTo(0, 0);
  }, [location.search]);

  // Does a product pass every active filter? `skip` leaves one filter out, so the sidebar can count
  // how many products each of its options would show.
  const matchesFilters = (p, skip = '') => {
    if (activeGender !== 'all' && !isGenderMatch(p.gender, activeGender)) return false;
    // Home page theme (e.g. ?theme=karungali)
    if (activeTheme && !productMatchesTheme(p, activeTheme)) return false;
    if (skip !== 'category') {
      // Main category or any extra category the admin listed the product under
      const sub = skip !== 'subcategory' && activeSubcategory && activeSubcategory !== 'all' ? activeSubcategory : '';
      if (activeCategory !== 'all' && !productInCategory(p, activeCategory, sub)) return false;
      if (activeCategory === 'all' && sub && !productPlacements(p).some(pl => pl.subcategory && isCategoryMatch(pl.subcategory, sub))) return false;
    }
    if (skip !== 'size' && activeSize && activeSize !== 'all' && !(p.variants && p.variants.some(v => isSizeMatch(v.name, activeSize)))) return false;
    // Search Input State (Live filter)
    if (searchInput.trim()) {
      const query = searchInput.toLowerCase();
      if (!(
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query))
      )) return false;
    }
    const { priceRange, priceMin, priceMax, minDiscount, minRating, inStockOnly } = sidebarFilters;
    if (skip !== 'price') {
      const price = Number(p.price) || 0;
      const range = PRICE_RANGES.find(r => r.id === priceRange);
      if (range && !(price >= range.min && price < range.max)) return false;
      if (priceMin !== '' && price < Number(priceMin)) return false;
      if (priceMax !== '' && price > Number(priceMax)) return false;
    }
    if (skip !== 'discount' && minDiscount && productDiscount(p) < minDiscount) return false;
    if (skip !== 'rating' && minRating && (Number(p.ratingInfo?.rating) || 0) < minRating) return false;
    if (skip !== 'stock' && inStockOnly && !isProductInStock(p)) return false;
    return true;
  };

  // Handle active product catalog filtering (Live search as you type!)
  useEffect(() => {
    const result = allProducts.filter(p => matchesFilters(p));

    // Apply Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredProducts(result);
  }, [activeGender, activeCategory, activeSubcategory, activeSize, searchInput, sortBy, allProducts, isJewels, activeTheme, sidebarFilters]);

  // Dynamic Sizes: Only show sizes that have at least 1 product matching currently selected filters
  const dynamicSizes = React.useMemo(() => {
    return sizesList.filter(s => {
      if (!s.name) return false;
      // Always show currently active size so user can see and unselect it
      if (activeSize !== 'all' && s.name.toLowerCase() === activeSize.toLowerCase()) {
        return true;
      }
      return allProducts.some(p => {
        // Match collection (gender)
        if (activeGender !== 'all') {
          if (!isGenderMatch(p.gender, activeGender)) return false;
        }
        // Match category and subcategory (main or extra placement)
        if (activeCategory !== 'all') {
          if (!productInCategory(p, activeCategory, activeSubcategory)) return false;
        }
        // Match size
        return p.variants && p.variants.some(v => isSizeMatch(v.name, s.name));
      });
    });
  }, [sizesList, allProducts, activeGender, activeCategory, activeSubcategory, activeSize]);

  const handleCollectionChange = (collectionId) => {
    const params = new URLSearchParams(location.search);
    params.delete('category');
    params.delete('subcategory');
    if (collectionId === 'all') {
      params.delete('collection');
    } else {
      params.set('collection', collectionId);
    }
    navigate(`/products?${params.toString()}`);
  };

  const handleFilterChange = (categoryId) => {
    const params = new URLSearchParams(location.search);
    params.delete('subcategory');
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    navigate(`/products?${params.toString()}`);
  };

  const handleSubcategoryChange = (subId) => {
    const params = new URLSearchParams(location.search);
    if (subId === 'all') {
      params.delete('subcategory');
    } else {
      params.set('subcategory', subId);
    }
    navigate(`/products?${params.toString()}`);
  };

  const handleSizeChange = (sizeId) => {
    const params = new URLSearchParams(location.search);
    if (sizeId === 'all') {
      params.delete('size');
    } else {
      params.set('size', sizeId);
    }
    navigate(`/products?${params.toString()}`);
  };

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    "Search for Karungali malas...",
    "Looking for Rudraksha...",
    "Find pooja essentials...",
    "Discover crystals & gemstones...",
    "Search energised adornments..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(location.search);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    navigate(`/products?${params.toString()}`);
  };

  // Live categories list strictly derived from actual active products in store
  const categoriesList = React.useMemo(() => {
    // 1. Get unique categories present across all actual active products
    const availableFromProducts = [...new Set(
      allProducts
        .filter(p => {
          if (activeGender !== 'all' && !isGenderMatch(p.gender, activeGender)) return false;
          return true;
        })
        .flatMap(p => productCategoryNames(p))
        .filter(Boolean)
    )];

    // 2. Map available product categories to formatted objects using database metadata if found,
    //    in the order the admin set (categories without a saved entry go last, A–Z)
    if (availableFromProducts.length > 0) {
      const rank = (cat) => {
        const i = fetchedCategories.findIndex(fc => fc.name?.toLowerCase().trim() === String(cat.name || '').toLowerCase().trim());
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      return availableFromProducts.map(catName => {
        const found = fetchedCategories.find(fc => fc.name?.toLowerCase().trim() === catName.toLowerCase().trim());
        return found || { _id: catName, name: catName };
      }).sort((a, b) => (rank(a) - rank(b)) || a.name.localeCompare(b.name));
    }

    // 3. Fallback to fetchedCategories
    const themeCategories = fetchedCategories;
    return activeGender === 'all'
      ? themeCategories
      : themeCategories.filter(cat => cat.gender && (cat.gender.toLowerCase() === 'all' || storeKey(cat.gender) === storeKey(activeGender)));
  }, [fetchedCategories, allProducts, isJewels, activeGender]);

  const collectionsList = fetchedCollections;

  // Left sidebar: each option shows how many products it would leave, given the other active filters
  const countWhere = (skip, test) => allProducts.reduce((n, p) => n + (matchesFilters(p, skip) && test(p) ? 1 : 0), 0);
  const sidebarSizes = (() => {
    const byKey = new Map();
    allProducts.forEach(p => {
      if (!matchesFilters(p, 'size')) return;
      const seen = new Set();
      (Array.isArray(p.variants) ? p.variants : []).forEach(v => {
        const name = String(v?.name || '').trim();
        const key = name.toLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        const entry = byKey.get(key) || { name, count: 0 };
        entry.count += 1;
        byKey.set(key, entry);
      });
    });
    if (activeSize !== 'all' && !byKey.has(activeSize.toLowerCase())) byKey.set(activeSize.toLowerCase(), { name: activeSize, count: 0 });
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  })();
  const activeSidebarCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeSubcategory && activeSubcategory !== 'all' ? 1 : 0) +
    (activeSize !== 'all' ? 1 : 0) +
    (sidebarFilters.priceRange || sidebarFilters.priceMin !== '' || sidebarFilters.priceMax !== '' ? 1 : 0) +
    (sidebarFilters.minDiscount ? 1 : 0) +
    (sidebarFilters.minRating ? 1 : 0) +
    (sidebarFilters.inStockOnly ? 1 : 0);

  const filterSidebar = (
    <ProductFilterSidebar
      categories={categoriesList.map(c => ({ name: c.name, count: countWhere('category', p => productInCategory(p, c.name)) }))}
      activeCategory={activeCategory}
      onCategoryChange={handleFilterChange}
      subcategories={(categoriesList.find(c => c.name.toLowerCase() === activeCategory.toLowerCase())?.subcategories || [])
        .map(name => ({ name, count: countWhere('subcategory', p => productInCategory(p, activeCategory, name)) }))}
      activeSubcategory={activeSubcategory}
      onSubcategoryChange={handleSubcategoryChange}
      sizes={sidebarSizes}
      activeSize={activeSize}
      onSizeChange={handleSizeChange}
      priceRanges={PRICE_RANGES.map(r => ({ ...r, count: countWhere('price', p => (Number(p.price) || 0) >= r.min && (Number(p.price) || 0) < r.max) }))}
      priceRange={sidebarFilters.priceRange}
      priceMin={sidebarFilters.priceMin}
      priceMax={sidebarFilters.priceMax}
      onPriceRangeChange={(id) => updateSidebarFilters({ priceRange: id, priceMin: '', priceMax: '' })}
      onCustomPrice={(min, max) => updateSidebarFilters({ priceRange: '', priceMin: min, priceMax: max })}
      discounts={DISCOUNT_STEPS.map(value => ({ value, count: countWhere('discount', p => productDiscount(p) >= value) }))}
      minDiscount={sidebarFilters.minDiscount}
      onDiscountChange={(value) => updateSidebarFilters({ minDiscount: value })}
      ratings={RATING_STEPS.map(value => ({ value, count: countWhere('rating', p => (Number(p.ratingInfo?.rating) || 0) >= value) }))}
      minRating={sidebarFilters.minRating}
      onRatingChange={(value) => updateSidebarFilters({ minRating: value })}
      inStockCount={countWhere('stock', isProductInStock)}
      inStockOnly={sidebarFilters.inStockOnly}
      onInStockChange={(value) => updateSidebarFilters({ inStockOnly: value })}
      activeCount={activeSidebarCount}
      onClearAll={handleResetFilters}
    />
  );

  return (
    <>
      <div style={{ backgroundColor: 'var(--color-bg)', minHeight: '100vh', fontFamily: '"Poppins", sans-serif' }}>
      
      {/* Main Catalog View Container */}
      <div className="container" style={{
        maxWidth: '1560px',
        margin: '0 auto',
        paddingTop: isMobile ? '1rem' : '1.75rem',
        paddingBottom: isMobile ? '8.5rem' : '6rem',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: isMobile ? '0.45rem' : '0.6rem' }}>
          <Breadcrumbs items={[
            { name: 'Products', url: '/products' },
            ...(activeCategory !== 'all' ? [{ name: categoryName, url: `/products?category=${activeCategory}` }] : []),
            ...(activeCategory !== 'all' && activeSubcategory && activeSubcategory !== 'all'
              ? [{ name: activeSubcategory, url: `/products?category=${encodeURIComponent(activeCategory)}&subcategory=${encodeURIComponent(activeSubcategory)}` }]
              : [])
          ]} />
        </div>

        <h1 style={{
          fontSize: isMobile ? '1.35rem' : 'clamp(1.5rem, 3.5vw, 2.2rem)',
          fontWeight: 900,
          color: '#0f172a',
          margin: isMobile ? '0.35rem 0 0.85rem 0' : '0 0 1rem 0',
          letterSpacing: '-0.5px'
        }}>
          {categoryName}
        </h1>
        {introText && (
          <p style={{ margin: isMobile ? '-0.4rem 0 1rem 0' : '-0.4rem 0 1.25rem 0', maxWidth: '760px', color: '#5f5a55', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: 1.65 }}>
            {introText}
          </p>
        )}
        
        {/* Top Control Bar: Search & Sorting */}
        <div className="store-top-bar">
          <style>{`
            .store-search-input-wrapper {
              display: flex;
              align-items: center;
              width: 100%;
              border: 1px solid rgba(var(--color-primary-rgb), 0.12);
              border-radius: 16px;
              background-color: #ffffff;
              padding: 0 6.5rem 0 1.25rem;
              box-sizing: border-box;
              transition: all 0.3s ease;
            }
            .store-search-input-wrapper:focus-within {
              border-color: var(--color-primary) !important;
              box-shadow: 0 0 0 1px var(--color-primary);
            }
            .store-search-icon {
              color: var(--color-primary);
              opacity: 0.6;
              margin-right: 0.8rem;
              flex-shrink: 0;
              display: flex;
              align-items: center;
            }
            .store-search-input {
              width: 100%;
              padding: 0.9rem 0;
              font-size: 0.95rem;
              border: none;
              background: transparent;
              outline: none;
              font-family: inherit;
              color: #2D2D2D;
            }
            .store-search-btn {
              position: absolute;
              right: 6px;
              top: 6px;
              bottom: 6px;
              background-color: var(--color-primary);
              color: #ffffff;
              border: none;
              border-radius: 12px;
              padding: 0 1.5rem;
              font-weight: 700;
              font-size: 0.85rem;
              letter-spacing: 0.5px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.4rem;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.2);
            }
            .store-search-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.3);
            }
            @media (max-width: 768px) {
              .store-search-input-wrapper {
                padding: 0 5.5rem 0 1rem;
              }
              .store-search-icon {
                margin-right: 0.6rem;
              }
              .store-search-input {
                font-size: 0.75rem;
                padding: 0.8rem 0;
              }
              .store-search-btn {
                padding: 0 1rem;
                font-size: 0.75rem;
              }
            }
          `}</style>
          {/* High-End Search Bar */}
          <form onSubmit={handleSearch} style={{ position: 'relative', width: '100%' }}>
            <div className="store-search-input-wrapper">
              <div className="store-search-icon">
                <Search size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholders[placeholderIndex]}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="store-search-input"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
            </div>
            <button
              type="submit"
              className="store-search-btn"
            >
              FIND <Sparkles size={14} />
            </button>

            {/* Live Search Suggestions Dropdown */}
            <AnimatePresence>
              {isSearchFocused && searchInput.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '0.75rem',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.08)',
                    overflow: 'hidden',
                    zIndex: 1000
                  }}
                >
                  <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Top Products Match
                    </span>
                  </div>
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.slice(0, 5).map(product => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => setIsSearchFocused(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1.25rem',
                            textDecoration: 'none',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(var(--color-primary-rgb), 0.04)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f9fafb' }}>
                            <img src={getOptimizedImageUrl(product.image, 100)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{product.category}</p>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                            ₹{product.price}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                        No matches found for "{searchInput}"
                      </div>
                    )}
                  </div>
                  {filteredProducts.length > 5 && (
                    <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                        Press Enter to view all {filteredProducts.length} results
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Filter & Sorting Controls Dropdown Container */}
          <div className="store-dropdowns-container">
            {/* Collection Dropdown */}
             <div className="store-gender-wrapper" ref={genderDropdownRef} style={{ position: 'relative', flex: 1 }}>
               <button
                 className="store-filter-btn"
                 onClick={() => {
                   setIsGenderOpen(!isGenderOpen);
                   setIsCategoryOpen(false);
                   setIsSortOpen(false);
                   setIsSizeFilterOpen(false);
                 }}
               >
                 <span className="store-filter-label">
                   <Filter size={14} color="var(--color-primary)" /> Collection:
                 </span>
                 <span className="store-filter-value">
                   {activeGender === 'all' ? 'All' : activeGender}
                 </span>
                 <ChevronDown size={14} style={{ flexShrink: 0, transform: isGenderOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', opacity: 0.7 }} />
               </button>

               <AnimatePresence>
                 {isGenderOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     style={{
                       position: 'absolute',
                       top: '115%',
                       right: 0,
                       left: 0,
                       backgroundColor: '#ffffff',
                       borderRadius: '16px',
                       boxShadow: '0 15px 40px rgba(var(--color-primary-rgb), 0.08)',
                       padding: '0.5rem',
                       zIndex: 100,
                       border: '1px solid rgba(var(--color-primary-rgb), 0.05)',
                       boxSizing: 'border-box',
                       maxHeight: '260px',
                       overflowY: 'auto'
                     }}
                   >
                     <button
                       onClick={() => {
                         handleCollectionChange('all');
                         setIsGenderOpen(false);
                       }}
                       style={{
                         width: '100%',
                         padding: '0.75rem 1rem',
                         borderRadius: '10px',
                         border: 'none',
                         backgroundColor: activeGender === 'all' ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                         color: activeGender === 'all' ? 'var(--color-primary)' : '#2D2D2D',
                         fontSize: '0.85rem',
                         fontWeight: activeGender === 'all' ? 800 : 600,
                         textAlign: 'left',
                         cursor: 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         boxSizing: 'border-box'
                       }}
                     >
                       All Collections
                       {activeGender === 'all' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                     </button>
                     {collectionsList.map((col) => {
                       const isSelected = activeGender.toLowerCase() === col.name.toLowerCase();
                       return (
                         <button
                           key={col._id || col.name}
                           onClick={() => {
                             handleCollectionChange(col.name);
                             setIsGenderOpen(false);
                           }}
                           style={{
                             width: '100%',
                             padding: '0.75rem 1rem',
                             borderRadius: '10px',
                             border: 'none',
                             backgroundColor: isSelected ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                             color: isSelected ? 'var(--color-primary)' : '#2D2D2D',
                             fontSize: '0.85rem',
                             fontWeight: isSelected ? 800 : 600,
                             textAlign: 'left',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'space-between',
                             textTransform: 'capitalize',
                             boxSizing: 'border-box'
                           }}
                         >
                           {col.name === 'all' ? 'All (Unisex)' : col.name}
                           {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                         </button>
                       );
                     })}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* Category Dropdown */}
             <div className="store-category-wrapper" ref={categoryDropdownRef} style={{ position: 'relative', flex: 1 }}>
               <button
                 className="store-filter-btn"
                 onClick={() => {
                   setIsCategoryOpen(!isCategoryOpen);
                   setIsGenderOpen(false);
                   setIsSortOpen(false);
                   setIsSizeFilterOpen(false);
                 }}
               >
                 <span className="store-filter-label">
                   <Filter size={14} color="var(--color-primary)" /> Category:
                 </span>
                 <span className="store-filter-value">
                   {activeCategory === 'all' ? 'All Categories' : activeCategory}
                 </span>
                 <ChevronDown size={14} style={{ flexShrink: 0, transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', opacity: 0.7 }} />
               </button>

               <AnimatePresence>
                 {isCategoryOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     style={{
                       position: 'absolute',
                       top: '115%',
                       right: 0,
                       left: 0,
                       backgroundColor: '#ffffff',
                       borderRadius: '16px',
                       boxShadow: '0 15px 40px rgba(var(--color-primary-rgb), 0.08)',
                       padding: '0.5rem',
                       zIndex: 100,
                       border: '1px solid rgba(var(--color-primary-rgb), 0.05)',
                       boxSizing: 'border-box',
                       maxHeight: '260px',
                       overflowY: 'auto'
                     }}
                   >
                     <button
                       onClick={() => {
                         handleFilterChange('all');
                         setIsCategoryOpen(false);
                       }}
                       style={{
                         width: '100%',
                         padding: '0.75rem 1rem',
                         borderRadius: '10px',
                         border: 'none',
                         backgroundColor: activeCategory === 'all' ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                         color: activeCategory === 'all' ? 'var(--color-primary)' : '#2D2D2D',
                         fontSize: '0.85rem',
                         fontWeight: activeCategory === 'all' ? 800 : 600,
                         textAlign: 'left',
                         cursor: 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         boxSizing: 'border-box'
                       }}
                     >
                       All Categories
                       {activeCategory === 'all' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                     </button>
                     {categoriesList.map((cat) => {
                       const isSelected = activeCategory.toLowerCase() === cat.name.toLowerCase();
                       return (
                         <button
                           key={cat._id || cat.name}
                           onClick={() => {
                             handleFilterChange(cat.name);
                             setIsCategoryOpen(false);
                           }}
                           style={{
                             width: '100%',
                             padding: '0.75rem 1rem',
                             borderRadius: '10px',
                             border: 'none',
                             backgroundColor: isSelected ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                             color: isSelected ? 'var(--color-primary)' : '#2D2D2D',
                             fontSize: '0.85rem',
                             fontWeight: isSelected ? 800 : 600,
                             textAlign: 'left',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'space-between',
                             textTransform: 'capitalize',
                             boxSizing: 'border-box'
                           }}
                         >
                           {cat.name}
                           {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                         </button>
                       );
                     })}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* Size Dropdown */}
             <div className="store-size-wrapper" ref={sizeDropdownRef} style={{ position: 'relative', flex: 1 }}>
               <button
                 className="store-filter-btn"
                 onClick={() => {
                   setIsSizeFilterOpen(!isSizeFilterOpen);
                   setIsCategoryOpen(false);
                   setIsGenderOpen(false);
                   setIsSortOpen(false);
                 }}
               >
                 <span className="store-filter-label">
                   <Tag size={14} color="var(--color-primary)" /> Size:
                 </span>
                 <span className="store-filter-value" style={{ textTransform: 'uppercase' }}>
                   {activeSize === 'all' ? 'All Sizes' : activeSize}
                 </span>
                 <ChevronDown size={14} style={{ flexShrink: 0, transform: isSizeFilterOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', opacity: 0.7 }} />
               </button>

               <AnimatePresence>
                 {isSizeFilterOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 10, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     style={{
                       position: 'absolute',
                       top: '115%',
                       right: 0,
                       left: 0,
                       backgroundColor: '#ffffff',
                       borderRadius: '16px',
                       boxShadow: '0 15px 40px rgba(var(--color-primary-rgb), 0.08)',
                       padding: '0.5rem',
                       zIndex: 100,
                       border: '1px solid rgba(var(--color-primary-rgb), 0.05)',
                       boxSizing: 'border-box',
                       maxHeight: '260px',
                       overflowY: 'auto'
                     }}
                   >
                     <button
                       onClick={() => {
                         handleSizeChange('all');
                         setIsSizeFilterOpen(false);
                       }}
                       style={{
                         width: '100%',
                         padding: '0.75rem 1rem',
                         borderRadius: '10px',
                         border: 'none',
                         backgroundColor: activeSize === 'all' ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                         color: activeSize === 'all' ? 'var(--color-primary)' : '#2D2D2D',
                         fontSize: '0.85rem',
                         fontWeight: activeSize === 'all' ? 800 : 600,
                         textAlign: 'left',
                         cursor: 'pointer',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         boxSizing: 'border-box'
                       }}
                     >
                       All Sizes
                       {activeSize === 'all' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                     </button>
                     {dynamicSizes.map((s) => {
                       const isSelected = activeSize.toLowerCase() === s.name.toLowerCase();
                       return (
                         <button
                           key={s._id || s.name}
                           onClick={() => {
                             handleSizeChange(s.name);
                             setIsSizeFilterOpen(false);
                           }}
                           style={{
                             width: '100%',
                             padding: '0.75rem 1rem',
                             borderRadius: '10px',
                             border: 'none',
                             backgroundColor: isSelected ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                             color: isSelected ? 'var(--color-primary)' : '#2D2D2D',
                             fontSize: '0.85rem',
                             fontWeight: isSelected ? 800 : 600,
                             textAlign: 'left',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'space-between',
                             textTransform: 'uppercase',
                             boxSizing: 'border-box'
                           }}
                         >
                           {s.name}
                           {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                         </button>
                       );
                     })}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

            {/* Filters button (phones & tablets): opens the sidebar filters as a slide-in panel */}
            {isMobile && (
              <button type="button" className="store-filter-btn" onClick={() => setIsFilterDrawerOpen(true)}>
                <span className="store-filter-label">
                  <SlidersHorizontal size={14} color="var(--color-primary)" /> Filters
                </span>
                {activeSidebarCount > 0 && <span className="store-filter-value">{activeSidebarCount} applied</span>}
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="store-sort-wrapper" ref={sortDropdownRef} style={{ position: 'relative', flex: 1 }}>
              <button
                className="store-filter-btn"
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsCategoryOpen(false);
                  setIsGenderOpen(false);
                  setIsSizeFilterOpen(false);
                }}
              >
                <span className="store-filter-label">
                  <SlidersHorizontal size={14} color="var(--color-primary)" /> Sort:
                </span>
                <span className="store-filter-value">
                  {sortBy === 'featured' ? 'Featured' :
                   sortBy === 'price-low' ? 'Price: Low-High' :
                   sortBy === 'price-high' ? 'Price: High-Low' : 'Name: A-Z'}
                </span>
                <ChevronDown size={14} style={{ flexShrink: 0, transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s', opacity: 0.7 }} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    style={{
                      position: 'absolute',
                      top: '115%',
                      right: 0,
                      left: 0,
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      boxShadow: '0 15px 40px rgba(var(--color-primary-rgb), 0.08)',
                      padding: '0.5rem',
                      zIndex: 100,
                      border: '1px solid rgba(var(--color-primary-rgb), 0.05)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {[
                      { id: 'featured', label: 'Featured' },
                      { id: 'price-low', label: 'Price: Low to High' },
                      { id: 'price-high', label: 'Price: High to Low' },
                      { id: 'name', label: 'Name: A to Z' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSortBy(option.id);
                          setIsSortOpen(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: sortBy === option.id ? 'rgba(var(--color-primary-rgb), 0.06)' : 'transparent',
                          color: sortBy === option.id ? 'var(--color-primary)' : '#2D2D2D',
                          fontSize: '0.85rem',
                          fontWeight: sortBy === option.id ? 800 : 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box'
                        }}
                      >
                        {option.label}
                        {sortBy === option.id && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>



        <ProductFilterDrawer open={isMobile && isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)} resultCount={filteredProducts.length}>
          {filterSidebar}
        </ProductFilterDrawer>

        <div className="store-catalog-layout">
        {!isMobile && <aside className="store-filter-sidebar">{filterSidebar}</aside>}
        <div className="store-catalog-main">
        {/* Horizontal Subcategory Filter Chips Row */}
        {activeCategory !== 'all' && (
          <div style={{
            display: 'flex',
            gap: '0.65rem',
            overflowX: 'auto',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '0.5rem 0.25rem 1.25rem 0.25rem',
            marginBottom: '2rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }} className="hide-scrollbar">
            {/* All Pill */}
            <button
              onClick={() => handleSubcategoryChange('all')}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '100px',
                border: '1px solid',
                borderColor: activeSubcategory === 'all' ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.1)',
                backgroundColor: activeSubcategory === 'all' ? 'var(--color-primary)' : '#ffffff',
                color: activeSubcategory === 'all' ? '#ffffff' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.25s ease',
                boxShadow: activeSubcategory === 'all' ? '0 6px 16px rgba(var(--color-primary-rgb), 0.15)' : 'none',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              All {categoryName}
            </button>
            {/* Subcategory list */}
            {categoriesList.find(c => c.name.toLowerCase() === activeCategory.toLowerCase())?.subcategories?.map(sub => {
              const isSelected = activeSubcategory.toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  onClick={() => handleSubcategoryChange(sub)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '100px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb), 0.1)',
                    backgroundColor: isSelected ? 'var(--color-primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    transition: 'all 0.25s ease',
                    boxShadow: isSelected ? '0 6px 16px rgba(var(--color-primary-rgb), 0.15)' : 'none',
                    outline: 'none',
                    letterSpacing: '0.5px'
                  }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}
        {/* Dynamic Product Catalog Grid */}
        {dataLoading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
            gap: isMobile ? '0.75rem' : '1.5rem',
            marginTop: '1.5rem',
            marginBottom: isMobile ? '3.5rem' : '2.5rem'
          }}>
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                fontSize: '0.88rem',
                color: '#64748b'
              }}>
                <span>Showing <strong style={{ color: '#0f172a' }}>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
                gap: isMobile ? '0.75rem' : '1.5rem',
                marginTop: '1rem',
                marginBottom: isMobile ? '3.5rem' : '2.5rem'
              }}>
              {filteredProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} activeSize={activeSize} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '2.5rem 1.25rem' : '4rem 2rem',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(var(--color-primary-rgb), 0.08)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
            color: '#666',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '1rem' : '1.25rem',
            maxWidth: '480px',
            margin: '1rem auto 2rem auto',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              width: isMobile ? '60px' : '72px',
              height: isMobile ? '60px' : '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(var(--color-primary-rgb), 0.6) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(var(--color-primary-rgb), 0.25)',
              flexShrink: 0
            }}>
              <svg width={isMobile ? "26" : "32"} height={isMobile ? "26" : "32"} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#1a1a1a', fontSize: isMobile ? '1.35rem' : '1.6rem', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                No Products Found
              </h2>
              <p style={{ margin: '0 auto', fontSize: isMobile ? '0.88rem' : '0.95rem', color: '#64748b', lineHeight: 1.6, maxWidth: '340px' }}>
                No products match your selected filters. Try clearing your filters or search query.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleResetFilters}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '100px',
                  padding: isMobile ? '0.75rem 1.6rem' : '0.85rem 2rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.82rem' : '0.88rem',
                  boxShadow: '0 6px 20px rgba(var(--color-primary-rgb), 0.25)',
                  transition: 'all 0.25s ease'
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
        </div>
        </div>


      </div>
      
      {styleTag}
    </div>
    </>
  );
};

// Pure, responsive CSS layouts and grid parameters
const styleTag = (
  <style dangerouslySetInnerHTML={{
    __html: `
    .store-top-bar {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: stretch;
      margin-top: 0;
      margin-bottom: 2rem;
    }

    @media (max-width: 1023px) {
      .store-top-bar {
        gap: 1.25rem;
        margin-top: 1.75rem;
      }
    }

    .store-dropdowns-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      width: 100%;
      box-sizing: border-box;
    }

    /* Collection, category and size filters live in the left sidebar / Filters panel now */
    .store-dropdowns-container .store-gender-wrapper,
    .store-dropdowns-container .store-category-wrapper,
    .store-dropdowns-container .store-size-wrapper {
      display: none;
    }

    @media (min-width: 1024px) {
      .store-dropdowns-container {
        display: flex;
        justify-content: flex-end;
      }
      .store-dropdowns-container .store-sort-wrapper {
        flex: 0 0 280px !important;
      }
    }

    @media (max-width: 1024px) {
      .store-dropdowns-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
    }

    .store-catalog-layout {
      display: flex;
      align-items: flex-start;
      gap: 1.75rem;
    }
    .store-filter-sidebar {
      flex: 0 0 260px;
      position: sticky;
      top: 6rem;
      max-height: calc(100vh - 7rem);
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .store-catalog-main {
      flex: 1;
      min-width: 0;
    }

    @media (max-width: 580px) {
      .store-dropdowns-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        width: 100%;
      }
      .store-gender-wrapper,
      .store-category-wrapper,
      .store-size-wrapper,
      .store-sort-wrapper {
        min-width: 0;
        width: 100%;
        flex: 1 1 auto;
      }
    }

    .store-filter-btn {
      width: 100%;
      padding: 0.85rem 1.15rem;
      border-radius: 16px;
      border: 1px solid rgba(var(--color-primary-rgb), 0.12);
      background-color: #ffffff;
      font-size: 0.88rem;
      font-weight: 700;
      color: #2D2D2D;
      cursor: pointer;
      outline: none;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .store-filter-btn:hover {
      border-color: rgba(var(--color-primary-rgb), 0.3);
    }
    .store-filter-label {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #64748b;
      font-weight: 500;
      font-size: 0.85rem;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .store-filter-value {
      text-transform: capitalize;
      font-weight: 800;
      color: var(--color-primary);
      font-size: 0.85rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      text-align: right;
      flex: 1;
      margin-right: 0.15rem;
    }

    @media (max-width: 768px) {
      .store-filter-btn {
        padding: 0.65rem 0.65rem;
        border-radius: 12px;
        font-size: 0.78rem;
        gap: 0.25rem;
      }
      .store-filter-label {
        font-size: 0.74rem;
        gap: 0.25rem;
      }
      .store-filter-value {
        font-size: 0.74rem;
      }
    }

    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}} />
);

export default ProductList;
