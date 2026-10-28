'use client';
// Test comment to trigger hot reloading
import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@/hooks/useRouterShim';
import { 
  ArrowRight, Truck, ShieldCheck, RefreshCw, Sparkles, 
  Activity, Star, ChevronLeft, ChevronRight, Sprout, Flame, Milk,
  Headphones, Gift, ShoppingBag, Percent, Clock
} from 'lucide-react';

const iconMap = {
  Truck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Activity,
  Star,
  Sprout,
  Flame,
  Milk,
  Headphones,
  Gift,
  ShoppingBag,
  Percent,
  Clock
};

const renderAnnouncementIcon = (iconName, size = 14) => {
  const IconComponent = iconMap[iconName] || Sparkles;
  return <IconComponent size={size} />;
};
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { useCart } from '@/context/CartContext';
import { useAlert } from '@/context/AlertContext';
import { useTheme } from '@/context/ThemeContext';
import { API_BASE_URL } from '@/config';
import PremiumHero from '@/components/PremiumHero';
import { ThemedProductSection, StoriesGallery } from '@/components/home/SacredSection';
import { HOME_INTRO, BESTSELLERS, STORIES, THEMES, productMatchesTheme } from '@/lib/home-sections';
import { productInCategory } from '@/lib/product-categories';
import PageLoader from '@/components/PageLoader';
const deliveryManImg = '/delivery_man.png';

const isJewelsProduct = () => false;

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

const KeepShoppingSkeleton = () => (
  <div className="keep-shopping-skeleton">
    <div className="keep-shopping-skeleton-img shimmer-bg" />
    <div className="keep-shopping-skeleton-info">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div className="shimmer-bg" style={{ width: '40%', height: '0.65rem', borderRadius: '4px' }} />
        <div className="shimmer-bg" style={{ width: '90%', height: '0.95rem', borderRadius: '6px' }} />
      </div>
      <div className="shimmer-bg" style={{ width: '50%', height: '1.1rem', borderRadius: '6px' }} />
    </div>
  </div>
);

const collectionImageMap = {
  'bottoms': 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80',
  'night wears': 'https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?auto=format&fit=crop&w=600&q=80',
  'salwars': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
  'shawls': 'https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?auto=format&fit=crop&w=600&q=80',
  'accessories': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
  'men': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
  'women': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
  'kids': 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=600&q=80'
};

const getCollectionImage = (name) => {
  if (!name) return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80';
  const lower = name.toLowerCase().trim();
  return collectionImageMap[lower] || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80';
};

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

const Home = () => {
  // Advanced SEO & JSON-LD Structured schema
  useDocumentSEO({
    title: 'Daivika by Zodimithra | Authentic Spiritual Wearables, Karungali & Rudraksha',
    description: 'Discover authentic, energised spiritual products at Daivika by Zodimithra. Shop original Karungali malas, sacred Himalayan Rudraksha, Tulasi beads, Panchaloha, and pure pooja essentials.',
    schema: {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": "Daivika by Zodimithra",
      "url": typeof window !== 'undefined' ? window.location.origin : 'https://daivika.in',
      "logo": typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://daivika.in/logo.png',
      "description": "Authentic Spiritual Wearables, Karungali Malas, Consecrated Rudraksha & Pooja Essentials",
      "telephone": "+91 75108 21228",
      "priceRange": "₹₹",
      "potentialAction": {
        "@type": "SearchAction",
        "target": typeof window !== 'undefined' ? `${window.location.origin}/products?search={search_term_string}` : 'https://daivika.in/products?search={search_term_string}',
        "query-input": "required name=search_term_string"
      }
    }
  });

  const { addToCart, latestProductsMap } = useCart();
  const { showAlert } = useAlert();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setSubmittingNewsletter(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Successfully subscribed! ✉️', 'Newsletter');
        setNewsletterEmail('');
      } else {
        showAlert(data.message || 'Subscription failed.', 'Newsletter Error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Subscription failed. Connection issue.', 'Network Error');
    } finally {
      setSubmittingNewsletter(false);
    }
  };
  // Starts like the server render; the splash is skipped before the first paint when this session has
  // already seen it (reading sessionStorage during render broke hydration for returning visitors)
  const [pageLoading, setPageLoading] = useState(true);
  React.useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem('daivika_initial_loaded')) setPageLoading(false);
    } catch {}
  }, []);
  const [dataLoading, setDataLoading] = useState(() => {
    if (typeof window !== 'undefined' && latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      return false;
    }
    return true;
  });
  const [shippingThreshold, setShippingThreshold] = useState(500);

  useEffect(() => {
    const updateShippingThreshold = () => {
      const saved = localStorage.getItem('vaugun_free_shipping_threshold');
      if (saved) {
        setShippingThreshold(parseInt(saved) || 500);
      }
    };
    updateShippingThreshold();
    window.addEventListener('storage', updateShippingThreshold);
    window.addEventListener('vaugun_settings_updated', updateShippingThreshold);
    return () => {
      window.removeEventListener('storage', updateShippingThreshold);
      window.removeEventListener('vaugun_settings_updated', updateShippingThreshold);
    };
  }, []);

  const [allProducts, setAllProducts] = useState(() => {
    if (typeof window !== 'undefined' && latestProductsMap) {
      return Object.values(latestProductsMap);
    }
    return [];
  });

  useEffect(() => {
    if (latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      setAllProducts(Object.values(latestProductsMap));
      setDataLoading(false);
    }
  }, [latestProductsMap]);

  useEffect(() => {
    const fetchFreshProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          if (Array.isArray(data) && data.length > 0) {
            setAllProducts(data);
            setDataLoading(false);
          }
        }
      } catch (e) {
        console.warn('Direct homepage products fetch fallback error:', e);
      }
    };
    fetchFreshProducts();
  }, []);

  // Dynamic Feature Cards — syncs from admin dashboard via localStorage
  const [featureCards, setFeatureCards] = useState(() => {
    const defaults = [
      { title: '100% Authentic & Energised', desc: 'Prana Pratishtha by Vedic rituals', icon: 'Flame', bg: 'rgba(181, 231, 109, 0.08)' },
      { title: 'Pure Sacred Materials', desc: 'Original Karungali, Rudraksha & Tulasi', icon: 'Sprout', bg: 'rgba(189, 155, 59, 0.08)' },
      { title: 'Devotional Sacred Packaging', desc: 'Dispatched with protective care', icon: 'Sparkles', bg: 'rgba(10, 10, 10, 0.06)' },
      { title: 'Trusted by Devotees', desc: 'Sacred blessings across India', icon: 'ShieldCheck', bg: 'rgba(181, 231, 109, 0.08)' }
    ];
    if (typeof window === 'undefined') return defaults;
    const saved = localStorage.getItem('vaugun_feature_cards');
    if (saved) { try { return JSON.parse(saved); } catch (e) { return defaults; } }
    return defaults;
  });

  useEffect(() => {
    const syncFeatureCards = () => {
      const saved = localStorage.getItem('vaugun_feature_cards');
      if (saved) { try { setFeatureCards(JSON.parse(saved)); } catch (e) {} }
    };
    window.addEventListener('storage', syncFeatureCards);
    window.addEventListener('vaugun_settings_updated', syncFeatureCards);
    return () => {
      window.removeEventListener('storage', syncFeatureCards);
      window.removeEventListener('vaugun_settings_updated', syncFeatureCards);
    };
  }, []);


  const [collectionsList, setCollectionsList] = useState([]);
  const [sizesList, setSizesList] = useState([]);
  const [keepShoppingProducts, setKeepShoppingProducts] = useState([]);
  const [sacredStories, setSacredStories] = useState([]);
  const [bestsellerIds, setBestsellerIds] = useState([]);
  const [liveAnnouncements, setLiveAnnouncements] = useState([
    { text: "100% ORIGINAL & ENERGISED KARUNGALI & RUDRAKSHA", icon: "Sparkles" },
    { text: "PRANA PRATISHTHA CONSECRATED BY VEDIC RITUALS", icon: "Flame" },
    { text: "SACRED DEVOTIONAL PACKAGING ON ALL ORDERS", icon: "Truck" },
    { text: "CERTIFIED NATURAL WOODS, GEMSTONES & PANCHALOHA", icon: "ShieldCheck" },
    { text: "FREE SACRED BLESSING GIFT ON PREPAID ORDERS", icon: "Sparkles" },
    { text: "DEVOTEE CONCIERGE & SUPPORT ASSISTANCE", icon: "Star" }
  ]);

  useEffect(() => {
    const updateAnnouncements = () => {
      try {
        const saved = localStorage.getItem('vaugun_announcements');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveAnnouncements(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading announcements:', e);
      }
    };

    const loadSettingsFromDB = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`);
        if (res.ok) {
          const resJson = await res.json();
          const data = resJson.data || resJson;
          if (data?.announcements) {
            localStorage.setItem('vaugun_announcements', JSON.stringify(data.announcements));
            setLiveAnnouncements(data.announcements);
          }
          if (data?.free_shipping_threshold !== undefined) {
            localStorage.setItem('vaugun_free_shipping_threshold', data.free_shipping_threshold);
          }
          if (data?.feature_cards && Array.isArray(data.feature_cards) && data.feature_cards.length > 0) {
            localStorage.setItem('vaugun_feature_cards', JSON.stringify(data.feature_cards));
            setFeatureCards(data.feature_cards);
          }
          setSacredStories(Array.isArray(data?.sacred_stories) ? data.sacred_stories : []);
        }
      } catch (e) {
        console.warn('Could not load announcements from DB on homepage:', e);
      }
    };

    fetch(`${API_BASE_URL}/public/bestsellers`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => setBestsellerIds((j?.data || []).map(r => r.productId)))
      .catch(() => {});

    updateAnnouncements();
    loadSettingsFromDB();
    window.addEventListener('storage', updateAnnouncements);
    window.addEventListener('vaugun_settings_updated', updateAnnouncements);

    return () => {
      window.removeEventListener('storage', updateAnnouncements);
      window.removeEventListener('vaugun_settings_updated', updateAnnouncements);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daivika_keep_shopping_products');
        if (saved) {
          setKeepShoppingProducts(JSON.parse(saved) || []);
        }
      } catch (e) {
        console.error('Error loading keep shopping products:', e);
      }
    }
  }, []);

  const storeProducts = React.useMemo(() => {
    return allProducts || [];
  }, [allProducts]);

  // Products for each content section (rituals, karungali, rudraksha, crystals, adornments)
  // Products already shown in an earlier section go to the back so each section looks distinct
  const themedProducts = React.useMemo(() => {
    const out = {};
    const shown = new Set();
    for (const theme of THEMES) {
      const matches = storeProducts.filter(p => productMatchesTheme(p, theme));
      const key = (p) => String(p._id || p.id);
      out[theme.id] = [...matches.filter(p => !shown.has(key(p))), ...matches.filter(p => shown.has(key(p)))];
      out[theme.id].slice(0, 8).forEach(p => shown.add(key(p)));
    }
    return out;
  }, [storeProducts]);

  const [activeHomeTab, setActiveHomeTab] = useState('new_arrivals');

  const tabNewArrivals = React.useMemo(() => {
    return [...storeProducts].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.dateAdded || a._id || 0).getTime();
      const timeB = new Date(b.createdAt || b.dateAdded || b._id || 0).getTime();
      return timeB - timeA;
    }).slice(0, 8);
  }, [storeProducts]);

  const tabTrending = React.useMemo(() => {
    return [...storeProducts].sort((a, b) => {
      const countA = Number(a.soldCount || a.ordersCount || 0) + (a.featured ? 20 : 0) + (a.ratingInfo?.count || 0);
      const countB = Number(b.soldCount || b.ordersCount || 0) + (b.featured ? 20 : 0) + (b.ratingInfo?.count || 0);
      return countB - countA;
    }).slice(0, 8);
  }, [storeProducts]);

  const tabCombos = React.useMemo(() => {
    return storeProducts.filter(p => {
      if (!p) return false;
      const cat = typeof p.category === 'object' ? (p.category?.name || p.category?.slug || '') : String(p.category || '');
      const catStr = cat.toLowerCase().trim();
      const subcat = String(p.subcategory || '').toLowerCase().trim();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : String(p.tags || '').toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const badge = String(p.badge || '').toLowerCase();
      const collection = String(p.collection || '').toLowerCase();

      return (
        catStr.includes('combo') || catStr.includes('compos') || catStr.includes('bundle') || catStr.includes('pack') ||
        subcat.includes('combo') || subcat.includes('bundle') ||
        tags.includes('combo') || tags.includes('bundle') || tags.includes('pack') ||
        name.includes('combo') || name.includes('bundle') || name.includes('2 in 1') || name.includes('3 in 1') ||
        badge.includes('combo') || collection.includes('combo') ||
        p.isCombo === true || String(p.isCombo) === 'true'
      );
    }).slice(0, 8);
  }, [storeProducts]);

  const activeTabProducts = React.useMemo(() => {
    if (activeHomeTab === 'trending') return tabTrending;
    if (activeHomeTab === 'combos') return tabCombos;
    return tabNewArrivals;
  }, [activeHomeTab, tabNewArrivals, tabTrending, tabCombos]);

  const isLegacyDummyUrl = (url) => {
    if (!url || typeof url !== 'string') return true;
    const u = url.toLowerCase();
    return u.includes('/assets/b1') || 
           u.includes('/assets/b2') || 
           u.includes('/assets/b3') || 
           u.includes('/assets/slide') || 
           u.includes('unsplash.com');
  };

  const isGenuineBanner = (b) => {
    if (!b) return false;
    const hasDesktop = b.image && !isLegacyDummyUrl(b.image);
    const hasMobile = b.mobileImage && !isLegacyDummyUrl(b.mobileImage);
    return Boolean(hasDesktop || hasMobile);
  };

  const [allCategories, setAllCategories] = useState([]);
  const [banners, setBanners] = useState(() => {
    // Immediately load from sanitized localStorage cache so hero shows instantly
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('vaugun_banners');
        const saved = localStorage.getItem('daivika_banners');
        if (saved) {
          const parsed = JSON.parse(saved);
          const list = Array.isArray(parsed) ? parsed : (parsed?.data || []);
          const valid = list.filter(isGenuineBanner);
          if (valid.length > 0) return valid;
        }
      } catch (e) {}
    }
    return [];
  });

  const loadBanners = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vaugun_banners');
      }
      const response = await fetch(`${API_BASE_URL}/public/banners?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const result = await response.json();
      const loaded = Array.isArray(result) ? result : (result?.data || []);
      const valid = loaded.filter(isGenuineBanner);
      if (valid.length > 0) {
        setBanners(valid);
        try {
          localStorage.setItem('daivika_banners', JSON.stringify(valid));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Banners endpoint offline.');
    }
  };



  const [philosophySettings, setPhilosophySettings] = useState({
    tag: "OUR PRINCIPLES",
    titleLine1: "Uncompromising Label",
    titleLine2: "Transparency.",
    description: "We challenge the legacy fashion industry by designing pure, natural fashion pieces. Every garment is crafted under strict quality standards, and every collection remains uncompromised to deliver premium quality materials straight to your wardrobe.",
    buttonText: "Discover Our Purity Standard"
  });


  // Static site — no product or category DB fetches
  useEffect(() => {
    const init = async () => {
      try {
        await loadBanners();
      } finally {
        setDataLoading(false);
      }
    };
    init();

    const splashTimer = setTimeout(() => {
      setPageLoading(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('daivika_initial_loaded', 'true');
      }
    }, 300);

    return () => clearTimeout(splashTimer);
  }, []);



  const [isMobile, setIsMobile] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);


  const popularTrackRef = useRef(null);
  const latestTrackRef = useRef(null);
  const collectionsTrackRef = useRef(null);
  const sizesTrackRef = useRef(null);
  const handpickedTrackRef = useRef(null);
  const keepShoppingTrackRef = useRef(null);
  const showcaseTrackRef = useRef(null);

  // Generic reusable mouse drag scroll hook with click-prevention
  const useDragScroll = (ref) => {
    useEffect(() => {
      const el = ref.current;
      if (!el) return;

      let isDown = false;
      let startX;
      let scrollLeft;
      let hasDragged = false;

      const handleMouseDown = (e) => {
        if (e.button !== 0) return; // left click only
        isDown = true;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        hasDragged = false;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      };

      const handleMouseLeave = () => {
        isDown = false;
        el.style.cursor = 'grab';
      };

      const handleMouseUp = () => {
        isDown = false;
        el.style.cursor = 'grab';
        el.style.removeProperty('user-select');
      };

      const handleMouseMove = (e) => {
        if (!isDown) return;
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1.5;
        if (Math.abs(x - startX) > 5) {
          hasDragged = true;
        }
        el.scrollLeft = scrollLeft - walk;
      };

      const handleClickCapture = (e) => {
        if (hasDragged) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      const handleDragStart = (e) => {
        e.preventDefault();
      };

      el.style.cursor = 'grab';
      el.addEventListener('mousedown', handleMouseDown);
      el.addEventListener('mouseleave', handleMouseLeave);
      el.addEventListener('mouseup', handleMouseUp);
      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('click', handleClickCapture, true);
      el.addEventListener('dragstart', handleDragStart);

      return () => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.removeEventListener('mouseup', handleMouseUp);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('click', handleClickCapture, true);
        el.removeEventListener('dragstart', handleDragStart);
      };
    }, [ref]);
  };

  // Attach mouse drag scrolling for desktop wow factor
  useDragScroll(popularTrackRef);
  useDragScroll(latestTrackRef);
  useDragScroll(collectionsTrackRef);
  useDragScroll(sizesTrackRef);
  useDragScroll(handpickedTrackRef);
  useDragScroll(keepShoppingTrackRef);
  useDragScroll(showcaseTrackRef);

  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const getItemsPerView = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return 2;
      return 3;
    };

    setIsMobile(window.innerWidth < 1024);
    setItemsPerView(getItemsPerView());

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setItemsPerView(getItemsPerView());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const featuredProducts = storeProducts.filter(p => p.featured === true);

  const bulkOfferProducts = storeProducts.filter(p => {
    const hasRootOffer = Number(p.bulkMinQty) > 0 && Number(p.bulkPrice) > 0;
    const hasVariantOffer = p.variants && p.variants.some(v => Number(v.bulkMinQty) > 0 && Number(v.bulkPrice) > 0);
    return hasRootOffer || hasVariantOffer;
  });
  const featuredBulkProduct = bulkOfferProducts.length > 0 ? bulkOfferProducts[0] : null;
  let offerQty = featuredBulkProduct ? Number(featuredBulkProduct.bulkMinQty) : 0;
  let offerPrice = featuredBulkProduct ? Number(featuredBulkProduct.bulkPrice) : 0;
  if (featuredBulkProduct && (!offerQty || !offerPrice) && featuredBulkProduct.variants) {
    const firstVariantWithOffer = featuredBulkProduct.variants.find(v => Number(v.bulkMinQty) > 0 && Number(v.bulkPrice) > 0);
    if (firstVariantWithOffer) {
      offerQty = Number(firstVariantWithOffer.bulkMinQty);
      offerPrice = Number(firstVariantWithOffer.bulkPrice);
    }
  }

  // Bestsellers ranked by units sold; topped up with trending products while sales are few
  const bestsellerProducts = (() => {
    const byId = new Map(storeProducts.map(p => [String(p._id || p.id), p]));
    const ranked = bestsellerIds.map(id => byId.get(String(id))).filter(Boolean);
    if (ranked.length >= 4) return ranked;
    const seen = new Set(ranked.map(p => String(p._id || p.id)));
    return [...ranked, ...tabTrending.filter(p => !seen.has(String(p._id || p.id)))];
  })();

  const latestProducts = [...storeProducts]
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      const aId = a._id || a.id || '';
      const bId = b._id || b.id || '';
      return bId.localeCompare(aId);
    })
    .slice(0, 12);

  const getVisibleProducts = () => {
    if (featuredProducts.length === 0) return [];
    if (featuredProducts.length <= itemsPerView) {
      return featuredProducts;
    }
    const visible = [];
    for (let i = 0; i < itemsPerView; i++) {
      const targetIndex = (sliderIndex + i) % featuredProducts.length;
      visible.push(featuredProducts[targetIndex]);
    }
    return visible;
  };

  const [activeTrendingTab, setActiveTrendingTab] = useState('all');


  const [trendingPage, setTrendingPage] = useState(0);
  const productsPerPage = 8;

  const filteredProducts = allProducts.filter(p => {
    return activeTrendingTab === 'all' || productInCategory(p, activeTrendingTab);
  });
  
  const totalPages = Math.ceil(featuredProducts.length / productsPerPage);
  const currentProducts = filteredProducts.slice(trendingPage * productsPerPage, (trendingPage + 1) * productsPerPage);

  const nextPage = () => {
    setTrendingPage((prev) => (prev + 1) % totalPages);
  };
  const prevPage = () => {
    setTrendingPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const scrollPopularLeft = () => {
    if (popularTrackRef.current) {
      popularTrackRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollPopularRight = () => {
    if (popularTrackRef.current) {
      popularTrackRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const scrollHandpickedLeft = () => {
    if (handpickedTrackRef.current) {
      handpickedTrackRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollHandpickedRight = () => {
    if (handpickedTrackRef.current) {
      handpickedTrackRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const scrollKeepShoppingLeft = () => {
    if (keepShoppingTrackRef.current) {
      keepShoppingTrackRef.current.scrollBy({ left: -380, behavior: 'smooth' });
    }
  };

  const scrollKeepShoppingRight = () => {
    if (keepShoppingTrackRef.current) {
      keepShoppingTrackRef.current.scrollBy({ left: 380, behavior: 'smooth' });
    }
  };

  const scrollCollectionsLeft = () => {
    if (collectionsTrackRef.current) {
      collectionsTrackRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollCollectionsRight = () => {
    if (collectionsTrackRef.current) {
      collectionsTrackRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  const scrollSizesLeft = () => {
    if (sizesTrackRef.current) {
      sizesTrackRef.current.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  const scrollSizesRight = () => {
    if (sizesTrackRef.current) {
      sizesTrackRef.current.scrollBy({ left: 120, behavior: 'smooth' });
    }
  };

  const scrollLatestLeft = () => {
    if (latestTrackRef.current) {
      latestTrackRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollLatestRight = () => {
    if (latestTrackRef.current) {
      latestTrackRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Shake Builder states
  const [selectedIngredients, setSelectedIngredients] = useState(['60c72b2f9b1d8a0015f8b001', '60c72b2f9b1d8a0015f8b002']);
  const [comboAddedSuccess, setComboAddedSuccess] = useState(false);
  const [isBlending, setIsBlending] = useState(false);
  const [isBlended, setIsBlended] = useState(false);
  const [activePreset, setActivePreset] = useState('Mass Gainer');

  const handleAddShakeCombo = () => {
    selectedIngredients.forEach(id => {
      const prod = allProducts.find(p => p.id === id || p._id === id);
      if (prod) addToCart(prod);
    });
    setComboAddedSuccess(true);
    setTimeout(() => setComboAddedSuccess(false), 3000);
  };

  const handleBlendFuel = () => {
    if (selectedIngredients.length === 0) return;
    setIsBlending(true);
    setIsBlended(false);
    setTimeout(() => {
      setIsBlending(false);
      setIsBlended(true);
    }, 1600);
  };

  // Interactive Standards Node
  const [activeStandardNode, setActiveStandardNode] = useState(1);

  // Filter sizes list to only include sizes with at least one product
  const activeSizesList = sizesList.filter(s => {
    return allProducts.some(p => p.variants && p.variants.some(v => isSizeMatch(v.name, s.name)));
  });

  // Deal Spotlight: dynamic shuffled top-reviewed/discounted products (max 6, sorted descending)
  const dealSpotlightProducts = React.useMemo(() => {
    if (!storeProducts || storeProducts.length === 0) return [];
    
    // Calculate discounts, reviews, and a combined strength score for each product
    const scoredProducts = storeProducts.map(p => {
      const price = Number(p.price);
      const mrp = Number(p.mrp);
      let effectivePrice = price;
      let effectiveMrp = mrp;
      
      if (!(mrp > price && price > 0) && p.variants?.length > 0) {
        const v = p.variants.find(v => Number(v.mrp) > Number(v.price) && Number(v.price) > 0);
        if (v) {
          effectivePrice = Number(v.price);
          effectiveMrp = Number(v.mrp);
        }
      }
      
      const discountPct = effectiveMrp > effectivePrice ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100) : 0;
      const ratingInfo = p.ratingInfo || { rating: 0, count: 0 };
      const reviewCount = ratingInfo.count || 0;
      
      return {
        product: p,
        discountPct,
        reviewCount,
        strength: discountPct + (reviewCount * 2)
      };
    });

    // Keep products that have a discount or reviews
    const eligible = scoredProducts.filter(item => item.discountPct > 0 || item.reviewCount > 0);
    if (eligible.length === 0) return [];

    // Slice top 10 from each category
    const topReviews = [...eligible].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 10);
    const topDiscounts = [...eligible].sort((a, b) => b.discountPct - a.discountPct).slice(0, 10);

    // Merge uniquely
    const mergedPool = [];
    const seenIds = new Set();
    [...topReviews, ...topDiscounts].forEach(item => {
      const id = item.product._id || item.product.id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        mergedPool.push(item);
      }
    });

    // Shuffle the merged pool
    const shuffled = [...mergedPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Limit to 6 items and sort by strength descending so higher is on the left
    const selected = shuffled.slice(0, 6);
    selected.sort((a, b) => b.strength - a.strength);

    return selected.map(item => item.product);
  }, [storeProducts]);

  const dealSpotlightRef = React.useRef(null);
  const handleScrollSpotlight = (direction) => {
    if (dealSpotlightRef.current) {
      // Card width (290px) + gap (16px) = 306px per card step
      const scrollAmount = direction === 'left' ? -306 : 306;
      dealSpotlightRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };



  return (
    <>
      <PageLoader loading={pageLoading} />
      {!pageLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ backgroundColor: '#FAF8F5' }}
        >
      <style>{`
        .category-tabs-container {
          display: flex;
          gap: 0.85rem;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 0.75rem;
          width: 100%;
          justify-content: center;
          justify-content: safe center;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
          cursor: grab;
          user-select: none;
        }
        .category-tabs-container:active {
          cursor: grabbing;
        }
        @media (max-width: 1024px) {
          .category-tabs-container {
            justify-content: flex-start !important;
          }
        }

        .home-product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .home-product-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          }
        }
        @media (max-width: 768px) {
          .home-product-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.65rem;
          }
        }
        @media (max-width: 480px) {
          .home-product-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
        }

        /* Showcase mobile slider */
        .showcase-slider-track {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding: 0.75rem 0 130px 0;
          margin-bottom: -110px;
        }
        .showcase-slider-track::-webkit-scrollbar { display: none; }
        .showcase-slider-item {
          flex: 0 0 280px;
          scroll-snap-align: start;
        }
        @media (max-width: 768px) {
          .showcase-slider-item {
            flex: 0 0 220px;
          }
          .showcase-slider-track {
            gap: 1rem;
            padding: 1rem 0.25rem;
            margin-bottom: 0;
          }
        }
        
        .trending-slider-container {
          display: grid;
          grid-template-columns: 310px 1fr;
          gap: 2rem;
          align-items: stretch;
          margin-top: 2rem;
        }
        .trending-left-promo {
          position: relative;
          background-color: #e3ece9;
          border-radius: 28px;
          padding: 3rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(10, 10, 10, 0.08);
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(10, 10, 10, 0.03);
          min-height: 440px;
        }
        .trending-slider-viewport {
          width: 100%;
        }
        .trending-slider-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          width: 100%;
        }
        @media (max-width: 1024px) {
          .trending-slider-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
        }
        @media (max-width: 1024px) {
          .trending-slider-container {
            grid-template-columns: 1fr;
          }
          .trending-left-promo {
            min-height: 220px;
            flex-direction: row;
            align-items: center;
            padding: 2rem 2.5rem;
          }
        }
        @media (max-width: 600px) {
          .trending-left-promo {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
            padding: 2.5rem 2rem;
          }
        }
        .daivika-marquee-banner {
          background: #000000;
          color: #ffffff;
          overflow: hidden;
          white-space: nowrap;
          display: flex;
          align-items: center;
          height: 44px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-family: 'Poppins', sans-serif;
          user-select: none;
        }
        .daivika-marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 25s linear infinite;
        }
        .daivika-marquee-content {
          display: flex;
          align-items: center;
          gap: 3rem;
          padding-right: 3rem;
        }
        .daivika-marquee-content span {
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .daivika-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
        }
        .daivika-marquee-item svg {
          color: #ffffff;
          opacity: 0.9;
          flex-shrink: 0;
        }
        .daivika-marquee-content .marquee-dot {
          color: rgba(255, 255, 255, 0.4);
          font-size: 1rem;
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .popular-slider-container {
          position: relative;
          width: 100%;
          max-width: 1560px;
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 3rem);
          overflow: visible;
          box-sizing: border-box;
        }

        .popular-slider-track {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 0.75rem 0 130px 0;
          margin-bottom: -110px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        @media (max-width: 768px) {
          .popular-slider-container {
            padding: 0 1rem;
          }
        }

        .popular-slider-track::-webkit-scrollbar {
          display: none;
        }
        .popular-slider-item {
          flex: 0 0 280px;
          scroll-snap-align: start;
        }
        @media (max-width: 768px) {
          .popular-slider-item {
            flex: 0 0 220px;
          }
          .popular-slider-track {
            gap: 1rem;
            padding: 1rem 0.25rem;
            margin-bottom: 0;
          }
        }

        /* Premium Advertising Cards & Slider Hover Animations */
        .premium-card-container {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(10, 10, 10, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .premium-card-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .premium-card-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1;
        }
        .premium-card-container:hover .premium-card-bg {
          transform: scale(1.06);
        }
        .premium-card-overlay {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease;
          z-index: 2;
        }
        .premium-card-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          height: 100%;
          justify-content: center;
        }
        .premium-card-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 1rem;
          width: fit-content;
          position: relative;
          padding-bottom: 6px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 24px;
          height: 1.5px;
          background-color: rgba(255, 255, 255, 0.45);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-card-container:hover .premium-card-link {
          gap: 0.75rem;
        }
        .premium-card-container:hover .premium-card-link::after {
          width: 100%;
          background-color: #ffffff;
        }
        .premium-card-container:hover .premium-card-link svg {
          transform: translateX(4px);
        }
        .premium-slider-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-slider-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }
        /* Deal Spotlight Section */
        .deal-spotlight-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 0.75rem 2rem 1rem;
          padding-left: calc(max(2rem, (100vw - 1560px) / 2));
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        @media (min-width: 769px) {
          .deal-spotlight-scroll {
            padding-left: max(2rem, (100vw - 1560px) / 2) !important;
            padding-right: 2rem !important;
          }
        }
        @media (max-width: 768px) {
          .deal-spotlight-scroll {
            padding-left: max(1rem, (100vw - 1560px) / 2) !important;
            padding-right: max(1rem, (100vw - 1560px) / 2) !important;
          }
        }
        .deal-spotlight-scroll::-webkit-scrollbar { display: none; }
        .deal-spotlight-card {
          flex: 0 0 290px;
          height: 120px;
          display: flex;
          align-items: stretch;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid rgba(10, 10, 10, 0.05);
          box-shadow: 0 4px 12px rgba(10, 10, 10, 0.03);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .deal-spotlight-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(10, 10, 10, 0.08);
          border-color: rgba(10, 10, 10, 0.08);
        }
        .deal-spotlight-img-wrap {
          width: 120px;
          height: 120px;
          aspect-ratio: 1 / 1;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          background: #f5f3f0;
        }
        .deal-spotlight-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .deal-spotlight-card:hover .deal-spotlight-img-wrap img {
          transform: scale(1.05);
        }
        .deal-spotlight-info {
          padding: 0.6rem 0.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          flex: 1;
          min-width: 0;
        }
        .deal-spotlight-badge {
          display: inline-flex;
          align-items: center;
          background: #fef2f2;
          color: #ef4444;
          border-radius: 4px;
          padding: 0.15rem 0.45rem;
          font-size: 0.68rem;
          font-weight: 800;
          width: fit-content;
          letter-spacing: 0.5px;
        }
        .deal-spotlight-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0.15rem 0 0 0;
        }
        .deal-spotlight-stars {
          display: flex;
          align-items: center;
          gap: 0.15rem;
        }
        .deal-spotlight-price-row {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
          flex-wrap: wrap;
        }
        .deal-spotlight-shop-btn {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #0a0a0a;
          color: #ffffff;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .deal-spotlight-card:hover .deal-spotlight-shop-btn {
          background: #ef4444;
          transform: scale(1.03);
        }
        .slider-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(10, 10, 10, 0.12);
          background: #ffffff;
          color: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .slider-nav-btn:hover {
          background: #0a0a0a;
          color: #ffffff;
          border-color: #0a0a0a;
        }
        .slider-nav-btn:active {
          transform: scale(0.95);
        }
        @media (max-width: 768px) {
          .deal-spotlight-card {
            flex: 0 0 260px;
            height: 110px;
          }
          .deal-spotlight-img-wrap {
            width: 110px;
            height: 110px;
          }
          .deal-spotlight-name {
            font-size: 0.78rem;
          }
          .deal-spotlight-badge {
            font-size: 0.65rem;
            padding: 0.1rem 0.35rem;
          }
          .deal-spotlight-shop-btn {
            font-size: 0.62rem;
            padding: 0.3rem 0.6rem;
          }
        }

        .keep-shopping-track {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 1.5rem 2rem 2.5rem 2rem;
          margin-bottom: -1.5rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .keep-shopping-track::-webkit-scrollbar { display: none; }
        
        .keep-shopping-item {
          flex: 0 0 340px;
          scroll-snap-align: start;
        }
        @media (min-width: 769px) {
          .keep-shopping-track {
            padding-left: max(2rem, (100vw - 1560px) / 2) !important;
            padding-right: 2rem !important;
          }
        }
        @media (max-width: 768px) {
          .keep-shopping-item {
            flex: 0 0 290px;
          }
          .keep-shopping-track {
            gap: 1rem;
            padding-left: max(1rem, (100vw - 1560px) / 2) !important;
            padding-right: max(1rem, (100vw - 1560px) / 2) !important;
          }
        }

        .keep-shopping-card {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: stretch;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(10, 10, 10, 0.05);
          box-shadow: 0 4px 15px rgba(10, 10, 10, 0.02);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .keep-shopping-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px rgba(10, 10, 10, 0.08);
          border-color: rgba(10, 10, 10, 0.08);
        }
        .keep-shopping-img-wrap {
          width: 120px;
          height: 100%;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          background: #f5f3f0;
        }
        .keep-shopping-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .keep-shopping-card:hover .keep-shopping-img-wrap img {
          transform: scale(1.06);
        }
        .keep-shopping-info {
          padding: 0.8rem 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          flex: 1;
          min-width: 0;
        }
        .keep-shopping-category {
          font-size: 0.65rem;
          color: #8c8c8c;
          text-transform: uppercase;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-bottom: 0.15rem;
        }
        .keep-shopping-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0c0c0c;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
        }
        .keep-shopping-price-row {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          margin-top: auto;
        }
        .keep-shopping-price {
          font-size: 0.9rem;
          font-weight: 800;
          color: #0c0c0c;
        }
        .keep-shopping-mrp {
          font-size: 0.75rem;
          color: #8c8c8c;
          text-decoration: line-through;
        }
        .keep-shopping-discount {
          font-size: 0.7rem;
          font-weight: 700;
          color: #ef4444;
        }
        .keep-shopping-arrow {
          position: absolute;
          bottom: 0.8rem;
          right: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f5f3f0;
          color: #0a0a0a;
          transition: all 0.3s ease;
        }
        .keep-shopping-card:hover .keep-shopping-arrow {
          background: #0a0a0a;
          color: #ffffff;
          transform: translateX(2px);
        }

        .keep-shopping-skeleton {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: stretch;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(10, 10, 10, 0.05);
          overflow: hidden;
        }
        .keep-shopping-skeleton-img {
          width: 120px;
          height: 100%;
          background: #f3f4f6;
        }
        .keep-shopping-skeleton-info {
          padding: 0.8rem 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Collection Card Styles */
        .collection-card {
          position: relative;
          aspect-ratio: 3 / 4;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(10, 10, 10, 0.02);
          border: 1px solid rgba(10, 10, 10, 0.04);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display: block;
        }
        .collection-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .collection-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collection-card:hover .collection-card-img {
          transform: scale(1.08);
        }
        .collection-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0) 100%);
          transition: all 0.4s ease;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.5rem;
          box-sizing: border-box;
          z-index: 2;
        }
        .collection-card:hover .collection-card-overlay {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.35) 60%, rgba(0, 0, 0, 0) 100%);
        }
        .collection-card-title {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 0.15rem;
        }
        .collection-card-count {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.75rem;
          font-weight: 400;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .collection-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 0.65rem;
          opacity: 0;
          transform: translateY(8px);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collection-card:hover .collection-card-btn {
          opacity: 1;
          transform: translateY(0);
        }

        .collections-container {
          max-width: 1560px;
          margin: 0 auto;
          padding: 0 2rem;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .collections-container {
            padding: 0 1rem;
          }
        }
        .slider-arrow-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1.5px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .slider-arrow-btn-next,
        .slider-arrow-btn.active {
          background-color: #0a0a0a !important;
          color: #ffffff !important;
          border-color: #0a0a0a !important;
          box-shadow: 0 4px 12px rgba(10, 10, 10, 0.2);
        }
        .slider-arrow-btn:hover,
        .slider-arrow-btn-next:hover {
          background-color: #360910 !important;
          color: #ffffff !important;
          border-color: #360910 !important;
          transform: translateY(-2px) scale(1.08);
          box-shadow: 0 6px 18px rgba(54, 9, 16, 0.35);
        }
        .slider-arrow-btn:active,
        .slider-arrow-btn-next:active {
          transform: scale(0.92) !important;
          background-color: #360910 !important;
          color: #ffffff !important;
          border-color: #360910 !important;
        }
        .collections-slider-container {
          position: relative;
          width: 100vw;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          overflow: visible;
        }

        .collections-slider-track {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 1.5rem 2rem 2.5rem 2rem;
          margin-bottom: -1.5rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        @media (min-width: 769px) {
          .collections-slider-track {
            padding-left: max(2rem, (100vw - 1560px) / 2) !important;
            padding-right: 2rem !important;
          }
        }

        @media (max-width: 768px) {
          .collections-slider-track {
            padding-left: max(1rem, (100vw - 1560px) / 2) !important;
            padding-right: max(1rem, (100vw - 1560px) / 2) !important;
          }
        }
        .collections-slider-track::-webkit-scrollbar {
          display: none;
        }
        .collections-slider-item {
          flex: 0 0 224px;
          scroll-snap-align: start;
        }
        .collection-card-square {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(10, 10, 10, 0.02);
          border: 1px solid rgba(10, 10, 10, 0.04);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display: block;
        }
        .collection-card-square:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .collection-card-square-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collection-card-square:hover .collection-card-square-img {
          transform: scale(1.08);
        }
        .collection-card-square-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.25) 60%, rgba(0, 0, 0, 0.05) 100%);
          transition: all 0.4s ease;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.25rem;
          box-sizing: border-box;
          z-index: 2;
        }
        .collection-card-square:hover .collection-card-square-overlay {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0.1) 100%);
        }
        .collection-card-square-title {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 0.1rem;
        }
        .collection-card-square-count {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.7rem;
          font-weight: 400;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .collection-card-square-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.45rem;
          opacity: 0;
          transform: translateY(8px);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collection-card-square:hover .collection-card-square-btn {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .collections-container {
            padding: 0 1rem;
          }
          .collections-slider-item {
            flex: 0 0 120px;
          }
          .collections-slider-track {
            gap: 0.75rem;
            padding: 0.75rem 0.25rem;
            margin-bottom: 0;
          }
          .collection-card-square {
            border-radius: 12px;
          }
          .collection-card-square-overlay {
            padding: 0.65rem;
          }
          .collection-card-square-title {
            font-size: 0.8rem;
            margin-bottom: 0.05rem;
          }
          .collection-card-square-count {
            font-size: 0.58rem;
          }
        }

        .sizes-container {
          max-width: 1560px;
          margin: 0 auto;
          padding: 0 2rem;
        }
        .sizes-slider-container {
          position: relative;
          width: 100%;
        }
        .sizes-slider-track {
          display: flex;
          gap: 1.5rem;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 1.5rem 0.5rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sizes-slider-track::-webkit-scrollbar {
          display: none;
        }
        .sizes-slider-item {
          flex: 0 0 224px;
          scroll-snap-align: start;
        }
        .size-card-square {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(10, 10, 10, 0.02);
          border: 1px solid rgba(10, 10, 10, 0.08);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          text-decoration: none;
          box-sizing: border-box;
          padding: 1.5rem;
        }
        .size-card-square:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
          background-color: #0a0a0a;
          border-color: #0a0a0a;
        }
        .size-card-square-name {
          color: #0a0a0a;
          font-family: 'Poppins', sans-serif;
          font-size: 2.25rem;
          font-weight: 600;
          letter-spacing: 0.5px;
          transition: color 0.4s ease;
          text-align: center;
          word-break: break-word;
        }
        .size-card-square:hover .size-card-square-name {
          color: #ffffff;
        }
        .size-card-square-count {
          color: #7a7a7a;
          font-size: 0.75rem;
          font-weight: 400;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 0.5rem;
          transition: color 0.4s ease;
        }
        .size-card-square:hover .size-card-square-count {
          color: rgba(255, 255, 255, 0.75);
        }
        .size-card-square-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          color: #0a0a0a;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0.75rem;
          opacity: 0;
          transform: translateY(8px);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s ease;
        }
        .size-card-square:hover .size-card-square-btn {
          opacity: 1;
          transform: translateY(0);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .sizes-container {
            padding: 0 1rem;
          }
          .sizes-slider-item {
            flex: 0 0 120px;
          }
          .sizes-slider-track {
            gap: 0.75rem;
            padding: 0.75rem 0.25rem;
          }
          .size-card-square {
            border-radius: 12px;
            padding: 0.75rem;
          }
          .size-card-square-name {
            font-size: 1.5rem;
          }
          .size-card-square-count {
            font-size: 0.6rem;
            margin-top: 0.25rem;
          }
        }
        .size-tab-button {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .size-tab-button:hover {
          background-color: #0a0a0a !important;
          color: #ffffff !important;
          border-color: #0a0a0a !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
        }
        .size-tab-button:hover .size-tab-count {
          background-color: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
          border-color: transparent !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hero-skeleton {
          width: 100%;
          height: 80vh;
          height: 80dvh;
          margin-top: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0 6rem 6rem 6rem;
          box-sizing: border-box;
          background-color: #f3f3f3;
        }
        @media (max-width: 1024px) {
          .hero-skeleton {
            height: 75vh;
            height: 75dvh;
            margin-top: 0;
            padding: 0 4rem 5rem 4rem;
          }
        }
        @media (max-width: 768px) {
          .hero-skeleton {
            height: 65vh;
            height: 65dvh;
            padding: 0 2.5rem 4rem 2.5rem;
            align-items: center;
          }
        }
        @media (max-width: 480px) {
          .hero-skeleton {
            height: 55vh;
            height: 55dvh;
            padding: 0 1.25rem 3.2rem 1.25rem;
          }
        }
      `}</style>
      {/* 1. HERO BANNER */}
      <PremiumHero banners={banners} />

      {/* 1.5. TABBED PRODUCTS SHOWCASE (NEW ARRIVALS, TRENDING, COMBOS) */}
      {(dataLoading || storeProducts.length > 0) && (
      <section style={{ padding: isMobile ? '1.5rem 0.5rem 1rem 0.5rem' : '2.5rem 1.5rem 1.5rem 1.5rem', backgroundColor: '#ffffff', borderBottom: '1px solid rgba(10, 10, 10, 0.05)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1560px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Section Header & Tab Controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            marginBottom: '1.5rem'
          }}>
            <span style={{
              color: '#c5831a',
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2.2px',
              marginBottom: '0.3rem'
            }}>
              ✦ {HOME_INTRO.eyebrow}
            </span>
            <h2 style={{
              fontSize: isMobile ? '1.4rem' : '2rem',
              fontWeight: 800,
              color: '#0a0a0a',
              fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
              margin: 0,
              letterSpacing: '-0.3px',
              lineHeight: 1.2
            }}>
              {HOME_INTRO.title}
            </h2>
            <p style={{ margin: '0.5rem 0 0', maxWidth: '760px', color: '#5f5a55', fontSize: isMobile ? '0.85rem' : '0.95rem', lineHeight: 1.65 }}>
              {HOME_INTRO.description}
            </p>

            {/* Horizontal Tabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.75rem' : '2rem',
              marginTop: '1.25rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.2rem',
              width: '100%',
              justifyContent: 'flex-start',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingRight: isMobile ? '0.5rem' : 0
            }}>
              {[
                { id: 'new_arrivals', label: 'NEW ARRIVALS', count: tabNewArrivals.length },
                { id: 'trending', label: 'TRENDING', count: tabTrending.length },
                { id: 'combos', label: 'COMBOS', count: tabCombos.length }
              ].map((tab) => {
                const isActive = activeHomeTab === tab.id;
                const themeColor = '#360910';
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveHomeTab(tab.id)}
                    style={{
                      position: 'relative',
                      background: 'none',
                      border: 'none',
                      padding: '0.6rem 0.5rem 0.85rem 0.5rem',
                      fontSize: isMobile ? '0.85rem' : '1rem',
                      fontWeight: isActive ? 800 : 700,
                      color: isActive ? themeColor : '#64748b',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      letterSpacing: '1.2px',
                      transition: 'all 0.25s ease',
                      whiteSpace: 'nowrap',
                      outline: 'none'
                    }}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: 0,
                          right: 0,
                          height: '4px',
                          backgroundColor: themeColor,
                          borderRadius: '4px'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid / Mobile Slider */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHomeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {dataLoading ? (
                <div className="home-product-grid">
                  {[1, 2, 3, 4].map(i => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : activeTabProducts.length > 0 ? (
                <div className="home-product-grid">
                  {activeTabProducts.map((product) => (
                    <ProductCard key={product._id || product.id} product={product} />
                  ))}
                </div>
              ) : null}

            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      )}

      {/* DEAL SPOTLIGHT SECTION — hidden (static site) */}
      {false && (dataLoading || dealSpotlightProducts.length > 0) && (
        <section style={{ padding: isMobile ? '1rem 0' : '1.5rem 0', backgroundColor: '#FAF8F5' }}>
          <div className="container" style={{ maxWidth: '1560px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {!dataLoading && !isMobile && (
                <>
                  <button
                    onClick={() => handleScrollSpotlight('left')}
                    className="slider-nav-btn"
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(6, 36, 30, 0.1)', backgroundColor: '#ffffff', color: '#0a0a0a', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleScrollSpotlight('right')}
                    className="slider-nav-btn"
                    style={{ width: '36px', height: '36px', border: '1px solid rgba(6, 36, 30, 0.1)', backgroundColor: '#ffffff', color: '#0a0a0a', cursor: 'pointer', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Next slide"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Slider track bleeds full-width */}
          <div ref={dealSpotlightRef} className="deal-spotlight-scroll hide-scrollbar">
            {dataLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="deal-spotlight-card">
                  <div className="shimmer-bg" style={{ width: '120px', height: '120px', flexShrink: 0 }} />
                  <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div className="shimmer-bg" style={{ width: '50px', height: '16px', borderRadius: '4px' }} />
                        <div className="shimmer-bg" style={{ width: '30px', height: '12px', borderRadius: '4px' }} />
                      </div>
                      <div className="shimmer-bg" style={{ width: '90%', height: '14px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="shimmer-bg" style={{ width: '50px', height: '16px', borderRadius: '4px' }} />
                      <div className="shimmer-bg" style={{ width: '60px', height: '22px', borderRadius: '6px' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              dealSpotlightProducts.map((product) => {
                const productId = product._id || product.id;
                const price = Number(product.price);
                const mrp = Number(product.mrp);
                let effectivePrice = price;
                let effectiveMrp = mrp;
                if (!(mrp > price && price > 0) && product.variants?.length > 0) {
                  const v = product.variants.find(v => Number(v.mrp) > Number(v.price) && Number(v.price) > 0);
                  if (v) { effectivePrice = Number(v.price); effectiveMrp = Number(v.mrp); }
                }
                const discountPct = effectiveMrp > effectivePrice ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100) : 0;
                const ratingInfo = product.ratingInfo || { rating: 0, count: 0 };

                let imgSrc = product.image;
                if (imgSrc && typeof imgSrc === 'object') imgSrc = imgSrc.url || imgSrc.src || null;
                if (imgSrc && typeof imgSrc === 'string' && imgSrc.includes('localhost:') && imgSrc.includes('/uploads/')) {
                  imgSrc = imgSrc.slice(imgSrc.indexOf('/uploads/'));
                }
                if (!imgSrc || typeof imgSrc !== 'string') imgSrc = '/images/placeholder.svg';

                return (
                  <Link
                    key={productId}
                    to={`/product/${productId}`}
                    className="deal-spotlight-card"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="deal-spotlight-img-wrap">
                      <img
                        src={getOptimizedImageUrl(imgSrc, 300)}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                      />
                    </div>

                    <div className="deal-spotlight-info">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', marginBottom: '0.2rem' }}>
                          {discountPct > 0 ? (
                            <span className="deal-spotlight-badge">
                              {discountPct}% OFF
                            </span>
                          ) : <span />}

                          {ratingInfo.count > 0 ? (
                            <div className="deal-spotlight-stars">
                              <Star size={10} fill="#ffb800" color="#ffb800" />
                              <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 600 }}>
                                {ratingInfo.rating.toFixed(1)}
                              </span>
                            </div>
                          ) : <div />}
                        </div>

                        <p className="deal-spotlight-name">{product.name}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', marginTop: 'auto' }}>
                        <div className="deal-spotlight-price-row">
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                            ₹{effectivePrice.toLocaleString('en-IN')}
                          </span>
                          {effectiveMrp > effectivePrice && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 500 }}>
                              ₹{effectiveMrp.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        <span className="deal-spotlight-shop-btn">
                          Shop Now
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* 2.5. KEEP SHOPPING FOR SECTION (PERSONALIZED ACCORDING TO LAST VIEWED ITEMS) */}
      {/* KEEP SHOPPING — hidden (static site) */}
      {false && (dataLoading || keepShoppingProducts.length > 0) && (
        <section style={{ padding: isMobile ? '1rem 0' : '1.5rem 0', backgroundColor: '#FAF8F5' }}>
          <div className="container" style={{ maxWidth: '1560px', margin: '0 auto' }}>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem' 
            }}>
              {dataLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="shimmer-bg" style={{ width: '100px', height: '10px', borderRadius: '4px' }} />
                  <div className="shimmer-bg" style={{ width: '220px', height: '24px', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{
                    color: '#8c8c8c',
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>Continue Shopping</span>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#0a0a0a',
                    fontFamily: '"Poppins", sans-serif',
                    margin: 0
                  }}>Pick Up Where You Left Off</h2>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={scrollKeepShoppingLeft}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(6, 36, 30, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: '#0a0a0a',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a0a0a';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#0a0a0a';
                  }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={scrollKeepShoppingRight}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '1px solid rgba(6, 36, 30, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    color: '#0a0a0a',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a0a0a';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#0a0a0a';
                  }}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="popular-slider-container">
              <div ref={keepShoppingTrackRef} className="keep-shopping-track hide-scrollbar">
                {dataLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="keep-shopping-item">
                      <KeepShoppingSkeleton />
                    </div>
                  ))
                ) : (
                  keepShoppingProducts.slice(0, 4).map((product) => {
                    const productId = product.id || product._id;
                    const price = Number(product.price);
                    const mrp = Number(product.mrp);
                    let effectivePrice = price;
                    let effectiveMrp = mrp;
                    if (!(mrp > price && price > 0) && product.variants?.length > 0) {
                      const v = product.variants.find(v => Number(v.mrp) > Number(v.price) && Number(v.price) > 0);
                      if (v) {
                        effectivePrice = Number(v.price);
                        effectiveMrp = Number(v.mrp);
                      }
                    }
                    const discountPct = effectiveMrp > effectivePrice ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100) : 0;

                    let imgSrc = product.image;
                    if (imgSrc && typeof imgSrc === 'object') imgSrc = imgSrc.url || imgSrc.src || null;
                    if (imgSrc && typeof imgSrc === 'string' && imgSrc.includes('localhost:') && imgSrc.includes('/uploads/')) {
                      imgSrc = imgSrc.slice(imgSrc.indexOf('/uploads/'));
                    }
                    if (!imgSrc || typeof imgSrc !== 'string') imgSrc = '/images/placeholder.svg';

                    return (
                      <div key={productId} className="keep-shopping-item">
                        <Link
                          to={`/product/${productId}`}
                          className="keep-shopping-card"
                          style={{ textDecoration: 'none' }}
                        >
                          <div className="keep-shopping-img-wrap">
                            <img
                              src={getOptimizedImageUrl(imgSrc, 300)}
                              alt={product.name}
                              loading="lazy"
                              onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                            />
                          </div>
                          <div className="keep-shopping-info">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span className="keep-shopping-category">{product.category || 'general'}</span>
                              <h3 className="keep-shopping-name">{product.name}</h3>
                            </div>
                            <div className="keep-shopping-price-row">
                              <span className="keep-shopping-price">₹{effectivePrice.toLocaleString('en-IN')}</span>
                              {effectiveMrp > effectivePrice && (
                                <>
                                  <span className="keep-shopping-mrp">₹{effectiveMrp.toLocaleString('en-IN')}</span>
                                  <span className="keep-shopping-discount">{discountPct}% OFF</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="keep-shopping-arrow">
                            <ChevronRight size={14} />
                          </div>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
        </section>
      )}

      {/* CONTENT SECTIONS: rituals, bestsellers, stories, karungali, rudraksha, crystals, adornments */}
      {(() => {
        const cardProps = {
          loading: dataLoading,
          isMobile,
          renderCard: (p) => <ProductCard product={p} />,
          renderSkeleton: () => <ProductCardSkeleton />,
        };
        const themed = (theme, background) => (
          <ThemedProductSection
            key={theme.id}
            {...cardProps}
            background={background}
            eyebrow={theme.eyebrow}
            title={theme.title}
            description={theme.description}
            products={themedProducts[theme.id]}
            viewAllHref={`/products?theme=${theme.id}`}
          />
        );
        const [rituals, ...rest] = THEMES;
        return (
          <>
            {themed(rituals, '#FAF8F5')}
            <ThemedProductSection
              {...cardProps}
              background="#ffffff"
              eyebrow={BESTSELLERS.eyebrow}
              title={BESTSELLERS.title}
              description={BESTSELLERS.description}
              products={bestsellerProducts}
              viewAllHref="/products"
            />
            <StoriesGallery {...STORIES} stories={sacredStories} isMobile={isMobile} />
            {rest.map((theme, i) => themed(theme, i % 2 ? '#ffffff' : '#FAF8F5'))}
          </>
        );
      })()}

      {/* 3. SHOP BY COLLECTION SECTION */}
      {(dataLoading || collectionsList.length > 0) && (
        <section style={{ padding: isMobile ? '1.5rem 0 1rem 0' : '2.25rem 0 1.25rem 0', backgroundColor: '#FAF8F5' }}>
          <div className="collections-container">
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem' 
            }}>
              {dataLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="shimmer-bg" style={{ width: '100px', height: '10px', borderRadius: '4px' }} />
                  <div className="shimmer-bg" style={{ width: '220px', height: '24px', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                  <span style={{
                    color: '#8c8c8c',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>Our Collections</span>
                  <h2 style={{
                    fontSize: isMobile ? '1.4rem' : '2rem',
                    fontWeight: 800,
                    letterSpacing: '-0.3px',
                    color: '#0a0a0a',
                    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
                    margin: 0
                  }}>Shop by Collection</h2>
                </div>
              )}
              
              {!dataLoading && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={scrollCollectionsLeft}
                    className="slider-arrow-btn"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={scrollCollectionsRight}
                    className="slider-arrow-btn slider-arrow-btn-next"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="collections-slider-container">
              <div ref={collectionsTrackRef} className="collections-slider-track hide-scrollbar">
                {dataLoading ? (
                  [1, 2, 3, 4].map((i) => (
                    <div key={i} className="collections-slider-item">
                      <div className="shimmer-bg" style={{
                        width: '224px',
                        height: '224px',
                        borderRadius: '20px'
                      }} />
                    </div>
                  ))
                ) : (
                  collectionsList.map((col) => {
                    const count = allProducts.filter(p => p.gender && p.gender.toLowerCase() === col.name.toLowerCase()).length;
                    return (
                      <div key={col._id} className="collections-slider-item">
                        <Link
                          to={`/products?collection=${encodeURIComponent(col.name.toLowerCase())}`}
                          className="collection-card-square"
                          style={{ textDecoration: 'none' }}
                        >
                          <img 
                            src={getOptimizedImageUrl(col.image || getCollectionImage(col.name), 600)} 
                            alt={col.name} 
                            className="collection-card-square-img" 
                            loading="lazy"
                          />
                          <div className="collection-card-square-overlay">
                            <span className="collection-card-square-title">{col.name}</span>
                            <span className="collection-card-square-count">{count} {count === 1 ? 'item' : 'items'}</span>
                            <span className="collection-card-square-btn">
                              Explore <ArrowRight size={12} style={{ marginLeft: '2px' }} />
                            </span>
                          </div>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
        </section>
      )}

      {/* 3.2. SHOP BY SIZE SECTION — hidden (static site) */}
      {false && (dataLoading || sizesList.length > 0) && (
        <section style={{ padding: isMobile ? '1rem 0' : '1.5rem 0', backgroundColor: '#FAF8F5' }}>
          <div className="container" style={{ maxWidth: '1560px', margin: '0 auto' }}>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem' 
            }}>
              {dataLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="shimmer-bg" style={{ width: '100px', height: '10px', borderRadius: '4px' }} />
                  <div className="shimmer-bg" style={{ width: '220px', height: '24px', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{
                    color: '#8c8c8c',
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>Find Your Fit</span>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#0a0a0a',
                    fontFamily: '"Poppins", sans-serif',
                    margin: 0
                  }}>Shop by Size</h2>
                </div>
              )}
              
              {!dataLoading && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={scrollSizesLeft}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid rgba(6, 36, 30, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      color: '#0a0a0a',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0a0a0a';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = '#0a0a0a';
                    }}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={scrollSizesRight}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px solid rgba(6, 36, 30, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      color: '#0a0a0a',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0a0a0a';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = '#0a0a0a';
                    }}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="sizes-slider-container" style={{ position: 'relative', width: '100%' }}>
              <div ref={sizesTrackRef} className="sizes-slider-track hide-scrollbar" style={{
                display: 'flex',
                gap: '1rem',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '1rem 0.5rem',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                {dataLoading ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="shimmer-bg" style={{
                      width: '100px',
                      height: '40px',
                      borderRadius: '50px',
                      flex: '0 0 auto'
                    }} />
                  ))
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: 'max-content' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {activeSizesList.filter((_, idx) => idx % 2 === 0).map((s) => {
                        const count = allProducts.filter(p => p.variants && p.variants.some(v => isSizeMatch(v.name, s.name))).length;
                        return (
                          <div key={s._id} style={{ flex: '0 0 auto' }}>
                            <Link
                              to={`/products?size=${encodeURIComponent(s.name)}`}
                              className="size-tab-button"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1.25rem',
                                borderRadius: '50px',
                                border: '1px solid rgba(10, 10, 10, 0.08)',
                                backgroundColor: '#ffffff',
                                color: '#0a0a0a',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(10, 10, 10, 0.02)'
                              }}
                            >
                              <span>{s.name}</span>
                              <span className="size-tab-count" style={{
                                fontSize: '0.7rem',
                                color: '#7a7a7a',
                                backgroundColor: '#faf8f5',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '20px',
                                border: '1px solid rgba(10, 10, 10, 0.04)',
                                fontWeight: 500,
                                transition: 'all 0.3s ease'
                              }}>{count}</span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {activeSizesList.filter((_, idx) => idx % 2 !== 0).map((s) => {
                        const count = allProducts.filter(p => p.variants && p.variants.some(v => isSizeMatch(v.name, s.name))).length;
                        return (
                          <div key={s._id} style={{ flex: '0 0 auto' }}>
                            <Link
                              to={`/products?size=${encodeURIComponent(s.name)}`}
                              className="size-tab-button"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1.25rem',
                                borderRadius: '50px',
                                border: '1px solid rgba(10, 10, 10, 0.08)',
                                backgroundColor: '#ffffff',
                                color: '#0a0a0a',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(10, 10, 10, 0.02)'
                              }}
                            >
                              <span>{s.name}</span>
                              <span className="size-tab-count" style={{
                                fontSize: '0.7rem',
                                color: '#7a7a7a',
                                backgroundColor: '#faf8f5',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '20px',
                                border: '1px solid rgba(10, 10, 10, 0.04)',
                                fontWeight: 500,
                                transition: 'all 0.3s ease'
                              }}>{count}</span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* LATEST COLLECTION SECTION */}
      {(dataLoading || latestProducts.length > 0) && (
        <section style={{ padding: isMobile ? '1.25rem 0.5rem' : '2.25rem 1.5rem', backgroundColor: '#FAF8F5', borderTop: '1px solid rgba(10, 10, 10, 0.03)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '1560px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.25rem' 
            }}>
              {dataLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="shimmer-bg" style={{ width: '100px', height: '10px', borderRadius: '4px' }} />
                  <div className="shimmer-bg" style={{ width: '220px', height: '24px', borderRadius: '6px' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                  <span style={{
                    color: '#8c8c8c',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                  }}>Freshly Added</span>
                  <h2 style={{
                    fontSize: isMobile ? '1.4rem' : '2rem',
                    fontWeight: 800,
                    letterSpacing: '-0.3px',
                    color: '#0a0a0a',
                    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
                    margin: 0
                  }}>Latest Collection</h2>
                </div>
              )}
            </div>

            <div className="home-product-grid">
              {dataLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <ProductCardSkeleton key={i} />
                ))
              ) : (
                latestProducts.slice(0, 8).map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))
              )}
            </div>
          </div>
        </section>
      )}


      <section style={{ paddingTop: isMobile ? '0.75rem' : '1.5rem', paddingBottom: isMobile ? '1.5rem' : '2rem', backgroundColor: '#FAF8F5' }}>
        <div className="container" style={{ maxWidth: '1560px', margin: '0 auto' }}>
          {dataLoading ? (
            <>
              {/* 5-Column Feature Cards Footer Row Skeleton */}
              <div 
                className="hide-scrollbar"
                style={{
                  display: isMobile ? 'flex' : 'grid',
                  gridTemplateColumns: isMobile ? 'none' : 'repeat(5, 1fr)',
                  gap: '1.25rem',
                  marginTop: '0rem',
                  overflowX: isMobile ? 'auto' : 'visible',
                  paddingBottom: isMobile ? '0.75rem' : '0',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i}
                    className="shimmer-bg"
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      height: '76px',
                      width: isMobile ? '230px' : 'auto',
                      flex: isMobile ? '0 0 auto' : '1',
                      opacity: 0.6,
                      boxSizing: 'border-box'
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>

              {/* 4-Column Feature Cards Footer Row */}
              <div 
                className="hide-scrollbar"
                style={{
                  display: isMobile ? 'flex' : 'grid',
                  gridTemplateColumns: isMobile ? 'none' : 'repeat(4, 1fr)',
                  gap: '1.25rem',
                  marginTop: '0rem',
                  overflowX: isMobile ? 'auto' : 'visible',
                  paddingBottom: isMobile ? '0.75rem' : '0',
                  width: '100%',
                  WebkitOverflowScrolling: 'touch',
                  boxSizing: 'border-box'
                }}
              >
                {(() => {
                  const featureIconMap = {
                    Flame: <Flame size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Truck: <Truck size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Sparkles: <Sparkles size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Sprout: <Sprout size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Star: <Star size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Zap: <Activity size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    ShieldCheck: <ShieldCheck size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Gift: <Gift size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Headphones: <Headphones size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Package: <ShoppingBag size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Tag: <Percent size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Heart: <Star size={20} color="#fcd34d" style={{ flexShrink: 0 }} />,
                    Award: <Sparkles size={20} color="#fcd34d" style={{ flexShrink: 0 }} />
                  };

                  return featureCards.map((card, idx) => {
                    return (
                      <div
                        key={idx}
                        className="premium-feature-card"
                        style={{
                          flexGrow: isMobile ? 0 : 1,
                          flexShrink: 0,
                          flexBasis: isMobile ? 'auto' : '0%',
                          width: isMobile ? '230px' : 'auto',
                        }}
                      >
                        {/* Auspicious corner star */}
                        <span style={{
                          position: 'absolute',
                          top: '6px',
                          right: '8px',
                          fontSize: '0.6rem',
                          color: 'rgba(197, 131, 26, 0.4)',
                          lineHeight: 1,
                          pointerEvents: 'none',
                          userSelect: 'none'
                        }}>✦</span>

                        <div className="feature-icon-box">
                          {card.image ? (
                            <img
                              src={card.image}
                              alt={card.title || 'Feature'}
                              style={{
                                width: '24px',
                                height: '24px',
                                objectFit: 'contain',
                                display: 'block'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fb = e.currentTarget.nextElementSibling;
                                if (fb) fb.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              display: card.image ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              height: '100%'
                            }}
                          >
                            {featureIconMap[card.icon] || featureIconMap['Sparkles']}
                          </div>
                        </div>
                        <div style={{ minWidth: 0, position: 'relative', zIndex: 2 }}>
                          <h4 style={{
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            color: '#2a0508',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: '"Poppins", sans-serif',
                            letterSpacing: '0.2px'
                          }}>
                            {card.title}
                          </h4>
                          <p style={{
                            fontSize: '0.72rem',
                            color: '#78350f',
                            margin: '0.2rem 0 0 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 500
                          }}>
                            {card.desc}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

            </>
          )}
        </div>
      </section>

      {/* FLOATING SUCCESS TOAST */}
      <AnimatePresence>
        {comboAddedSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '1rem 2rem',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: 700,
              fontSize: '0.88rem',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ backgroundColor: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 900 }}>
              ✓
            </div>
            <span>Shake Bundle Added to Bag!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
      )}
    </>
  );
};

export default Home;
