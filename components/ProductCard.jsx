import React from 'react';
import { Link, useNavigate } from '@/hooks/useRouterShim';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Heart, Star, Plus, Minus, ShoppingBag, Tag } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl, getSafeImageUrl } from '@/lib/image-optimizer';

const ProductCard = ({ product: propProduct, activeSize }) => {
  const { addToCart, cartItems, updateQuantity, removeFromCart, latestProductsMap, setIsCartOpen } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const baseId = propProduct?.id || propProduct?._id;
  const product = latestProductsMap?.[baseId] || propProduct || {};
  
  if (!propProduct || !baseId) return null;
  
  const [selectedVariantIndex, setSelectedVariantIndex] = React.useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = React.useState(0);
  const [selectedTextureIndex, setSelectedTextureIndex] = React.useState(null);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  const hasVariants = product.variants && product.variants.length > 0;
  const activeVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  const getCardColors = () => {
    if (!product || !product.colors) return [];
    if (hasVariants && activeVariant) {
      if (activeVariant.colors && activeVariant.colors.length > 0) {
        return product.colors.filter(c => activeVariant.colors.includes(c.name));
      }
    }
    return product.colors || [];
  };

  const getCardTextures = () => {
    if (!product || !product.textures) return [];
    if (hasVariants && activeVariant) {
      if (activeVariant.colors && activeVariant.colors.length > 0) {
        return product.textures.filter(t => activeVariant.colors.includes(t.name));
      }
    }
    return product.textures || [];
  };

  const activeColors = getCardColors();
  const activeColor = activeColors.length > 0 ? activeColors[selectedColorIndex] : null;
  const activeTextures = getCardTextures();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 768);
      const handleResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  React.useEffect(() => {
    if (activeSize && activeSize !== 'all' && product.variants) {
      const idx = product.variants.findIndex(v => v.name.toLowerCase() === activeSize.toLowerCase());
      if (idx !== -1) {
        setSelectedVariantIndex(idx);
      }
    }
  }, [activeSize, product.variants]);

  React.useEffect(() => {
    setSelectedColorIndex(0);
    const activeColorsList = getCardColors();
    if (activeColorsList.length === 0 && product.textures && product.textures.length > 0) {
      setSelectedTextureIndex(0);
    } else {
      setSelectedTextureIndex(null);
    }
  }, [selectedVariantIndex, product]);

  React.useEffect(() => {
    const handleStockUpdate = (e) => {
      let data = e.detail;
      if (e.type === 'storage' && e.key === 'daivika_last_stock_update') {
        try {
          data = JSON.parse(e.newValue);
        } catch (err) {
          console.error("Failed to parse storage update info:", err);
        }
      }
      if (data && data.productId === baseId) {
        setLocalInventory(prev => {
          const newInv = prev.map(inv => {
            if ((inv.variant || '').toLowerCase() === (data.variant || '').toLowerCase() &&
                (inv.color || '').toLowerCase() === (data.color || '').toLowerCase()) {
              return { ...inv, stock: data.stock };
            }
            return inv;
          });
          const exists = prev.some(inv => 
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
          return newInv;
        });
      }
    };

    window.addEventListener('daivika_stock_update', handleStockUpdate);
    window.addEventListener('storage', handleStockUpdate);
    return () => {
      window.removeEventListener('daivika_stock_update', handleStockUpdate);
      window.removeEventListener('storage', handleStockUpdate);
    };
  }, [baseId]);
  
  const favorited = isInWishlist(baseId);
  
  const [ratingInfo, setRatingInfo] = React.useState(product.ratingInfo || { rating: 0, count: 0 });

  React.useEffect(() => {
    if (product.ratingInfo) {
      setRatingInfo(product.ratingInfo);
      return;
    }

    const fetchReviews = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/reviews?productId=${baseId}`);
        const result = await response.json();
        let fetchedReviews = [];
        if (response.ok && result.success) {
          fetchedReviews = result.data || [];
        } else if (Array.isArray(result)) {
          fetchedReviews = result;
        }
        if (fetchedReviews.length > 0) {
          const avg = fetchedReviews.reduce((sum, r) => sum + r.rating, 0) / fetchedReviews.length;
          setRatingInfo({ rating: avg, count: fetchedReviews.length });
        } else {
          setRatingInfo({ rating: 0, count: 0 });
        }
      } catch (err) {
        console.warn("Failed to fetch reviews for product card", err);
        setRatingInfo({ rating: 0, count: 0 });
      }
    };

    if (baseId) {
      fetchReviews();
    }
  }, [baseId, product.ratingInfo]);

  const [localInventory, setLocalInventory] = React.useState(product.inventory || []);

  const defaultCoupons = [
    { code: 'DAIVIKA10', discountType: 'percentage', discountValue: 10 },
    { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20 },
    { code: 'FLAT20', discountType: 'percentage', discountValue: 20 },
    { code: 'KERALA500', discountType: 'fixed', discountValue: 500 }
  ];

  const [availableCoupons, setAvailableCoupons] = React.useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vaugun_coupons');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return defaultCoupons;
  });

  React.useEffect(() => {
    const handleCouponsUpdate = () => {
      try {
        const saved = localStorage.getItem('vaugun_coupons');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableCoupons(parsed);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleCouponsUpdate);
    window.addEventListener('vaugun_coupons_updated', handleCouponsUpdate);
    return () => {
      window.removeEventListener('storage', handleCouponsUpdate);
      window.removeEventListener('vaugun_coupons_updated', handleCouponsUpdate);
    };
  }, []);

  React.useEffect(() => {
    setLocalInventory(product.inventory || []);
  }, [product.inventory]);

  React.useEffect(() => {
    if (!localInventory || localInventory.length === 0) return;
    const variants = product.variants || [];
    const colors = product.colors || [];

    const defaultVariantName = variants.length > 0 ? (variants[0]?.name || '') : '';
    const defaultVariantColors = variants.length > 0 && variants[0]?.colors?.length > 0
      ? colors.filter(c => variants[0].colors.includes(c.name))
      : colors;
    const defaultColorName = defaultVariantColors.length > 0 ? (defaultVariantColors[0]?.name || '') : '';

    const defaultInv = localInventory.find(i =>
      (i.variant || '').toLowerCase() === defaultVariantName.toLowerCase() &&
      (i.color || '').toLowerCase() === defaultColorName.toLowerCase()
    );
    if (!defaultInv || defaultInv.stock > 0) return;

    for (let vIdx = 0; vIdx < Math.max(variants.length, 1); vIdx++) {
      const variant = variants[vIdx];
      const variantName = variant ? variant.name : '';
      const variantColors = variant?.colors?.length > 0
        ? colors.filter(c => variant.colors.includes(c.name))
        : colors;

      if (variantColors.length > 0) {
        for (let cIdx = 0; cIdx < variantColors.length; cIdx++) {
          const color = variantColors[cIdx];
          const inv = localInventory.find(i =>
            (i.variant || '').toLowerCase() === variantName.toLowerCase() &&
            (i.color || '').toLowerCase() === color.name.toLowerCase()
          );
          if (inv && inv.stock > 0) {
            setSelectedVariantIndex(vIdx);
            setSelectedColorIndex(cIdx);
            return;
          }
        }
      } else {
        const inv = localInventory.find(i =>
          (i.variant || '').toLowerCase() === variantName.toLowerCase()
        );
        if (inv && inv.stock > 0) {
          setSelectedVariantIndex(vIdx);
          return;
        }
      }
    }
  }, [localInventory]);

  const getActiveStock = () => {
    if (!product) return 0;
    if (localInventory && localInventory.length > 0) {
      const sizeName = activeVariant ? activeVariant.name : '';
      const activeTexture = (activeTextures.length > 0 && selectedTextureIndex !== null) ? activeTextures[selectedTextureIndex] : null;
      const colorName = activeTexture ? activeTexture.name : (activeColor ? activeColor.name : '');
      const inv = localInventory.find(i => 
        (i.variant || '').toLowerCase() === sizeName.toLowerCase() && 
        (i.color || '').toLowerCase() === colorName.toLowerCase()
      );
      return inv ? inv.stock : 50;
    }
    return 50;
  };

  let cartId = baseId;
  if (activeVariant) {
    cartId += `-${activeVariant.name}`;
  }
  if (activeColor) {
    cartId += `-${activeColor.name}`;
  }
  const activeTexture = (activeTextures.length > 0 && selectedTextureIndex !== null) ? activeTextures[selectedTextureIndex] : null;
  if (activeTexture) {
    cartId += `-${activeTexture.name}`;
  }
  
  const cartItem = cartItems?.find(item => item.cartId === cartId);
  const quantity = cartItem ? cartItem.quantity : 0;
  
  const currentPrice = activeVariant ? Number(activeVariant.price) : Number(product.price);
  const currentMRP = activeVariant ? Number(activeVariant.mrp) : Number(product.mrp);
  const sizeParam = activeVariant ? `?size=${encodeURIComponent(activeVariant.name)}` : '';
 
  const handleDecrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) {
      updateQuantity(cartId, -1);
    } else {
      removeFromCart(cartId);
    }
  };
 
  const handleIncrease = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const activeTexture = (activeTextures.length > 0 && selectedTextureIndex !== null) ? activeTextures[selectedTextureIndex] : null;

    if (quantity > 0) {
      updateQuantity(cartId, 1);
    } else {
      addToCart(product, 1, activeVariant, activeColor, activeTexture);
      if (setIsCartOpen) {
        setIsCartOpen(true);
      }
      window.dispatchEvent(new CustomEvent('show_toast', {
        detail: {
          message: `Added ${product.name || 'item'} to cart! 🛍️`,
          type: 'success'
        }
      }));
    }
  };

  const getProductImage = (img) => {
    if (img && typeof img === 'object') {
      img = img.url || img.src || img.path || null;
    }
    if (!img || typeof img !== 'string') return getImageFallback();

    const safeUrl = getSafeImageUrl(img);
    if (!safeUrl) return getImageFallback();

    return getOptimizedImageUrl(safeUrl, 450);
  };

  // Plain SVG placeholder — no random stock images
  const getImageFallback = () => {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f1f5f9'/%3E%3Crect x='100' y='80' width='100' height='80' rx='8' fill='%23cbd5e1'/%3E%3Crect x='80' y='175' width='140' height='12' rx='6' fill='%23cbd5e1'/%3E%3Crect x='110' y='198' width='80' height='10' rx='5' fill='%23e2e8f0'/%3E%3C/svg%3E`;
  };

  const discountPercent = currentMRP && currentMRP > currentPrice 
    ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100)
    : 0;

  const rawRating = Number(ratingInfo?.rating) || 0;
  const rawCount = Number(ratingInfo?.count) || 0;
  
  const displayRating = rawCount > 0 ? (rawRating % 1 === 0 ? rawRating.toFixed(1) : rawRating.toFixed(1)) : null;
  const displayCount = rawCount;
  const displayReviewsText = displayCount >= 1000 
    ? `${(displayCount / 1000).toFixed(1)}K Reviews` 
    : `${displayCount} ${displayCount === 1 ? 'Review' : 'Reviews'}`;

  const keyBenefit = product.subtitle || (Array.isArray(product.highlights) && product.highlights[0] ? (typeof product.highlights[0] === 'string' ? product.highlights[0] : product.highlights[0].title) : (product.category ? product.category.toUpperCase() : 'Premium Quality'));

  // Match & shuffle created coupons for this product
  const activeCouponsList = availableCoupons && availableCoupons.length > 0 ? availableCoupons : defaultCoupons;
  const matchingCoupons = activeCouponsList.filter(c => {
    if (!c || !c.code) return false;
    if (!c.category || c.category === 'all' || !product.category) return true;
    return c.category.toLowerCase().trim() === product.category.toLowerCase().trim();
  });
  const eligibleCoupons = matchingCoupons.length > 0 ? matchingCoupons : activeCouponsList;
  
  // Stable shuffle hash based on product ID
  const pIdStr = String(baseId || 'daivika');
  const hash = pIdStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedCoupon = eligibleCoupons[hash % eligibleCoupons.length] || eligibleCoupons[0];

  // Calculate discounted price with this coupon
  let couponDiscountAmount = 0;
  if (selectedCoupon && selectedCoupon.discountType === 'fixed') {
    couponDiscountAmount = Math.min(Math.round(currentPrice * 0.5), Number(selectedCoupon.discountValue) || 50);
  } else if (selectedCoupon) {
    const pct = Number(selectedCoupon.discountValue) || 10;
    couponDiscountAmount = Math.round((currentPrice * pct) / 100);
  }
  const priceWithCoupon = Math.max(1, currentPrice - couponDiscountAmount);

  return (
    <div 
      className="product-card-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        position: 'relative',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        padding: isMobile ? '7px' : '10px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.04)';
      }}
    >
      <Link 
        to={`/product/${baseId}${sizeParam}`} 
        className="product-card-image-link"
        style={{ 
          display: 'block', 
          position: 'relative', 
          aspectRatio: '1 / 1',
          width: '100%',
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          overflow: 'hidden'
        }}
      >
        <img 
          src={getProductImage((activeTexture && activeTexture.image) ? activeTexture.image : ((activeColor && activeColor.image) ? activeColor.image : (product.image || (Array.isArray(product.images) && product.images[0]))))} 
          alt={`${product.name} - DAIVIKA`} 
          width={300}
          height={300}
          loading="lazy"
          decoding="async"
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: 'block',
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = getImageFallback();
          }}
        />

        {(product.badge || discountPercent > 0) && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            backgroundColor: product.badgeBg || '#FEF3C7',
            color: product.badgeColor || '#92400e',
            fontSize: isMobile ? '0.62rem' : '0.7rem',
            fontWeight: 800,
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            border: product.badgeBg ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(251, 191, 36, 0.4)',
            zIndex: 4,
            letterSpacing: '0.2px',
            textTransform: 'uppercase',
            pointerEvents: 'none'
          }}>
            {product.badge || (discountPercent > 0 ? `${discountPercent}% OFF` : 'Best Seller')}
          </div>
        )}
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            border: 'none',
            cursor: 'pointer',
            padding: '0.35rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            color: favorited ? '#ef4444' : '#94a3b8',
            zIndex: 4,
            outline: 'none'
          }}
        >
          <Heart size={14} fill={favorited ? "#ef4444" : "none"} strokeWidth={favorited ? 0 : 2} />
        </button>
      </Link>

      <div style={{ 
        padding: '0.5rem 0.15rem 0.15rem 0.15rem',
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        justifyContent: 'space-between'
      }}>
        <div>
          {rawCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem', flexWrap: 'nowrap', overflow: 'hidden' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#059669', fontSize: isMobile ? '0.72rem' : '0.76rem', fontWeight: 800 }}>
                <Star size={11} fill="#059669" color="#059669" strokeWidth={0} />
                {displayRating}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: '0 2px' }}>|</span>
              <span style={{ fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 500, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayReviewsText}
              </span>
            </div>
          ) : null}

          <Link to={`/product/${baseId}${sizeParam}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '0.2rem' }}>
            <h3 style={{
              fontSize: isMobile ? '0.82rem' : '0.92rem',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.25,
              height: isMobile ? '2.1rem' : '2.3rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}>
              {product.name}
            </h3>
          </Link>

          <p style={{
            fontSize: isMobile ? '0.68rem' : '0.72rem',
            color: '#64748b',
            margin: '0 0 0.35rem 0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2
          }}>
            {keyBenefit}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.35rem',
            marginBottom: '0.2rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            {currentMRP && currentMRP > currentPrice && (
              <span style={{ fontSize: isMobile ? '0.7rem' : '0.76rem', fontWeight: 500, color: '#94a3b8', textDecoration: 'line-through', lineHeight: 1 }}>
                ₹{currentMRP.toLocaleString('en-IN')}
              </span>
            )}
            {discountPercent > 0 && (
              <span style={{ 
                fontSize: isMobile ? '0.62rem' : '0.68rem', 
                fontWeight: 800, 
                color: '#059669', 
                backgroundColor: '#e6f9f0',
                padding: '1px 5px',
                borderRadius: '4px',
                lineHeight: 1
              }}>
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {selectedCoupon && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: isMobile ? '0.62rem' : '0.68rem',
              fontWeight: 700,
              color: '#059669',
              backgroundColor: '#ecfdf5',
              border: '1px dashed #a7f3d0',
              padding: '2px 6px',
              borderRadius: '6px',
              marginBottom: '0.45rem',
              maxWidth: '100%',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              <Tag size={isMobile ? 10 : 11} color="#059669" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Get it for ₹{priceWithCoupon.toLocaleString('en-IN')} with <strong style={{ color: '#047857', letterSpacing: '0.2px', textTransform: 'uppercase' }}>{selectedCoupon.code}</strong>
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', width: '100%' }}>
          {quantity > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFC20E',
                color: '#111827',
                borderRadius: '100px',
                padding: '0.35rem 0.6rem',
                boxSizing: 'border-box',
                flex: 1,
                boxShadow: '0 4px 12px rgba(255, 194, 14, 0.35)'
              }}>
                <button 
                  onClick={handleDecrease} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#111827', 
                    cursor: 'pointer', 
                    padding: '0.15rem', 
                    display: 'flex',
                    alignItems: 'center',
                    outline: 'none'
                  }}
                >
                  <Minus size={13} strokeWidth={3} />
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{quantity} in Cart</span>
                <button 
                  onClick={handleIncrease} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#111827', 
                    cursor: 'pointer', 
                    padding: '0.15rem', 
                    display: 'flex',
                    alignItems: 'center',
                    outline: 'none'
                  }}
                >
                  <Plus size={13} strokeWidth={3} />
                </button>
              </div>
            </div>
          ) : (
            getActiveStock() === 0 ? (
              <button 
                disabled
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f1f5f9',
                  color: '#94a3b8',
                  borderRadius: '100px',
                  padding: isMobile ? '0.55rem 0.75rem' : '0.65rem 1rem',
                  border: 'none',
                  cursor: 'not-allowed',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  outline: 'none'
                }}
              >
                OUT OF STOCK
              </button>
            ) : (
              <button 
                onClick={handleIncrease}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#FFC20E',
                  color: '#111827',
                  borderRadius: '100px',
                  padding: isMobile ? '0.55rem 0.75rem' : '0.65rem 1rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.74rem' : '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  boxShadow: '0 4px 14px rgba(255, 194, 14, 0.35)',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5b800';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 194, 14, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFC20E';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 194, 14, 0.35)';
                }}
              >
                <ShoppingBag size={14} color="#111827" strokeWidth={2.5} />
                ADD TO CART
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
