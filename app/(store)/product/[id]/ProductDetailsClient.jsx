'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from '@/hooks/useRouterShim';
import {
  ArrowLeft, ShoppingCart, Heart, ShieldCheck, Truck,
  RotateCcw, Star, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, MessageSquare,
  ThumbsUp, Share2, Info, Ruler, Link2, Gift, Sparkles, Clock
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_BASE_URL } from '@/config';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '@/components/ProductCard';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import { getOptimizedImageUrl, getSafeImageUrl } from '@/lib/image-optimizer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { trackMetaPixelEvent } from '@/lib/meta-pixel';

// Product content entered in admin as plain text: several lines become a bullet list, one line stays a paragraph
const PRODUCT_INFO_SECTIONS = [
  { key: 'benefits', title: 'Benefits & Key Features', icon: '✨', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: 'rgba(16, 185, 129, 0.3)', accent: '#065f46', dot: '#10b981' },
  { key: 'astrologySignificance', title: 'Astrology & Spiritual Significance', icon: '🪐', bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: 'rgba(124, 58, 237, 0.28)', accent: '#5b21b6', dot: '#8b5cf6' },
  { key: 'howToWear', title: 'How to Wear', icon: '📿', bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', border: 'rgba(249, 115, 22, 0.3)', accent: '#9a3412', dot: '#f97316' },
];

// "Label: text" lines (e.g. "Inner Peace: Symbolises calmness") show the label in bold
const renderInfoLine = (line, accent) => {
  const m = line.match(/^([^:]{2,40}):\s+(.+)$/);
  return m ? <><strong style={{ color: accent, fontWeight: 700 }}>{m[1]}:</strong> {m[2]}</> : line;
};

const ProductInfoSection = ({ section, text }) => {
  const lines = text.split('\n').map(l => l.replace(/^\s*(?:[-•*●▪]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div style={{ marginTop: '1.25rem', padding: '1.1rem 1.25rem', background: section.bg, border: `1.5px solid ${section.border}`, borderRadius: '18px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: section.accent }}>
        <span aria-hidden="true" style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: 'rgba(255, 255, 255, 0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)', flexShrink: 0 }}>{section.icon}</span>
        {section.title}
      </h3>
      {lines.length === 1 ? (
        <p style={{ fontSize: '0.92rem', lineHeight: 1.7, color: '#334155', margin: 0 }}>{renderInfoLine(lines[0], section.accent)}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {lines.map((line, i) => (
            <li key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.92rem', lineHeight: 1.6, color: '#334155' }}>
              <span aria-hidden="true" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: section.dot, flexShrink: 0, marginTop: '0.55em' }} />
              <span>{renderInfoLine(line, section.accent)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const [currentId, setCurrentId] = useState(id);
  const isSwitchingRef = React.useRef(false);
  const thumbnailContainerRef = React.useRef(null);
  const groupSliderRef = React.useRef(null);
  const hasInitializedVariant = useRef(false);
  const touchStartXRef = useRef(null);
  const [showGroupArrows, setShowGroupArrows] = useState(false);
  const [showThumbArrows, setShowThumbArrows] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleGalleryTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleGalleryTouchEnd = (e) => {
    if (!touchStartXRef.current) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diffX) > 35) {
      if (diffX > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    touchStartXRef.current = null;
  };

  const scrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = 88; // card width + gap (76 + 12)
      thumbnailContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollGroupProducts = (direction) => {
    if (groupSliderRef.current) {
      const isMobile = window.innerWidth <= 600;
      const cardWidth = isMobile ? 110 : 100;
      const gap = 12; // 0.75rem
      const scrollAmount = cardWidth + gap;
      groupSliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    setCurrentId(id);
    hasInitializedVariant.current = false;
  }, [id]);

  const switchProduct = async (newId) => {
    isSwitchingRef.current = true;
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/product/${newId}`);
    }

    // Reset local interactive options
    setSelectedVariantIndex(0);
    setSelectedImageIndex(0);
    setSelectedColor(null);
    setSelectedTexture(null);
    setBrokenImages([]);
    setQuantity(1);
    hasInitializedVariant.current = false;

    setCurrentId(newId);
  };

  const navigate = useNavigate();
  const { addToCart, latestProductsMap, trackRecentlyViewed, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [dbProduct, setProduct] = useState(null);
  const cachedProduct = latestProductsMap?.[currentId];
  const product = useMemo(() => {
    return dbProduct
      ? { ...cachedProduct, ...dbProduct, productGroup: dbProduct.productGroup || cachedProduct?.productGroup }
      : cachedProduct;
  }, [dbProduct, cachedProduct]);

  // Product Page Free Promotional Gift Settings & Countdown
  const [freeGiftSettings, setFreeGiftSettings] = useState(() => {
    const defaults = {
      productPageOfferEnabled: true,
      productPageTimerMinutes: 10,
      productPageGiftProductId: 'prod_daivika_anti_fog_spray_001',
      productPageGiftProductName: 'DAIVIKA Anti-Fog Spray',
      productPageGiftProductImage: '/api/images/cmti78aoh0005r332hpz1762j',
      productPageGiftProductPrice: 399,
      productPageApplicableType: 'all',
      productPageApplicableProductIds: [],
      productPageOfferTitle: '⚡ Limited Time Offer: Free Gift Included!',
      productPageOfferSubtitle: 'Add this product to cart within the countdown timer to get a FREE DAIVIKA Anti-Fog Spray with your order!',
      productPageBadgeText: 'FREE GIFT WITH ITEM 🎁'
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Sync settings across tabs and fetch fresh from public API
  useEffect(() => {
    let isCancelled = false;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json?.free_gift_settings) {
            setFreeGiftSettings(prev => ({ ...prev, ...json.free_gift_settings }));
            localStorage.setItem('daivika_free_gift_settings', JSON.stringify(json.free_gift_settings));
          }
        }
      } catch (e) {
        // Fallback to local
      }
    };
    fetchSettings();

    const handleSettingsUpdated = () => {
      const saved = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
      if (saved) {
        try {
          setFreeGiftSettings(JSON.parse(saved));
        } catch (e) {}
      }
    };

    window.addEventListener('vaugun_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      isCancelled = true;
      window.removeEventListener('vaugun_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  // Determine if this current product is eligible for the free gift offer
  const isPdpGiftEligible = useMemo(() => {
    if (!freeGiftSettings || freeGiftSettings.productPageOfferEnabled === false) return false;
    if (!product && !currentId) return false;

    if (freeGiftSettings.productPageApplicableType === 'specific') {
      const currentPid = (product?._id || product?.id || currentId || '').toString();
      const list = freeGiftSettings.productPageApplicableProductIds || [];
      return list.includes(currentPid);
    }
    return true;
  }, [freeGiftSettings, product, currentId]);

  // Load the promotional free gift product data
  const giftProductId = freeGiftSettings?.productPageGiftProductId || freeGiftSettings?.giftProductId || 'prod_daivika_anti_fog_spray_001';
  const [pdpGiftProduct, setPdpGiftProduct] = useState(null);

  useEffect(() => {
    if (!giftProductId || freeGiftSettings?.productPageOfferEnabled === false) {
      setPdpGiftProduct(null);
      return;
    }

    if (latestProductsMap && latestProductsMap[giftProductId]) {
      setPdpGiftProduct(latestProductsMap[giftProductId]);
      return;
    }

    let isCancelled = false;
    fetch(`/api/products/${giftProductId}?t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        if (!isCancelled && json.success && json.data) {
          setPdpGiftProduct(json.data);
        } else if (!isCancelled) {
          setPdpGiftProduct({
            _id: giftProductId,
            id: giftProductId,
            name: freeGiftSettings?.productPageGiftProductName || 'DAIVIKA Anti-Fog Spray',
            image: freeGiftSettings?.productPageGiftProductImage || '/logo.png',
            price: freeGiftSettings?.productPageGiftProductPrice || 399
          });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPdpGiftProduct({
            _id: giftProductId,
            id: giftProductId,
            name: freeGiftSettings?.productPageGiftProductName || 'DAIVIKA Anti-Fog Spray',
            image: freeGiftSettings?.productPageGiftProductImage || '/logo.png',
            price: freeGiftSettings?.productPageGiftProductPrice || 399
          });
        }
      });

    return () => { isCancelled = true; };
  }, [giftProductId, freeGiftSettings?.productPageOfferEnabled, latestProductsMap]);

  // Countdown timer for this product session
  const [pdpGiftTimeLeft, setPdpGiftTimeLeft] = useState(0);
  const [isPdpGiftTimerActive, setIsPdpGiftTimerActive] = useState(false);
  const [isPdpGiftTimerExpired, setIsPdpGiftTimerExpired] = useState(false);

  useEffect(() => {
    if (!isPdpGiftEligible || !currentId) {
      setIsPdpGiftTimerActive(false);
      return;
    }

    const durationSeconds = Math.max(1, (Number(freeGiftSettings?.productPageTimerMinutes) || 10) * 60);
    const storageKey = `daivika_pdp_gift_expiry_${currentId}`;
    const storedExpiryStr = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
    let expiry = storedExpiryStr ? parseInt(storedExpiryStr, 10) : null;

    if (!expiry || isNaN(expiry)) {
      expiry = Date.now() + durationSeconds * 1000;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, expiry.toString());
      }
    }

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      if (diff <= 0) {
        setPdpGiftTimeLeft(0);
        setIsPdpGiftTimerActive(false);
        setIsPdpGiftTimerExpired(true);
      } else {
        setPdpGiftTimeLeft(diff);
        setIsPdpGiftTimerActive(true);
        setIsPdpGiftTimerExpired(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isPdpGiftEligible, currentId, freeGiftSettings?.productPageTimerMinutes]);

  const formatPdpDigits = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return {
      minutes: String(mins).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0')
    };
  };

  useEffect(() => {
    if (product && trackRecentlyViewed) {
      trackRecentlyViewed(product);
    }

    if (product) {
      try {
        const prodId = (product._id || product.id || currentId || '').toString();
        const price = Number(product.price) || 0;
        trackMetaPixelEvent('ViewContent', {
          content_name: product.name || 'Product',
          content_category: product.category || 'General',
          content_ids: [prodId],
          content_type: 'product',
          value: price,
          currency: 'INR'
        });
      } catch (e) {
        // Non-blocking
      }
    }
  }, [product, trackRecentlyViewed, currentId]);

  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedTexture, setSelectedTexture] = useState(null);
  const [brokenImages, setBrokenImages] = useState([]);

  const getDetailsFallback = () => {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'%3E%3Crect width='800' height='800' fill='%23f8fafc'/%3E%3Crect x='280' y='220' width='240' height='200' rx='16' fill='%23cbd5e1'/%3E%3Crect x='220' y='460' width='360' height='24' rx='12' fill='%23cbd5e1'/%3E%3Crect x='300' y='510' width='200' height='20' rx='10' fill='%23e2e8f0'/%3E%3C/svg%3E`;
  };

  const resolveDetailsImage = (img) => {
    if (img && typeof img === 'object') {
      img = img.url || img.src || img.path || null;
    }
    if (!img || typeof img !== 'string') {
      return getDetailsFallback();
    }

    const safeUrl = getSafeImageUrl(img);
    if (!safeUrl) return getDetailsFallback();

    return getOptimizedImageUrl(safeUrl, 800);
  };

  const allImages = useMemo(() => {
    if (!product) return [];
    const colorImages = product.colors?.map(c => c?.image).filter(Boolean) || [];
    const textureImages = product.textures?.map(t => t?.image).filter(Boolean) || [];
    const variantImages = product.variants?.flatMap(v => Array.isArray(v.images) ? v.images : (v.image ? [v.image] : [])).filter(Boolean) || [];
    const rawImages = Array.isArray(product.images) ? product.images : [];
    
    const primaryImg = product.image || rawImages[0] || colorImages[0] || textureImages[0] || variantImages[0];

    const allImagesRaw = [
      primaryImg,
      ...rawImages,
      ...colorImages,
      ...textureImages,
      ...variantImages,
      ...(product.subImages || [])
    ].map(img => {
      if (img && typeof img === 'object') {
        return img.url || img.src || img.path || null;
      }
      return img;
    }).filter(Boolean);

    const uniqueImages = Array.from(new Set(allImagesRaw));
    if (uniqueImages.length === 0) {
      return primaryImg ? [primaryImg] : [getDetailsFallback()];
    }
    return uniqueImages.slice(0, 8);
  }, [product]);

  const handlePrevImage = () => {
    if (!allImages || allImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev <= 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!allImages || allImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev >= allImages.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    if (selectedImageIndex >= allImages.length && allImages.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [allImages.length, selectedImageIndex]);

  const hasVariants = product && product.variants && product.variants.length > 0;
  const activeVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  const getActiveStock = () => {
    if (!product) return 0;
    if (product.inventory && product.inventory.length > 0) {
      const sizeName = hasVariants ? (activeVariant ? activeVariant.name : '') : selectedWeight;
      const colorName = selectedTexture ? selectedTexture.name : (selectedColor ? selectedColor.name : '');
      const inv = product.inventory.find(i =>
        (i.variant || '').toLowerCase() === (sizeName || '').toLowerCase() &&
        (i.color || '').toLowerCase() === (colorName || '').toLowerCase()
      );
      return inv ? inv.stock : 50;
    }
    return 50;
  };

  const getAvailableColors = () => {
    if (!product || !product.colors) return [];
    if (hasVariants && activeVariant) {
      if (activeVariant.colors && activeVariant.colors.length > 0) {
        return product.colors.filter(c => activeVariant.colors.includes(c.name));
      }
    }
    return product.colors;
  };

  const getAvailableTextures = () => {
    if (!product || !product.textures) return [];
    if (hasVariants && activeVariant) {
      if (activeVariant.colors && activeVariant.colors.length > 0) {
        return product.textures.filter(t => activeVariant.colors.includes(t.name));
      }
    }
    return product.textures;
  };

  const getProductColorLabel = (prod) => {
    if (!prod) return '';
    if (prod.colors && prod.colors.length > 0) {
      return prod.colors[0].name;
    }
    if (prod.name.includes(' - ')) {
      return prod.name.split(' - ').pop();
    }
    if (prod.name.includes('-')) {
      return prod.name.split('-').pop();
    }
    return prod.name;
  };

  useEffect(() => {
    if (!hasInitializedVariant.current && product && product.variants && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sizeParam = params.get('size');
      if (sizeParam) {
        const idx = product.variants.findIndex(v => v.name.toLowerCase() === sizeParam.toLowerCase());
        if (idx !== -1) {
          setSelectedVariantIndex(idx);
          hasInitializedVariant.current = true;
        }
      } else {
        hasInitializedVariant.current = true;
      }
    }
  }, [product]);

  // Auto-select first in-stock variant+color+image when default is out of stock
  useEffect(() => {
    if (!product || !product.inventory || product.inventory.length === 0) return;
    // If user came via URL size param, respect that choice
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('size')) return;

    const variants = product.variants || [];
    const colors = product.colors || [];
    const inventory = product.inventory;

    // Check if default (variant[0], color[0]) is in stock
    const defaultVariantName = variants.length > 0 ? (variants[0]?.name || '') : '';
    const defaultVariantColors = variants.length > 0 && variants[0]?.colors?.length > 0
      ? colors.filter(c => variants[0].colors.includes(c.name))
      : colors;
    const defaultColorName = defaultVariantColors.length > 0 ? (defaultVariantColors[0]?.name || '') : '';

    const defaultInv = inventory.find(i =>
      (i.variant || '').toLowerCase() === defaultVariantName.toLowerCase() &&
      (i.color || '').toLowerCase() === defaultColorName.toLowerCase()
    );
    if (!defaultInv || defaultInv.stock > 0) return; // Default in stock or no constraint

    // Default is out of stock — find first in-stock combo
    const colorImages = colors.map(c => c.image).filter(Boolean);
    const textureImages = product.textures?.map(t => t.image).filter(Boolean) || [];
    const allImgsRaw = [product.image, ...colorImages, ...textureImages, ...(product.subImages || [])].filter(Boolean);

    if (variants.length > 0) {
      for (let vIdx = 0; vIdx < variants.length; vIdx++) {
        const variant = variants[vIdx];
        const variantColors = variant.colors?.length > 0
          ? colors.filter(c => variant.colors.includes(c.name))
          : colors;

        if (variantColors.length > 0) {
          for (const color of variantColors) {
            const inv = inventory.find(i =>
              (i.variant || '').toLowerCase() === variant.name.toLowerCase() &&
              (i.color || '').toLowerCase() === color.name.toLowerCase()
            );
            if (inv && inv.stock > 0) {
              setSelectedVariantIndex(vIdx);
              setSelectedColor(color);
              // Sync image gallery to show this color's image
              if (color.image) {
                const imgIdx = allImgsRaw.findIndex(img => img === color.image);
                if (imgIdx !== -1) setSelectedImageIndex(imgIdx);
              }
              return;
            }
          }
        } else {
          const inv = inventory.find(i =>
            (i.variant || '').toLowerCase() === variant.name.toLowerCase()
          );
          if (inv && inv.stock > 0) {
            setSelectedVariantIndex(vIdx);
            return;
          }
        }
      }
    } else if (colors.length > 0) {
      for (const color of colors) {
        const inv = inventory.find(i =>
          (i.color || '').toLowerCase() === color.name.toLowerCase()
        );
        if (inv && inv.stock > 0) {
          setSelectedColor(color);
          if (color.image) {
            const imgIdx = allImgsRaw.findIndex(img => img === color.image);
            if (imgIdx !== -1) setSelectedImageIndex(imgIdx);
          }
          return;
        }
      }
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (product) {
      const activeColors = getAvailableColors();
      if (activeColors.length > 0) {
        if (!selectedColor || !activeColors.some(c => c.name === selectedColor.name)) {
          setSelectedColor(activeColors[0]);
        }
      } else {
        setSelectedColor(null);
      }

      if (product.textures && product.textures.length > 0) {
        if (!selectedTexture || !product.textures.some(t => t.name === selectedTexture.name)) {
          if (activeColors.length === 0) {
            setSelectedTexture(product.textures[0]);
          } else {
            setSelectedTexture(null);
          }
        }
      } else {
        setSelectedTexture(null);
      }
    }
  }, [selectedVariantIndex, product]);

  // Sync selectedColor or selectedTexture with selectedImageIndex
  useEffect(() => {
    if (!product) return;

    // Re-construct allImages here to avoid temporal dead zone (TDZ)
    const colorImages = product.colors?.map(c => c.image).filter(Boolean) || [];
    const textureImages = product.textures?.map(t => t.image).filter(Boolean) || [];
    const allImagesRaw = [product.image, ...colorImages, ...textureImages, ...(product.subImages || [])].filter(Boolean);
    const allImages = Array.from(new Set(allImagesRaw)).filter(img => !brokenImages.includes(img)).slice(0, 5);

    const currentImageUrl = allImages[selectedImageIndex];
    if (!currentImageUrl) return;

    const matchingTexture = product.textures?.find(t => t.image === currentImageUrl);
    const matchingColor = product.colors?.find(c => c.image === currentImageUrl);

    if (matchingTexture) {
      if (!selectedTexture || selectedTexture.name !== matchingTexture.name) {
        setSelectedTexture(matchingTexture);
        setSelectedColor(null);
      }
    } else if (matchingColor) {
      if (!selectedColor || selectedColor.name !== matchingColor.name) {
        setSelectedColor(matchingColor);
        setSelectedTexture(null);
      }
    } else {
      if (!selectedColor && !selectedTexture) {
        if (product.colors && product.colors.length > 0) {
          const firstColor = product.colors.find(c => c.image) || product.colors[0];
          setSelectedColor(firstColor);
          setSelectedTexture(null);
        } else if (product.textures && product.textures.length > 0) {
          const firstTexture = product.textures.find(t => t.image) || product.textures[0];
          setSelectedTexture(firstTexture);
          setSelectedColor(null);
        }
      }
    }
  }, [selectedImageIndex, product, brokenImages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleStockUpdate = (e) => {
      let data = e.detail;
      if (e.type === 'storage' && e.key === 'daivika_last_stock_update') {
        try {
          data = JSON.parse(e.newValue);
        } catch (err) {
          console.error("Failed to parse storage update info:", err);
        }
      }
      if (data && data.productId === currentId) {
        setProduct(prev => {
          if (!prev) return prev;
          const newInv = (prev.inventory || []).map(inv => {
            if ((inv.variant || '').toLowerCase() === (data.variant || '').toLowerCase() &&
              (inv.color || '').toLowerCase() === (data.color || '').toLowerCase()) {
              return { ...inv, stock: data.stock };
            }
            return inv;
          });
          const exists = (prev.inventory || []).some(inv =>
            (inv.variant || '').toLowerCase() === (data.variant || '').toLowerCase() &&
            (inv.color || '').toLowerCase() === (data.color || '').toLowerCase()
          );
          if (!exists) {
            newInv.push({
              variant: data.variant || '',
              color: data.color || '',
              stock: data.stock
            });
          }
          return { ...prev, inventory: newInv };
        });
      }
    };

    window.addEventListener('daivika_stock_update', handleStockUpdate);
    window.addEventListener('storage', handleStockUpdate);
    return () => {
      window.removeEventListener('daivika_stock_update', handleStockUpdate);
      window.removeEventListener('storage', handleStockUpdate);
    };
  }, [currentId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && product?.productGroup?.products) {
      const handleResize = () => {
        const isMobileScreen = window.innerWidth <= 768;
        setShowGroupArrows(!isMobileScreen && product.productGroup.products.length > 4);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [product]);

  useEffect(() => {
    if (typeof window !== 'undefined' && product) {
      const handleResize = () => {
        const isMobileScreen = window.innerWidth <= 768;
        const colorImages = product.colors?.map(c => c.image).filter(Boolean) || [];
        const textureImages = product.textures?.map(t => t.image).filter(Boolean) || [];
        const allImagesRaw = [product.image, ...colorImages, ...textureImages, ...(product.subImages || [])].filter(Boolean);
        const imagesCount = Array.from(new Set(allImagesRaw)).filter(img => !brokenImages.includes(img)).length;
        setShowThumbArrows(!isMobileScreen && imagesCount > 4);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [product, brokenImages]);

  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(() => {
    if (typeof window !== 'undefined' && latestProductsMap?.[currentId]) {
      return false;
    }
    return true;
  });

  // Persistent Database Reviews
  const [reviews, setReviews] = useState([]);

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;

      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const fetchProductReviews = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews?productId=${currentId}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setReviews(result.data || []);
      } else if (Array.isArray(result)) {
        setReviews(result);
      }
    } catch (err) {
      console.warn("Failed to fetch product reviews from database.", err);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
    : 0;
  const averageRatingFormatted = averageRating > 0 ? averageRating.toFixed(1) : '0.0';

  const [reviewSortOption, setReviewSortOption] = useState('helpful');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    let list = [...reviews];
    if (reviewSortOption === 'recent') {
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    } else if (reviewSortOption === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (reviewSortOption === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    } else {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return list;
  }, [reviews, reviewSortOption]);

  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // High-performance dynamic product page metadata & JSON-LD Google Rich Listing Schema integration
  useDocumentSEO({
    title: product ? `${product.name} | DAIVIKA by Zodimithra - Authentic Spiritual Wearables` : 'Loading Sacred Product Details',
    description: product ? (product.shortDescription || product.description || `Shop 100% authentic, energised ${product.name} at DAIVIKA by Zodimithra. Consecrated by Vedic rituals.`) : 'Loading sacred product details at DAIVIKA.',
    schema: product ? {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "image": product.image,
      "description": product.description || `Authentic, consecrated ${product.name} curated by Daivika by Zodimithra. Sacred quality and Vedic energisation guaranteed.`,
      "brand": {
        "@type": "Brand",
        "name": "Daivika"
      },
      "offers": {
        "@type": "Offer",
        "url": typeof window !== 'undefined' ? window.location.href : 'https://daivika.in',
        "priceCurrency": "INR",
        "price": product.price,
        "priceValidUntil": "2027-12-31",
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Daivika"
        }
      },
      "aggregateRating": reviews.length > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": averageRatingFormatted,
        "reviewCount": String(reviews.length)
      } : undefined
    } : null
  });

  useEffect(() => {
    if (currentId) {
      fetchProductReviews();
    }
  }, [currentId]);

  useEffect(() => {
    if (!isSwitchingRef.current) {
      window.scrollTo(0, 0);
      const hasInitialProduct = !!(latestProductsMap?.[currentId] || dbProduct);
      if (!hasInitialProduct) {
        setDetailsLoading(true);
      }
    }

    const fetchProductDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${currentId}`);
        const result = await response.json();
        if (response.ok && result.success && result.data) {
          let img = result.data.image;
          if (img && typeof img === 'object') {
            img = img.url || img.src || img.path || null;
          }
          if (img && typeof img === 'string' && img.includes('localhost:') && img.includes('/uploads/')) {
            const idx = img.indexOf('/uploads/');
            img = img.slice(idx);
          }
          let subImages = result.data.subImages || [];
          if (Array.isArray(subImages)) {
            subImages = subImages.map(simg => {
              if (simg && typeof simg === 'object') {
                simg = simg.url || simg.src || simg.path || null;
              }
              if (simg && typeof simg === 'string' && simg.includes('localhost:') && simg.includes('/uploads/')) {
                const idx = simg.indexOf('/uploads/');
                simg = simg.slice(idx);
              }
              return simg;
            }).filter(Boolean);
          }
          const mapped = {
            ...result.data,
            id: result.data._id,
            image: img,
            subImages
          };
          setProduct(mapped);

          // Get dynamic related products from local cache if possible to save API call
          const cachedList = Object.values(latestProductsMap || {});
          if (cachedList.length > 0) {
            const shuffled = cachedList
              .map(p => ({ ...p, id: p._id || p.id }))
              .filter(p => p.id !== mapped.id)
              .sort(() => Math.random() - 0.5)
              .slice(0, 4);
            setRelatedProducts(shuffled);
          } else {
            try {
              const dbProductsRes = await fetch(`${API_BASE_URL}/products`);
              const dbProductsJson = await dbProductsRes.json();
              if (dbProductsRes.ok && dbProductsJson.success && dbProductsJson.data?.length > 0) {
                const mappedDbProducts = dbProductsJson.data.map(p => ({ ...p, id: p._id }));
                const shuffled = mappedDbProducts
                  .filter(p => p.id !== mapped.id)
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 4);
                setRelatedProducts(shuffled);
              } else {
                setRelatedProducts([]);
              }
            } catch (err) {
              setRelatedProducts([]);
            }
          }
        } else {
          throw new Error('Not found in DB');
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setProduct(null);
        setRelatedProducts([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    if (currentId) {
      fetchProductDetails();
    }
  }, [currentId]);

  useEffect(() => {
    if (relatedProducts.length === 0 && latestProductsMap && Object.keys(latestProductsMap).length > 0 && product) {
      const cachedList = Object.values(latestProductsMap);
      const shuffled = cachedList
        .map(p => ({ ...p, id: p._id || p.id }))
        .filter(p => p.id !== (product.id || product._id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      setRelatedProducts(shuffled);
    }
  }, [latestProductsMap, product, relatedProducts.length]);

  useEffect(() => {
    if (!detailsLoading && product) {
      if (isSwitchingRef.current) {
        const timer = setTimeout(() => {
          isSwitchingRef.current = false;
        }, 500);
        return () => clearTimeout(timer);
      }
      window.scrollTo(0, 0);
      const timer = setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentId, detailsLoading]);

  if (detailsLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '3px solid #f1f5f9', borderTopColor: '#0a0a0a',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ paddingTop: '10rem', paddingBottom: '10rem', textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Product not found</h2>
          <Link to="/products" className="btn btn-primary">Back to Collections</Link>
        </motion.div>
      </div>
    );
  }

  const currentPrice = activeVariant ? Number(activeVariant.price) : Number(product.price);
  const currentMRP = activeVariant ? Number(activeVariant.mrp) : Number(product.mrp);

  const bulkMinQty = activeVariant ? Number(activeVariant.bulkMinQty) : Number(product.bulkMinQty);
  const bulkPrice = activeVariant ? Number(activeVariant.bulkPrice) : Number(product.bulkPrice);

  const checkLiveStock = async () => {
    setIsCheckingStock(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${currentId}?t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          let img = result.data.image;
          if (img && typeof img === 'object') {
            img = img.url || img.src || img.path || null;
          }
          if (img && typeof img === 'string' && img.includes('localhost:') && img.includes('/uploads/')) {
            const idx = img.indexOf('/uploads/');
            img = img.slice(idx);
          }
          let subImages = result.data.subImages || [];
          if (Array.isArray(subImages)) {
            subImages = subImages.map(simg => {
              if (simg && typeof simg === 'object') {
                simg = simg.url || simg.src || simg.path || null;
              }
              if (simg && typeof simg === 'string' && simg.includes('localhost:') && simg.includes('/uploads/')) {
                const idx = simg.indexOf('/uploads/');
                simg = simg.slice(idx);
              }
              return simg;
            }).filter(Boolean);
          }
          const mapped = {
            ...result.data,
            id: result.data._id,
            image: img,
            subImages
          };
          setProduct(mapped);

          const sizeName = hasVariants ? (activeVariant ? activeVariant.name : '') : selectedWeight;
          const colorName = selectedTexture ? selectedTexture.name : (selectedColor ? selectedColor.name : '');
          const inv = mapped.inventory?.find(i =>
            (i.variant || '').toLowerCase() === (sizeName || '').toLowerCase() &&
            (i.color || '').toLowerCase() === (colorName || '').toLowerCase()
          );
          const latestStock = inv ? inv.stock : 50;

          if (latestStock <= 0) {
            window.dispatchEvent(new CustomEvent('show_toast', {
              detail: {
                message: `Sorry, the selected option (${sizeName}${colorName ? ' / ' + colorName : ''}) is out of stock!`,
                type: 'error'
              }
            }));
            setIsCheckingStock(false);
            return false;
          }
          if (latestStock < quantity) {
            window.dispatchEvent(new CustomEvent('show_toast', {
              detail: {
                message: `Only ${latestStock} item(s) left in stock.`,
                type: 'error'
              }
            }));
            setIsCheckingStock(false);
            return false;
          }
          setIsCheckingStock(false);
          return true;
        }
      }
    } catch (e) {
      console.error("Live stock check failed:", e);
    }
    // Fallback if API is offline
    setIsCheckingStock(false);
    const fallbackStock = getActiveStock();
    if (fallbackStock <= 0) {
      window.dispatchEvent(new CustomEvent('show_toast', {
        detail: {
          message: "Sorry, this item is currently out of stock!",
          type: 'error'
        }
      }));
      return false;
    }
    if (fallbackStock < quantity) {
      window.dispatchEvent(new CustomEvent('show_toast', {
        detail: {
          message: `Only ${fallbackStock} item(s) left in stock.`,
          type: 'error'
        }
      }));
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (isCheckingStock) return;
    const hasStock = await checkLiveStock();
    if (!hasStock) return;

    const giftToAdd = (isPdpGiftEligible && isPdpGiftTimerActive && pdpGiftProduct) ? pdpGiftProduct : null;
    addToCart(product, quantity, activeVariant, selectedColor, selectedTexture, giftToAdd);

    if (giftToAdd) {
      window.dispatchEvent(new CustomEvent('show_toast', {
        detail: {
          message: `🎁 FREE GIFT UNLOCKED: ${giftToAdd.name} added to your cart for FREE!`,
          type: 'success'
        }
      }));
    }
    if (setIsCartOpen) {
      setIsCartOpen(true);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (userRating === 0 || !reviewText.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: currentId,
          user: user?.name || "Guest User",
          email: user?.email || "guest@daivika.com",
          productName: product?.name || "Daivika Product",
          rating: Number(userRating),
          comment: reviewText
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProductReviews();
        showAlert('Review submitted successfully!', 'Review Added');
      } else {
        const newReview = data.data || data;
        setReviews(prev => [newReview, ...prev]);
        showAlert('Review submitted!', 'Review Added');
      }
    } catch (err) {
      console.error(err);
      const newReview = {
        _id: 'rev_' + Date.now(),
        productId: currentId,
        user: user?.name || "Guest User",
        productName: product?.name || "Daivika Product",
        rating: Number(userRating),
        comment: reviewText,
        likes: 0,
        replies: [],
        createdAt: new Date().toISOString()
      };
      setReviews(prev => [newReview, ...prev]);
      showAlert('Review added locally.', 'Review Added');
    }

    setUserRating(0);
    setReviewText('');
    setShowReviewForm(false);
  };

  const handleLikeReview = async (reviewId) => {
    let isUnlike = false;
    setReviews(prev => prev.map(rev => {
      const currentId = rev._id || rev.id;
      if (currentId === reviewId) {
        if (rev.userLiked) {
          isUnlike = true;
          return { ...rev, likes: Math.max(0, rev.likes - 1), userLiked: false };
        } else {
          return { ...rev, likes: rev.likes + 1, userLiked: true };
        }
      }
      return rev;
    }));

    try {
      await fetch(`${API_BASE_URL}/reviews/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action: isUnlike ? 'unlike' : 'like'
        })
      });
    } catch (err) {
      console.error("Failed to sync like with server", err);
    }
  };

  const handleAddReply = async (e, reviewId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newReplyText = replyText;
    setReplyText('');
    setActiveReplyId(null);

    const tempReply = {
      user: user?.name || "Guest User",
      isAdmin: user?.role === 'admin',
      createdAt: new Date().toISOString(),
      text: newReplyText
    };

    setReviews(prev => prev.map(rev => {
      const currentId = rev._id || rev.id;
      if (currentId === reviewId) {
        return { ...rev, replies: [...(rev.replies || []), tempReply] };
      }
      return rev;
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          user: user?.name || "Guest User",
          text: newReplyText,
          isAdmin: user?.role === 'admin'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setReviews(prev => prev.map(rev => {
            const currentId = rev._id || rev.id;
            return currentId === reviewId ? data.data : rev;
          }));
        }
      }
    } catch (err) {
      console.error("Failed to submit reply to database", err);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.name} | Daivika Store`,
        text: product.description || `Buy ${product.name} at Daivika store.`,
        url: window.location.href,
      })
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      showAlert('Product page link copied to clipboard!', 'Share Product');
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: '"Poppins", sans-serif', paddingBottom: '3rem', marginTop: 0, paddingTop: 0 }}>
      <style>{`
        body .main-content,
        body .main-content.product-page,
        main {
          background-color: #ffffff !important;
          padding-top: 1.75rem !important;
          margin-top: 0 !important;
          padding-bottom: 0 !important;
        }
        @media (max-width: 768px) {
          body .main-content,
          body .main-content.product-page,
          main {
            background-color: #ffffff !important;
            padding-top: 1.25rem !important;
            margin-top: 0 !important;
            padding-bottom: 0 !important;
          }
        }
        .pd-share-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          background-color: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 50px;
          padding: 0.4rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          box-sizing: border-box;
          line-height: 1.2;
        }
        .pd-share-btn:hover {
          background-color: #f8fafc;
          border-color: #0a0a0a;
          color: #0a0a0a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .pd-tabs-container {
          display: flex;
          gap: 0.5rem;
          background-color: #f1f5f9;
          padding: 0.4rem;
          border-radius: 16px;
          border: 1px solid #cbd5e1;
          margin-bottom: 1.75rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }
        .pd-tabs-container::-webkit-scrollbar {
          display: none;
        }
        @keyframes marquee-right-left {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .pd-tab-btn {
          flex: 1;
          min-width: max-content;
          padding: 0.75rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: #475569;
          background-color: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          outline: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .pd-tab-btn:hover {
          color: #0f172a;
          background-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .pd-tab-btn.active {
          color: #ffffff !important;
          background-color: var(--color-primary, #0f172a) !important;
          font-weight: 800;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.22);
        }
        .pd-tab-btn.active .tab-badge {
          background-color: rgba(255, 255, 255, 0.25) !important;
          color: #ffffff !important;
        }
        @media (max-width: 600px) {
          .pd-share-btn span { display: inline-block; }
          .pd-share-btn { padding: 0.35rem 0.75rem; font-size: 0.72rem; }
          .pd-tab-btn { padding: 0.55rem 0.75rem !important; font-size: 0.78rem !important; gap: 0.35rem !important; flex-shrink: 0 !important; }
        }
      `}</style>

      {/* Breadcrumbs & Action Buttons Header */}
      <div className="container breadcrumbs-container" style={{ padding: isMobile ? '0.25rem 0.75rem 0.15rem 0.75rem' : '2rem 1rem 0.5rem 1rem', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Breadcrumbs items={[
          { name: 'Products', url: '/products' },
          ...(product.category ? [{ name: product.category, url: `/products?category=${encodeURIComponent(product.category)}` }] : []),
          ...(product.category && product.subcategory ? [{ name: product.subcategory, url: `/products?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subcategory)}` }] : []),
          { name: product.name, url: `/product/${currentId}` }
        ]} />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, zIndex: 5, position: 'relative' }}>
          <button
            className="pd-share-btn"
            onClick={() => {
              const copyText = (text) => {
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(text)
                    .then(() => showAlert('Product page link copied to clipboard!', 'Copy Product Link'))
                    .catch(() => fallbackCopy(text));
                } else {
                  fallbackCopy(text);
                }
              };
              const fallbackCopy = (text) => {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                  document.execCommand('copy');
                  showAlert('Product page link copied to clipboard!', 'Copy Product Link');
                } catch (err) {
                  showAlert('Could not copy link automatically. Please copy the URL from your browser address bar.', 'Copy Product Link');
                }
                document.body.removeChild(textArea);
              };
              copyText(window.location.href);
            }}
          >
            <Link2 size={13} />
            <span>Copy Link</span>
          </button>

          <button
            className="pd-share-btn"
            onClick={handleShare}
          >
            <Share2 size={13} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="container pd-main-container" style={{ padding: isMobile ? '0.1rem 0.75rem 0.1rem 0.75rem' : '0.5rem 1rem 1rem 1rem', boxSizing: 'border-box' }}>
        <div className="product-detail-grid">

          {/* LEFT: Product Gallery */}
          <motion.div
            className="product-gallery-column"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div
              className="product-gallery-container"
              style={{
                position: 'relative',
                touchAction: 'pan-y',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                width: '100%',
                aspectRatio: '1 / 1',
                minHeight: 'auto',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#FAF8F5'
              }}
              onTouchStart={handleGalleryTouchStart}
              onTouchEnd={handleGalleryTouchEnd}
            >
              {/* Product Badge Overlay (Top-Left) */}
              {(product.badge || (currentMRP > currentPrice)) && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: product.badgeBg || '#fef3c7',
                  color: product.badgeColor || '#92400e',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.28rem 0.7rem',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  border: product.badgeBg ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(251, 191, 36, 0.5)',
                  zIndex: 8,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  pointerEvents: 'none'
                }}>
                  {product.badge || `${Math.round(((currentMRP - currentPrice) / currentMRP) * 100)}% OFF`}
                </div>
              )}

              <AnimatePresence initial={false}>
                <motion.img
                  key={selectedImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  src={resolveDetailsImage(allImages[selectedImageIndex] || product.image)}
                  alt={product.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getDetailsFallback();
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                    borderRadius: '8px'
                  }}
                />
              </AnimatePresence>

              {/* Prev Arrow */}
              {allImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    left: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  aria-label="Previous Image"
                >
                  <ChevronLeft size={18} color="#ffffff" strokeWidth={2.5} />
                </button>
              )}

              {/* Next Arrow */}
              {allImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  aria-label="Next Image"
                >
                  <ChevronRight size={18} color="#ffffff" strokeWidth={2.5} />
                </button>
              )}

              {/* Sleek Pagination Dots */}
              {allImages.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: '0.6rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  zIndex: 6,
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  {allImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(idx);
                      }}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => e.stopPropagation()}
                      style={{
                        width: idx === selectedImageIndex ? '16px' : '5px',
                        height: '5px',
                        borderRadius: '100px',
                        backgroundColor: idx === selectedImageIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        outline: 'none'
                      }}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT: Compact Product Info */}
          <motion.div
            className="product-info-column"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          >
            <div>
              {/* Category & Stock Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {product.category}
                </span>
                {(() => {
                  const currentStock = getActiveStock();
                  const isOutOfStock = currentStock <= 0;
                  const isLimited = currentStock > 0 && currentStock < 100;
                  return (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: isOutOfStock ? '#991b1b' : (isLimited ? '#9a3412' : '#166534'),
                      backgroundColor: isOutOfStock ? '#fee2e2' : (isLimited ? '#ffedd5' : '#dcfce7'),
                      border: isLimited ? '1px solid #fed7aa' : (isOutOfStock ? '1px solid #fecaca' : 'none'),
                      padding: '0.2rem 0.65rem',
                      borderRadius: '50px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isLimited && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#ea580c',
                          display: 'inline-block'
                        }} />
                      )}
                      {isOutOfStock ? 'Out of Stock' : (isLimited ? 'Limited Stock' : 'In Stock')}
                    </span>
                  );
                })()}
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: 'clamp(1.5rem, 3.2vw, 2.1rem)',
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#1e293b',
                margin: '0 0 0.5rem 0',
                letterSpacing: '-0.4px'
              }}>{product.name}</h1>

              {product.shortDescription && (
                <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', margin: '0 0 0.75rem 0', whiteSpace: 'pre-line' }}>
                  {product.shortDescription}
                </p>
              )}

              {/* Colorful Product Highlights (Pastel Pills / Auto-scrolling on Mobile) */}
              {(() => {
                const HIGHLIGHT_PALETTES = [
                  { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' }, // Soft Peach / Rose
                  { bg: '#FCE7F3', text: '#831843', border: '#FBCFE8' }, // Soft Lavender / Pink
                  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }, // Soft Gold / Warm Yellow
                  { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }, // Mint Green
                  { bg: '#E0F2FE', text: '#075985', border: '#BAE6FD' }, // Soft Sky Blue
                  { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' }, // Soft Purple
                ];

                const getEmoji = (txt, i) => {
                  if (!txt) return '✨';
                  const hasEmoji = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(txt);
                  if (hasEmoji) return '';
                  const l = txt.toLowerCase();
                  if (l.includes('fat') || l.includes('burn') || l.includes('hot')) return '🔥';
                  if (l.includes('weight') || l.includes('loss') || l.includes('scale')) return '⚖️';
                  if (l.includes('waist') || l.includes('hip') || l.includes('trim')) return '👖';
                  if (l.includes('cotton') || l.includes('fabric') || l.includes('soft') || l.includes('breathable')) return '🌿';
                  if (l.includes('comfort') || l.includes('cozy') || l.includes('easy') || l.includes('light')) return '☁️';
                  if (l.includes('quality') || l.includes('premium') || l.includes('luxury')) return '✨';
                  if (l.includes('delivery') || l.includes('ship') || l.includes('fast')) return '🚚';
                  if (l.includes('return') || l.includes('exchange')) return '🔄';
                  const defaults = ['🔥', '⚖️', '👖', '✨', '🌿', '💎', '☁️', '🌸'];
                  return defaults[i % defaults.length];
                };

                let items = [];
                let rawHighlights = product?.highlights;
                if (typeof rawHighlights === 'string') {
                  try {
                    rawHighlights = JSON.parse(rawHighlights);
                  } catch (e) {
                    rawHighlights = [{ title: rawHighlights, description: '' }];
                  }
                }
                if (Array.isArray(rawHighlights) && rawHighlights.length > 0) {
                  items = rawHighlights.map((h) => {
                    if (typeof h === 'string' && h.trim()) {
                      return {
                        title: h.trim(),
                        description: '',
                        bg: '',
                        color: ''
                      };
                    }
                    if (h && typeof h === 'object') {
                      const title = (h.title || h.name || h.key || '').trim();
                      const description = (h.description || h.detail || h.value || '').trim();
                      if (title || description) {
                        return { title, description, bg: h.bg || '', color: h.color || '' };
                      }
                    }
                    return null;
                  }).filter(Boolean);
                }

                if (items.length === 0) {
                  return null;
                }

                const row1 = items.filter((_, idx) => idx % 2 === 0);
                const row2 = items.filter((_, idx) => idx % 2 !== 0);

                const row1Palette = { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' }; // Soft Rose / Peach for Row 1
                const row2Palette = { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }; // Soft Mint Green for Row 2

                const renderMovingTrack = (trackItems, palette, speed = 25) => {
                  const displayList = trackItems.length <= 2 
                    ? [...trackItems, ...trackItems, ...trackItems, ...trackItems] 
                    : [...trackItems, ...trackItems, ...trackItems];

                  return (
                    <div
                      className="hide-scrollbar highlight-track-container"
                      onMouseDown={(e) => {
                        const el = e.currentTarget;
                        el.dataset.isDown = 'true';
                        el.dataset.startX = (e.pageX - el.offsetLeft).toString();
                        el.dataset.scrollLeft = el.scrollLeft.toString();
                        el.style.cursor = 'grabbing';
                        const inner = el.querySelector('.moving-track-inner');
                        if (inner) inner.style.animationPlayState = 'paused';
                      }}
                      onMouseMove={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.isDown !== 'true') return;
                        e.preventDefault();
                        const startX = parseFloat(el.dataset.startX || '0');
                        const scrollLeft = parseFloat(el.dataset.scrollLeft || '0');
                        const x = e.pageX - el.offsetLeft;
                        const walk = (x - startX) * 1.5;
                        el.scrollLeft = scrollLeft - walk;
                      }}
                      onMouseUp={(e) => {
                        const el = e.currentTarget;
                        el.dataset.isDown = 'false';
                        el.style.cursor = 'grab';
                        const inner = el.querySelector('.moving-track-inner');
                        if (inner) inner.style.animationPlayState = 'running';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.dataset.isDown = 'false';
                        el.style.cursor = 'grab';
                        const inner = el.querySelector('.moving-track-inner');
                        if (inner) inner.style.animationPlayState = 'running';
                      }}
                      style={{
                        display: 'flex',
                        overflowX: 'auto',
                        width: '100%',
                        padding: '0.15rem 0 0.35rem 0',
                        boxSizing: 'border-box',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        cursor: 'grab',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        className="moving-track-inner"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          width: 'max-content',
                          animation: `highlights-marquee ${speed}s linear infinite`,
                          willChange: 'transform'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = 'paused'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = 'running'; }}
                      >
                        {displayList.map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: item.bg || palette.bg,
                              color: item.color || palette.text,
                              border: `1px solid ${item.bg ? 'transparent' : palette.border}`,
                              padding: '0.45rem 0.85rem',
                              borderRadius: '10px',
                              fontSize: '0.78rem',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.03)',
                              pointerEvents: 'none'
                            }}
                          >
                            <span style={{ fontWeight: 800 }}>{item.title}</span>
                            {item.description && (
                              <span style={{ fontWeight: 500, opacity: 0.9 }}>- {item.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                return (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    margin: '0.5rem 0 1rem 0',
                    width: '100%',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    {/* Style for seamless marquee */}
                    <style>{`
                      @keyframes highlights-marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                    `}</style>

                    {/* Track 1 (Row 1 / Top Moving Bar) */}
                    {renderMovingTrack(row1.length > 0 ? row1 : items, row1Palette, 28)}

                    {/* Track 2 (Row 2 / Bottom Moving Bar) */}
                    {row2.length > 0 && renderMovingTrack(row2, row2Palette, 32)}
                  </div>
                );
              })()}

              {/* Star Rating Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', color: '#ffc107', fontSize: '0.9rem', alignItems: 'center', gap: '0.1rem' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= Math.round(averageRating) ? "#ffc107" : "none"}
                      color="#ffc107"
                      strokeWidth={s <= Math.round(averageRating) ? 0 : 2}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    document.getElementById('product-tabs-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  {averageRatingFormatted} ({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})
                </button>
              </div>

              {/* Price Block */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, color: '#0f172a' }}>
                  ₹{currentPrice.toLocaleString('en-IN')}
                </span>
                {currentMRP && currentMRP > currentPrice && (
                  <span style={{
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    color: '#94a3b8',
                    textDecoration: 'line-through',
                    fontWeight: 600
                  }}>
                    ₹{currentMRP.toLocaleString('en-IN')}
                  </span>
                )}
                {currentMRP && currentMRP > currentPrice && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    {Math.round(((currentMRP - currentPrice) / currentMRP) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Bulk Discount Promo Banner */}
              {bulkMinQty > 0 && bulkPrice > 0 && (
                <motion.div
                  key={`${selectedVariantIndex}-${selectedWeight}-${bulkMinQty}-${bulkPrice}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: 'linear-gradient(135deg, #fdfbf7 0%, #f5eedc 100%)',
                    border: '1px solid #e0d0b0',
                    borderRadius: '14px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 2px 10px rgba(124, 94, 45, 0.04)'
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    backgroundColor: '#8c6d3b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    ★
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#544324' }}>
                      Buy {bulkMinQty}+ for ₹{bulkPrice.toLocaleString('en-IN')} each!
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#7a6336', fontWeight: 600 }}>
                      Discount applies automatically at checkout.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Product Group Variants (Color/Style options) */}
              {product.productGroup && product.productGroup.products && product.productGroup.products.length > 1 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Colour: <span style={{ fontWeight: 900, color: '#0f172a' }}>{getProductColorLabel(product)}</span>
                  </div>
                  <div className="group-slider-outer" style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                    {showGroupArrows && (
                      <button
                        onClick={(e) => { e.stopPropagation(); scrollGroupProducts('left'); }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: '0.25rem',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#1a1a1a',
                          border: 'none',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 5,
                          outline: 'none'
                        }}
                      >
                        <ChevronLeft size={13} color="#ffffff" strokeWidth={2.5} />
                      </button>
                    )}

                    <div
                      ref={groupSliderRef}
                      className="hide-scrollbar group-colour-slider"
                      style={{
                        paddingLeft: showGroupArrows ? '2rem' : '2px',
                        paddingRight: showGroupArrows ? '2rem' : '8px',
                        width: '100%',
                        flex: 1,
                        minWidth: 0,
                        justifyContent: (showGroupArrows || product.productGroup.products.length > 3) ? 'flex-start' : 'flex-start'
                      }}
                    >
                      <style>{`
                        .group-colour-slider::-webkit-scrollbar { display: none; }
                        .group-colour-card { scroll-snap-align: start; }
                        .group-colour-slider {
                          display: flex;
                          gap: 0.6rem;
                          overflow-x: auto;
                          padding-bottom: 6px;
                          padding-top: 2px;
                          scrollbar-width: none;
                          -ms-overflow-style: none;
                          -webkit-overflow-scrolling: touch;
                          scroll-snap-type: x mandatory;
                          cursor: grab;
                          width: 100%;
                          max-width: 100%;
                          flex: 1;
                          min-width: 0;
                        }
                        .group-slider-outer {
                          margin-left: -2px;
                          margin-right: -2px;
                          overflow: hidden;
                          width: 100%;
                          max-width: 100%;
                        }
                        .group-colour-card {
                          width: 84px;
                          min-width: 84px;
                          flex-shrink: 0;
                          border-radius: 10px;
                          padding: 0.3rem;
                          cursor: pointer;
                          display: flex;
                          flex-direction: column;
                          gap: 2px;
                          box-sizing: border-box;
                          transition: all 0.2s ease;
                          background-color: #ffffff;
                        }
                        @media (max-width: 600px) {
                          .group-colour-card {
                            width: 90px;
                            min-width: 90px;
                          }
                        }
                      `}</style>
                      {product.productGroup.products.map((groupProd) => {
                        const isCurrent = groupProd._id === product.id || groupProd._id === product._id;
                        const prodColorLabel = getProductColorLabel(groupProd);
                        return (
                          <div
                            key={groupProd._id}
                            className="group-colour-card"
                            onClick={() => {
                              if (!isCurrent) {
                                switchProduct(groupProd._id);
                              }
                            }}
                            style={{
                              border: isCurrent ? '2px solid var(--color-primary, #0a0a0a)' : '1px solid #e2e8f0',
                              backgroundColor: isCurrent ? 'rgba(var(--color-primary-rgb), 0.02)' : '#ffffff',
                              transform: isCurrent ? 'scale(1.02)' : 'scale(1)',
                            }}
                          >
                            <img
                              src={getOptimizedImageUrl(groupProd.image || '/images/placeholder.svg', 120)}
                              alt={groupProd.name}
                              style={{
                                width: '100%',
                                height: '65px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                backgroundColor: '#f8fafc',
                                pointerEvents: 'none',
                              }}
                            />
                            <div style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#1e293b',
                              textTransform: 'capitalize',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px'
                            }}>
                              {prodColorLabel}
                            </div>
                            <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f172a' }}>
                                ₹{groupProd.price}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {showGroupArrows && (
                      <button
                        onClick={(e) => { e.stopPropagation(); scrollGroupProducts('right'); }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          right: '0.25rem',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#1a1a1a',
                          border: 'none',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 5,
                          outline: 'none'
                        }}
                      >
                        <ChevronRight size={13} color="#ffffff" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {hasVariants && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Select Variant
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {product.variants.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariantIndex(idx)}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '50px',
                          border: selectedVariantIndex === idx ? '2px solid #0f172a' : '1px solid #e2e8f0',
                          backgroundColor: selectedVariantIndex === idx ? '#0f172a' : '#ffffff',
                          color: selectedVariantIndex === idx ? '#ffffff' : '#334155',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color & Texture Selector */}
              {((getAvailableColors().length > 0) || (getAvailableTextures().length > 0)) && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Option: <span style={{ fontWeight: 600, color: '#64748b', textTransform: 'none' }}>
                      {selectedTexture ? `Texture - ${selectedTexture.name}` : (selectedColor ? `Color - ${selectedColor.name}` : '')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {getAvailableColors().map((color) => {
                      const isSelected = selectedColor?.name === color.name && selectedTexture === null;
                      return (
                        <button
                          key={`color-${color.name}`}
                          onClick={() => {
                            setSelectedColor(color);
                            setSelectedTexture(null);
                            if (color.image) {
                              const imgIndex = allImages.indexOf(color.image);
                              if (imgIndex !== -1) {
                                setSelectedImageIndex(imgIndex);
                              }
                            }
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: color.code,
                            border: '1px solid rgba(0, 0, 0, 0.15)',
                            outline: isSelected ? '2px solid #0f172a' : 'none',
                            outlineOffset: isSelected ? '2px' : '0px',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                          }}
                          title={color.name}
                        />
                      );
                    })}
                    {getAvailableTextures().map((texture, idx) => {
                      const isSelected = selectedTexture?.name === texture.name;
                      return (
                        <button
                          key={`texture-${idx}`}
                          onClick={() => {
                            setSelectedTexture(texture);
                            setSelectedColor(null);
                            if (texture.image) {
                              const imgIndex = allImages.indexOf(texture.image);
                              if (imgIndex !== -1) {
                                setSelectedImageIndex(imgIndex);
                              }
                            }
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundImage: `url(${texture.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(0, 0, 0, 0.15)',
                            outline: isSelected ? '2px solid #0f172a' : 'none',
                            outlineOffset: isSelected ? '2px' : '0px',
                            padding: 0,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: isSelected ? 'scale(1.08)' : 'scale(1)'
                          }}
                          title={texture.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variant Measurements */}
              {activeVariant?.measurements?.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Ruler size={13} color="var(--color-primary)" />
                    Measurements ({activeVariant.name})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.5rem' }}>
                    {activeVariant.measurements.map((meas, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem'
                        }}
                      >
                        <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          {meas.name}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                          {meas.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Page Free Promotional Gift Banner */}
              {isPdpGiftEligible && (
                <div style={{
                  marginBottom: '1.25rem',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '18px',
                  background: isPdpGiftTimerActive
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 45%, #f7fee7 100%)'
                    : '#f9fafb',
                  border: isPdpGiftTimerActive ? '1.5px solid #6ee7b7' : '1px solid #e5e7eb',
                  boxShadow: isPdpGiftTimerActive ? '0 6px 24px -4px rgba(16, 185, 129, 0.18)' : 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Top Header Row with Pulsing Badge & Countdown Clock */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: isPdpGiftTimerActive ? '#059669' : '#9ca3af',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '100px',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      boxShadow: isPdpGiftTimerActive ? '0 2px 8px rgba(5, 150, 105, 0.35)' : 'none'
                    }}>
                      <Sparkles size={11} />
                      {freeGiftSettings?.productPageBadgeText || 'FREE GIFT WITH THIS ITEM 🎁'}
                    </div>

                    {isPdpGiftTimerActive ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        backgroundColor: '#ffffff',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '10px',
                        border: '1px solid #a7f3d0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                      }}>
                        <Clock size={13} color="#059669" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46' }}>
                          Ends in:
                        </span>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontFamily: 'monospace',
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          color: '#065f46'
                        }}>
                          <span style={{ backgroundColor: '#ecfdf5', padding: '1px 4px', borderRadius: '4px' }}>
                            {formatPdpDigits(pdpGiftTimeLeft).minutes}
                          </span>
                          <span>:</span>
                          <span style={{ backgroundColor: '#ecfdf5', padding: '1px 4px', borderRadius: '4px' }}>
                            {formatPdpDigits(pdpGiftTimeLeft).seconds}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 700, backgroundColor: '#f3f4f6', padding: '3px 8px', borderRadius: '6px' }}>
                        Offer Expired for this session
                      </span>
                    )}
                  </div>

                  {/* Gift Product Preview Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    backgroundColor: '#ffffff',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '14px',
                    border: '1.5px solid #d1fae5',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ position: 'relative', width: '54px', height: '54px', flexShrink: 0 }}>
                      <img
                        src={getOptimizedImageUrl(pdpGiftProduct?.image || (pdpGiftProduct?.images && pdpGiftProduct?.images[0]) || freeGiftSettings?.productPageGiftProductImage || '/logo.png', 100)}
                        alt={pdpGiftProduct?.name || 'Free Gift'}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1.5px solid #a7f3d0',
                          backgroundColor: '#f8fafc'
                        }}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '-3px',
                        right: '-3px',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}>
                        🎁
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Complimentary Gift Item
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pdpGiftProduct?.name || freeGiftSettings?.productPageGiftProductName || 'DAIVIKA Anti-Fog Spray'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          ₹{(pdpGiftProduct?.price || freeGiftSettings?.productPageGiftProductPrice || 399).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#059669' }}>
                          FREE (₹0)
                        </span>
                        <span style={{ fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#065f46', padding: '1px 6px', borderRadius: '100px', fontWeight: 700 }}>
                          100% OFF
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subtitle / urgency message */}
                  <div style={{
                    marginTop: '0.65rem',
                    fontSize: '0.74rem',
                    color: isPdpGiftTimerActive ? '#047857' : '#6b7280',
                    lineHeight: '1.45',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600
                  }}>
                    <span style={{ fontSize: '0.85rem' }}>⚡</span>
                    <span>
                      {isPdpGiftTimerActive
                        ? (freeGiftSettings?.productPageOfferSubtitle || `Add to cart before the timer expires to get a FREE ${pdpGiftProduct?.name || 'gift'} with this item!`)
                        : 'Countdown expired for this session. Add to cart to purchase at standard price.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Controls Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginBottom: '1.5rem' }}>
                {/* Row 1: Quantity, Add to Cart, Wishlist */}
                <div className="purchase-row-1" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
                  {/* Quantity */}
                  <div className="purchase-qty-container" style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '50px',
                    border: '1px solid #cbd5e1',
                    padding: '0.2rem 0.4rem',
                    height: '44px',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}
                    >-</button>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', padding: '0 0.4rem', minWidth: '18px', textAlign: 'center' }}>{quantity}</span>
                    <button
                      onClick={() => {
                        const stock = getActiveStock();
                        if (quantity + 1 > stock) {
                          window.dispatchEvent(new CustomEvent('show_toast', {
                            detail: {
                              message: `Only ${stock} item(s) left in stock.`,
                              type: 'error'
                            }
                          }));
                        } else {
                          setQuantity(quantity + 1);
                        }
                      }}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}
                    >+</button>
                  </div>

                  {/* Add to Cart */}
                  <motion.button
                    className="purchase-cart-btn"
                    whileHover={getActiveStock() === 0 || isCheckingStock ? {} : { scale: 1.01 }}
                    whileTap={getActiveStock() === 0 || isCheckingStock ? {} : { scale: 0.99 }}
                    onClick={getActiveStock() === 0 || isCheckingStock ? null : handleAddToCart}
                    style={{
                      backgroundColor: (getActiveStock() === 0 || isCheckingStock) ? '#e2e8f0' : 'var(--color-primary, #0f172a)',
                      color: (getActiveStock() === 0 || isCheckingStock) ? '#94a3b8' : '#ffffff',
                      border: 'none',
                      borderRadius: '50px',
                      padding: '0 1.25rem',
                      height: '44px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: (getActiveStock() === 0 || isCheckingStock) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 1,
                      gap: '0.4rem',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isCheckingStock ? 'Checking stock...' : getActiveStock() === 0 ? 'Out of Stock' : (
                      <>
                        <ShoppingCart size={15} /> Add To Cart
                      </>
                    )}
                  </motion.button>

                  {/* Wishlist Button */}
                  <motion.button
                    className="purchase-wishlist-btn"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => toggleWishlist(product)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: isInWishlist(product.id || product._id) ? 'var(--color-primary)' : '#64748b',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <Heart size={18} fill={isInWishlist(product.id || product._id) ? "currentColor" : "none"} strokeWidth={isInWishlist(product.id || product._id) ? 0 : 2} />
                  </motion.button>
                </div>

                {/* Row 2: Buy Now */}
                <div style={{ width: '100%' }}>
                  <motion.button
                    className="purchase-buy-btn"
                    whileHover={getActiveStock() === 0 || isCheckingStock ? {} : { scale: 1.01 }}
                    whileTap={getActiveStock() === 0 || isCheckingStock ? {} : { scale: 0.99 }}
                    onClick={getActiveStock() === 0 || isCheckingStock ? null : async () => {
                      if (isCheckingStock) return;
                      const hasStock = await checkLiveStock();
                      if (!hasStock) return;

                      let finalCartId = product.id || product._id;
                      let displayName = product.name;
                      const details = [];
                      if (activeVariant) {
                        finalCartId += `-${activeVariant.name}`;
                        details.push(activeVariant.name);
                      }
                      if (selectedColor) {
                        finalCartId += `-${selectedColor.name}`;
                        details.push(selectedColor.name);
                      }
                      if (selectedTexture) {
                        finalCartId += `-${selectedTexture.name}`;
                        details.push(selectedTexture.name);
                      }
                      if (details.length > 0) {
                        displayName += ` (${details.join(' / ')})`;
                      }

                      const targetItem = {
                        ...product,
                        cartId: finalCartId,
                        name: displayName,
                        image: (selectedColor && selectedColor.image) ? selectedColor.image : 
                               ((selectedTexture && selectedTexture.image) ? selectedTexture.image : 
                               (product.colors?.find(c => c.image)?.image || product.textures?.find(t => t.image)?.image || product.image)),
                        price: activeVariant ? Number(activeVariant.price) : Number(product.price),
                        mrp: activeVariant ? Number(activeVariant.mrp) : Number(product.mrp),
                        selectedVariant: activeVariant,
                        selectedColor: selectedColor,
                      };

                      const checkoutItemsList = [{ ...targetItem, quantity }];
                      if (isPdpGiftEligible && isPdpGiftTimerActive && pdpGiftProduct) {
                        const giftCartId = `gift_${pdpGiftProduct._id || pdpGiftProduct.id}_for_${finalCartId}`;
                        checkoutItemsList.push({
                          ...pdpGiftProduct,
                          id: pdpGiftProduct._id || pdpGiftProduct.id,
                          _id: pdpGiftProduct._id || pdpGiftProduct.id,
                          cartId: giftCartId,
                          name: `${pdpGiftProduct.name} (Free Gift 🎁)`,
                          image: (pdpGiftProduct.images && pdpGiftProduct.images[0]) || pdpGiftProduct.image || '/logo.png',
                          price: 0,
                          originalPrice: Number(pdpGiftProduct.price || 399),
                          mrp: Number(pdpGiftProduct.mrp || pdpGiftProduct.price || 399),
                          quantity: 1,
                          isFreeGift: true,
                          freeGiftParentCartId: finalCartId,
                          parentProductName: product.name,
                          badge: 'FREE GIFT 🎁'
                        });
                      }

                      navigate('/checkout', { state: { checkoutItems: checkoutItemsList } });
                    }}
                    style={{
                      borderRadius: '50px',
                      padding: '0 1.5rem',
                      height: '44px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: (getActiveStock() === 0 || isCheckingStock) ? 'not-allowed' : 'pointer',
                      border: '1.5px solid #0f172a',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isCheckingStock ? 'Checking stock...' : 'Buy Now'}
                  </motion.button>
                </div>
              </div>

              {/* Trust Badges Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
                background: 'linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 50%, #FAF0F2 100%)',
                border: '1.5px solid rgba(54, 9, 16, 0.15)',
                borderRadius: '16px',
                padding: '0.75rem 0.3rem',
                boxSizing: 'border-box',
                boxShadow: '0 4px 16px rgba(54, 9, 16, 0.06)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.35rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldCheck size={17} color="#059669" strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.1px', lineHeight: 1.2 }}>100% Premium Quality</span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '0.35rem',
                  borderLeft: '1px solid rgba(54, 9, 16, 0.15)',
                  borderRight: '1px solid rgba(54, 9, 16, 0.15)'
                }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(54, 9, 16, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Truck size={17} color="#360910" strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.1px', lineHeight: 1.2 }}>Fast Shipping</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.35rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <RotateCcw size={17} color="#4f46e5" strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.1px', lineHeight: 1.2 }}>Easy Returns</span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>

        {/* INTERACTIVE TABBED SECTIONS SYSTEM */}
        <div
          id="product-tabs-section"
          className="product-sections-container"
          style={{ maxWidth: '1280px', margin: isMobile ? '0.15rem auto 1.5rem auto' : '0.75rem auto 2.5rem auto', padding: '0 0.5rem', boxSizing: 'border-box' }}
        >
          {/* Tab Headers */}
          <div className="pd-tabs-container">
            <button
              onClick={() => setActiveTab('description')}
              className={`pd-tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            >
              <Info size={16} />
              <span>Overview & Details</span>
            </button>

            <button
              onClick={() => setActiveTab('specifications')}
              className={`pd-tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            >
              <Ruler size={16} />
              <span>Specifications</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`pd-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              style={{
                border: activeTab === 'reviews' ? 'none' : '1.5px solid #fcd34d',
                backgroundColor: activeTab === 'reviews' ? undefined : '#fffbeb'
              }}
            >
              <Star size={16} fill={activeTab === 'reviews' ? '#ffffff' : '#f59e0b'} color={activeTab === 'reviews' ? '#ffffff' : '#f59e0b'} />
              <span>Customer Reviews</span>
              <span className="tab-badge" style={{
                backgroundColor: '#fef3c7',
                color: '#d97706',
                padding: '0.15rem 0.55rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                fontWeight: 900,
                lineHeight: 1,
                marginLeft: '0.2rem'
              }}>
                ★ {averageRatingFormatted} ({reviews.length})
              </span>
            </button>
          </div>

          {/* TAB 1: DESCRIPTION & HIGHLIGHTS */}
          {activeTab === 'description' && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
                Product Description
              </h3>
              {(() => {
                const rawDesc = (product.description ? product.description.replace(/(?:⭐|\u2B50|\u2605|\s){3,}\s*(?:Rated by Happy Customers)?/gi, '').replace(/Rated by Happy Customers/gi, '').trim() : '') || 'Our products represent the highest quality standards. Premium, ethically sourced, and designed for optimal everyday performance.';
                const shouldTruncate = rawDesc.length > 280;
                const displayText = (!isDescExpanded && shouldTruncate) ? `${rawDesc.slice(0, 280)}...` : rawDesc;

                return (
                  <div style={{ marginBottom: '1.75rem' }}>
                    <p style={{ fontSize: '0.94rem', lineHeight: 1.75, color: '#475569', whiteSpace: 'pre-line', margin: 0 }}>
                      {displayText}
                    </p>
                    {shouldTruncate && (
                      <button
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary, #0f172a)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          padding: '0.4rem 0 0 0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          outline: 'none'
                        }}
                      >
                        <span>{isDescExpanded ? 'Show Less' : 'Read Full Description'}</span>
                        {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                );
              })()}

              {PRODUCT_INFO_SECTIONS.map(s => product[s.key] && typeof product[s.key] === 'string' && (
                <ProductInfoSection key={s.key} section={s} text={product[s.key]} />
              ))}

              {product.highlights && product.highlights.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                  {product.highlights.map((highlight, index) => {
                    const PALETTES = [
                      { bg: 'linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 100%)', border: '1.5px solid rgba(54, 9, 16, 0.25)', titleColor: '#360910', textColor: '#334155', icon: '✨' },
                      { bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1.5px solid rgba(16, 185, 129, 0.25)', titleColor: '#065f46', textColor: '#334155', icon: '💧' },
                      { bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', border: '1.5px solid rgba(249, 115, 22, 0.25)', titleColor: '#9a3412', textColor: '#334155', icon: '🛡️' },
                      { bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)', border: '1.5px solid rgba(124, 58, 237, 0.25)', titleColor: '#5b21b6', textColor: '#334155', icon: '⚡' },
                      { bg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', border: '1.5px solid rgba(244, 63, 94, 0.25)', titleColor: '#9f1239', textColor: '#334155', icon: '🌟' },
                    ];
                    const theme = PALETTES[index % PALETTES.length];
                    const title = typeof highlight === 'string' ? highlight : highlight.title;
                    const desc = typeof highlight === 'string' ? '' : highlight.description;

                    return (
                      <div
                        key={index}
                        style={{
                          padding: '1.1rem 1.25rem',
                          background: theme.bg,
                          border: theme.border,
                          borderRadius: '18px',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: desc ? '0.4rem' : 0 }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.95rem',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)'
                          }}>
                            {theme.icon}
                          </span>
                          <h4 style={{ fontWeight: 800, fontSize: '0.98rem', color: theme.titleColor, margin: 0, lineHeight: 1.3 }}>
                            {title}
                          </h4>
                        </div>
                        {desc && (
                          <p style={{ color: theme.textColor, fontSize: '0.86rem', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                            {desc}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}

          {/* TAB 2: SPECIFICATIONS */}
          {activeTab === 'specifications' && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
                Technical Specifications
              </h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <div className="spec-header" style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  padding: '0.85rem 1.25rem',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  alignItems: 'center'
                }}>
                  <div>Specification</div>
                  <div>Details</div>
                </div>

                {(() => {
                  const displaySpecs = [
                    {
                      key: 'Product Category',
                      value: product.category
                        ? product.category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                        : 'General Store Product'
                    },
                    {
                      key: 'Available Sizes',
                      value: product.variants && product.variants.length > 0
                        ? product.variants.map(v => v.name).join(', ')
                        : 'N/A'
                    },
                    ...(product.specifications || [])
                  ];

                  return displaySpecs.map((spec, i, arr) => (
                    <div key={i} className="spec-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '0.85rem 1.25rem',
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f1f5f9',
                      alignItems: 'center'
                    }}>
                      <div className="spec-key" style={{ fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>{spec.key}</div>
                      <div className="spec-val" style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem', wordBreak: 'break-word' }}>{spec.value}</div>
                    </div>
                  ));
                })()}
              </div>
            </motion.section>
          )}

          {/* TAB 3: CUSTOMER REVIEWS */}
          {activeTab === 'reviews' && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              {/* Customer Rating & Review Breakdown Banner (Matching User Reference Image) */}
              <div
                style={{
                  backgroundColor: '#FAF8F0',
                  border: '1px solid #EFEAE0',
                  borderRadius: '16px',
                  padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left Column: Overall Rating Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                    {averageRatingFormatted}
                  </div>
                  <div style={{ display: 'flex', color: '#ffc107', margin: '0.4rem 0 0.3rem 0', gap: '0.1rem' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={16}
                        fill={s <= Math.round(averageRating) ? "#ffc107" : "none"}
                        color="#ffc107"
                        strokeWidth={s <= Math.round(averageRating) ? 0 : 2}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {reviews.length > 0 ? `Based on ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
                  </div>
                </div>

                {/* Middle Column: 5-Star Rating Breakdown Progress Bars */}
                <div style={{ flex: '1 1 280px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingCounts[star] || 0;
                    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
                        {/* Stars preview */}
                        <div style={{ display: 'flex', color: '#ffc107', width: '68px', gap: '1px', flexShrink: 0 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={11}
                              fill={s <= star ? "#ffc107" : "none"}
                              color="#ffc107"
                              strokeWidth={s <= star ? 0 : 1.5}
                            />
                          ))}
                        </div>

                        {/* Progress Bar Track */}
                        <div style={{ flex: 1, height: '9px', backgroundColor: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: pct > 0 ? '#48d179' : 'transparent',
                              borderRadius: '100px',
                              transition: 'width 0.5s ease'
                            }}
                          />
                        </div>

                        {/* Percentage and Count */}
                        <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, minWidth: '55px', textAlign: 'right', flexShrink: 0 }}>
                          {pct}% ({count})
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Actions (Write Review & Sort Dropdown) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '160px', width: isMobile ? '100%' : 'auto' }}>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '10px',
                      backgroundColor: '#48d179',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 2px 8px rgba(72, 209, 121, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <MessageSquare size={14} />
                    {showReviewForm ? 'Cancel Review' : 'WRITE A REVIEW'}
                  </button>

                  {/* Custom Site-Themed Review Sort Dropdown */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        color: '#166534',
                        border: '2px solid #22c55e',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 6px rgba(34, 197, 94, 0.12)',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>
                        {reviewSortOption === 'recent' ? 'MOST RECENT' :
                         reviewSortOption === 'highest' ? 'HIGHEST RATED' :
                         reviewSortOption === 'lowest' ? 'LOWEST RATED' : 'MOST HELPFUL'}
                      </span>
                      <ChevronDown
                        size={16}
                        color="#166534"
                        style={{
                          transform: isSortDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </button>

                    <AnimatePresence>
                      {isSortDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                            padding: '0.35rem',
                            zIndex: 100,
                            overflow: 'hidden'
                          }}
                        >
                          {[
                            { id: 'helpful', label: 'MOST HELPFUL' },
                            { id: 'recent', label: 'MOST RECENT' },
                            { id: 'highest', label: 'HIGHEST RATED' },
                            { id: 'lowest', label: 'LOWEST RATED' }
                          ].map(opt => {
                            const isSelected = reviewSortOption === opt.id;
                            return (
                              <div
                                key={opt.id}
                                onClick={() => {
                                  setReviewSortOption(opt.id);
                                  setIsSortDropdownOpen(false);
                                }}
                                style={{
                                  padding: '0.6rem 0.85rem',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  letterSpacing: '0.5px',
                                  cursor: 'pointer',
                                  color: isSelected ? '#15803d' : '#334155',
                                  backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.color = '#15803d';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#334155';
                                  }
                                }}
                              >
                                <span>{opt.label}</span>
                                {isSelected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <AnimatePresence>
                {showReviewForm && (
                  <motion.form
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddReview}
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1.75rem',
                      overflow: 'hidden'
                    }}
                  >
                    <h4 style={{ marginBottom: '1rem', fontWeight: 800, color: '#0f172a' }}>How would you rate this product?</h4>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setUserRating(s)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: s <= userRating ? '#ffc107' : '#ccc', padding: 0 }}
                        >
                          <Star size={26} fill={s <= userRating ? "#ffc107" : "none"} strokeWidth={s <= userRating ? 0 : 2} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Tell us what you liked or how we can improve..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      style={{
                        width: '100%',
                        height: '90px',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontFamily: 'inherit',
                        fontSize: '0.88rem',
                        marginBottom: '1.25rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button type="submit" style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', backgroundColor: 'var(--color-primary, #0f172a)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Submit Review</button>
                      <button type="button" onClick={() => setShowReviewForm(false)} style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Review List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedReviews.map(review => {
                  const reviewId = review._id || review.id;
                  return (
                    <div key={reviewId} style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem' }}>
                            {review.user.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{review.user}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatReviewDate(review.createdAt || review.date)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', color: '#ffc107' }}>
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= review.rating ? "#ffc107" : "none"} strokeWidth={s <= review.rating ? 0 : 2} />)}
                        </div>
                      </div>
                      <p style={{ color: '#334155', lineHeight: 1.5, fontSize: '0.88rem', marginBottom: '0.75rem' }}>{review.comment}</p>

                      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.5rem' }}>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleLikeReview(reviewId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: review.userLiked ? 'var(--color-primary, #0f172a)' : '#64748b',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            padding: 0
                          }}
                        >
                          <ThumbsUp size={13} fill={review.userLiked ? 'currentColor' : 'none'} /> Helpful ({review.likes})
                        </motion.button>
                        <button
                          onClick={() => setActiveReplyId(activeReplyId === reviewId ? null : reviewId)}
                          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, padding: 0 }}
                        >
                          <MessageSquare size={13} /> {review.replies?.length > 0 ? `${review.replies.length} Replies` : 'Reply'}
                        </button>
                      </div>

                      {/* Nested Replies Section */}
                      {review.replies && review.replies.length > 0 && (
                        <div style={{
                          marginLeft: '0.75rem',
                          paddingLeft: '1rem',
                          borderLeft: '2px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          marginBottom: '0.75rem',
                          marginTop: '0.75rem'
                        }}>
                          {review.replies.map((reply, replyIdx) => (
                            <div key={reply._id || reply.id || replyIdx}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: reply.isAdmin ? 'var(--color-primary, #0f172a)' : '#cbd5e1', color: reply.isAdmin ? '#fff' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem' }}>
                                  {reply.user.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>{reply.user}</div>
                                  {reply.isAdmin && (
                                    <span style={{ fontSize: '0.58rem', backgroundColor: 'var(--color-primary, #0f172a)', color: '#fff', padding: '0.08rem 0.25rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>Admin</span>
                                  )}
                                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{formatReviewDate(reply.createdAt || reply.date)}</div>
                                </div>
                              </div>
                              <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.45, marginLeft: '28px', margin: 0 }}>{reply.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input Form */}
                      <AnimatePresence>
                        {activeReplyId === reviewId && (
                          <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={(e) => handleAddReply(e, reviewId)}
                            style={{
                              marginLeft: '0.75rem',
                              paddingLeft: '1rem',
                              borderLeft: '2px solid #e2e8f0',
                              overflow: 'hidden',
                              marginTop: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                              <textarea
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                style={{
                                  flex: 1,
                                  minHeight: '60px',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontFamily: 'inherit',
                                  fontSize: '0.82rem',
                                  outline: 'none',
                                  resize: 'vertical',
                                  boxSizing: 'border-box'
                                }}
                                autoFocus
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                              <button type="submit" style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary, #0f172a)', color: '#ffffff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>Post Reply</button>
                              <button type="button" onClick={() => { setActiveReplyId(null); setReplyText(''); }} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </div>
      </div>

      {/* RELATED PRODUCTS SECTION */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section style={{ padding: isMobile ? '2rem 0 1.5rem 0' : '2.5rem 0 2rem 0', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <div className="container" style={{ boxSizing: 'border-box' }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '0.25rem'
                }}>
                  Related Products
                </div>
                <h2 style={{
                  fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.4px',
                  marginBottom: '0.5rem',
                  color: '#0f172a'
                }}>
                  Explore <span style={{ color: 'var(--color-primary, #0f172a)' }}>Related Products</span>
                </h2>
              </motion.div>
            </div>

            <div className="related-products-grid">
              <AnimatePresence mode='wait'>
                {relatedProducts.map((p, index) => (
                  <motion.div
                    key={p.id || p._id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {styleTag}
    </div>
  );
};

// Sleek CSS overrides for luxury look and grid layouts
const styleTag = (
  <style dangerouslySetInnerHTML={{
    __html: `
    .product-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      align-items: start;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      margin-bottom: 0.5rem !important;
    }
    .product-gallery-container {
      position: relative;
      top: 0 !important;
      background-color: #FAF8F5;
      border-radius: 8px;
      border: 1px solid rgba(var(--color-primary-rgb), 0.06);
      width: 100%;
      aspect-ratio: 1 / 1 !important;
      min-height: auto !important;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      isolation: isolate;
    }
    .product-gallery-container img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      object-position: center !important;
      border-radius: 8px !important;
    }
    .product-gallery-column {
      min-width: 0;
      width: 100%;
      max-width: 100%;
    }
    .product-info-column {
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      max-width: 100%;
    }
    .related-products-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
    }
    .spec-row {
      transition: background-color 0.2s;
    }
    .spec-row:hover {
      background-color: rgba(var(--color-primary-rgb), 0.02) !important;
    }
    

    
    @media (max-width: 1023px) {
      .product-detail-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
        min-width: 0;
        width: 100%;
        max-width: 100%;
      }
      .related-products-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .mobile-w-full {
        width: 100%;
        margin-top: 0.5rem;
      }
    }
    @media (max-width: 767px) {
      .pd-main-container {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        padding-top: 0.1rem !important;
        padding-bottom: 0.1rem !important;
        box-sizing: border-box !important;
      }
      .breadcrumbs-container {
        padding-top: 0.15rem !important;
        padding-bottom: 0.15rem !important;
      }
      .product-sections-container {
        margin-top: 0.15rem !important;
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
        box-sizing: border-box !important;
      }
      .product-detail-grid {
        gap: 0.5rem !important;
        margin-bottom: 0.15rem !important;
      }
      .product-info-column {
        padding: 0.2rem 0.15rem !important;
      }
      .related-products-grid {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 0.65rem !important;
        padding-bottom: 0.75rem !important;
      }
      .related-products-grid > div {
        width: 100% !important;
        min-width: 0 !important;
      }
      
      /* Mobile purchase buttons row spacing & placement */
      .purchase-row-1 {
        display: grid !important;
        grid-template-columns: 1fr 44px !important;
        gap: 0.5rem !important;
        width: 100% !important;
      }
      .purchase-qty-container {
        width: 100% !important;
        justify-content: space-between !important;
        order: 1 !important;
      }
      .purchase-wishlist-btn {
        order: 2 !important;
      }
      .purchase-cart-btn {
        grid-column: span 2 !important;
        width: 100% !important;
        order: 3 !important;
      }

      /* Specifications table responsive column alignment */
      .spec-header, .spec-row {
        display: grid !important;
        grid-template-columns: 120px 1fr !important;
        padding: 0.75rem 0.85rem !important;
      }
    }
    @media (max-width: 480px) {
      .related-products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
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

export default ProductDetails;
