import React from 'react';
import { Link, useNavigate } from '@/hooks/useRouterShim';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Heart, Star, ShoppingCart, Award, CheckCircle, Flame, Plus, Minus } from 'lucide-react';
import { API_BASE_URL } from '@/config';

const AmazonProductCard = ({ product: propProduct }) => {
  const { addToCart, cartItems, updateQuantity, removeFromCart, latestProductsMap } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const baseId = propProduct.id || propProduct._id;
  const product = latestProductsMap?.[baseId] || propProduct;

  const [selectedVariantIndex, setSelectedVariantIndex] = React.useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = React.useState(0);

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
        console.warn("Failed to fetch reviews for Amazon product card", err);
        setRatingInfo({ rating: 0, count: 0 });
      }
    };

    if (baseId) {
      fetchReviews();
    }
  }, [baseId, product.ratingInfo]);

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

  const activeColors = getCardColors();
  const activeColor = activeColors.length > 0 ? activeColors[selectedColorIndex] : null;

  const [localInventory, setLocalInventory] = React.useState(product.inventory || []);

  const getActiveStock = () => {
    if (!product) return 0;
    if (localInventory && localInventory.length > 0) {
      const sizeName = activeVariant ? activeVariant.name : '';
      const colorName = activeColor ? activeColor.name : '';
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

  const cartItem = cartItems?.find(item => item.cartId === cartId);
  const quantity = cartItem ? cartItem.quantity : 0;

  const currentPrice = activeVariant ? Number(activeVariant.price) : Number(product.price);
  const currentMRP = activeVariant ? Number(activeVariant.mrp) : Number(product.mrp);
  const discountPct = currentMRP > currentPrice ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0;
  const sizeParam = activeVariant ? `?size=${encodeURIComponent(activeVariant.name)}` : '';

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(`${API_BASE_URL}/products/${baseId}?t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newInv = result.data.inventory || [];
          setLocalInventory(newInv);

          const sizeName = activeVariant ? activeVariant.name : '';
          const colorName = activeColor ? activeColor.name : '';
          const inv = newInv.find(i => 
            (i.variant || '').toLowerCase() === sizeName.toLowerCase() && 
            (i.color || '').toLowerCase() === colorName.toLowerCase()
          );
          const latestStock = inv ? inv.stock : 50;

          if (latestStock <= quantity) {
            window.dispatchEvent(new CustomEvent('show_toast', {
              detail: {
                message: `Only ${latestStock} items left in stock.`,
                type: 'error'
              }
            }));
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to check card stock on increase:", err);
    }

    addToCart(product, 1, activeVariant, activeColor, null);
    window.dispatchEvent(new CustomEvent('show_toast', {
      detail: {
        message: `${product.name} added to cart!`,
        type: 'success'
      }
    }));
  };

  const handleBuyNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await fetch(`${API_BASE_URL}/products/${baseId}?t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newInv = result.data.inventory || [];
          setLocalInventory(newInv);

          const sizeName = activeVariant ? activeVariant.name : '';
          const colorName = activeColor ? activeColor.name : '';
          const inv = newInv.find(i => 
            (i.variant || '').toLowerCase() === sizeName.toLowerCase() && 
            (i.color || '').toLowerCase() === colorName.toLowerCase()
          );
          const latestStock = inv ? inv.stock : 50;

          if (latestStock <= 0) {
            window.dispatchEvent(new CustomEvent('show_toast', {
              detail: {
                message: `Sorry, this item is out of stock!`,
                type: 'error'
              }
            }));
            return;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to check stock on Buy Now:", err);
    }

    let finalCartId = baseId;
    let displayName = product.name;
    const details = [];

    if (activeVariant) {
      finalCartId += `-${activeVariant.name}`;
      details.push(activeVariant.name);
    }
    if (activeColor) {
      finalCartId += `-${activeColor.name}`;
      details.push(activeColor.name);
    }
    if (details.length > 0) {
      displayName += ` (${details.join(' / ')})`;
    }

    const checkoutItem = {
      ...product,
      cartId: finalCartId,
      name: displayName,
      image: (activeColor && activeColor.image) ? activeColor.image : 
             (product.colors?.find(c => c.image)?.image || product.textures?.find(t => t.image)?.image || product.image),
      price: activeVariant ? Number(activeVariant.price) : Number(product.price),
      mrp: activeVariant ? Number(activeVariant.mrp) : Number(product.mrp),
      selectedVariant: activeVariant,
      selectedColor: activeColor
    };

    navigate('/checkout', { state: { checkoutItems: [{ ...checkoutItem, quantity: 1 }] } });
  };

  const getProductImage = () => {
    let img = (activeColor && activeColor.image) ? activeColor.image : product.image;
    if (img && typeof img === 'object') {
      img = img.url || img.src || img.path || null;
    }
    if (!img || typeof img !== 'string') return '/images/placeholder.svg';

    let cleanImg = img;
    if (cleanImg.includes('localhost:') && cleanImg.includes('/uploads/')) {
      const idx = cleanImg.indexOf('/uploads/');
      cleanImg = cleanImg.slice(idx);
    }

    if (cleanImg.startsWith('http://') || cleanImg.startsWith('https://') || cleanImg.startsWith('data:')) {
      return cleanImg;
    }
    return cleanImg;
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCart(e);
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 1) {
      updateQuantity(cartId, quantity - 1);
    } else {
      removeFromCart(cartId);
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1rem',
        boxSizing: 'border-box',
        height: '100%',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 14px 28px rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {/* Deal Tag Overlay */}
      {discountPct >= 15 && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          background: 'linear-gradient(135deg, #360910 0%, #54111c 100%)',
          color: '#ffffff',
          fontSize: '0.62rem',
          fontWeight: 800,
          padding: '0.25rem 0.6rem',
          borderRadius: '20px',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          boxShadow: '0 4px 12px rgba(54, 9, 16, 0.35)'
        }}>
          <Flame size={11} fill="#fff" />
          Deal of the Day
        </div>
      )}

      {/* Wishlist Toggle */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product);
        }}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          padding: '0.45rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          color: favorited ? '#ef4444' : '#94a3b8',
          zIndex: 3,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Heart size={15} fill={favorited ? "#ef4444" : "none"} strokeWidth={favorited ? 0 : 2} />
      </button>

      {/* Image Block */}
      <Link 
        to={`/product/${baseId}${sizeParam}`}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '1/1',
          overflow: 'hidden',
          marginBottom: '0.75rem',
          borderRadius: '12px',
          background: '#f8fafc'
        }}
      >
        <img 
          src={getProductImage()}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transition: 'transform 0.4s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/placeholder.svg';
          }}
        />
      </Link>

      {/* Product Title */}
      <Link 
        to={`/product/${baseId}${sizeParam}`}
        style={{ textDecoration: 'none', color: '#0f172a' }}
      >
        <h3 style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          margin: '0 0 0.4rem 0',
          lineHeight: '1.35',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          height: '2.4rem',
          color: '#0f172a',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#360910'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#0f172a'}
        >
          {product.name}
        </h3>
      </Link>

      {/* Rating Row - Render only if real reviews exist */}
      {ratingInfo.count > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b' }}>
            {ratingInfo.rating.toFixed(1)}
          </span>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                size={12} 
                fill={s <= Math.round(ratingInfo.rating) ? "#f59e0b" : "none"} 
                color="#f59e0b"
                strokeWidth={s <= Math.round(ratingInfo.rating) ? 0 : 2}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
            ({ratingInfo.count} {ratingInfo.count === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}

      {/* Badges/Assured */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          background: 'rgba(54, 9, 16, 0.08)',
          color: '#360910',
          border: '1px solid rgba(54, 9, 16, 0.15)',
          fontSize: '0.6rem',
          fontWeight: 800,
          padding: '0.15rem 0.45rem',
          borderRadius: '20px'
        }}>
          <CheckCircle size={10} fill="#360910" color="#fff" />
          Daivika Assured
        </span>
        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
          FREE Express Shipping
        </span>
      </div>

      {/* Price block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
            ₹{currentPrice.toLocaleString('en-IN')}
          </span>
          {currentMRP > currentPrice && (
            <>
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#94a3b8', textDecoration: 'line-through' }}>
                ₹{currentMRP.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444' }}>
                ({discountPct}% OFF)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Variant Selection Dropdowns (Sizes & Colors) */}
      {hasVariants && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.8rem' }}>
          <select 
            value={selectedVariantIndex}
            onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              background: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            {product.variants.map((v, idx) => (
              <option key={idx} value={idx}>Size: {v.name}</option>
            ))}
          </select>
          {activeColors.length > 0 && (
            <select
              value={selectedColorIndex}
              onChange={(e) => setSelectedColorIndex(Number(e.target.value))}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f172a',
                outline: 'none',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              {activeColors.map((c, idx) => (
                <option key={idx} value={idx}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 'auto', width: '100%' }}>
        {quantity > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(54, 9, 16, 0.06)',
              border: '1px solid rgba(54, 9, 16, 0.15)',
              color: '#360910',
              borderRadius: '12px',
              padding: '0.5rem 0.8rem',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <button 
                onClick={handleDecrease} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#360910', 
                  cursor: 'pointer', 
                  padding: '0.2rem 0.4rem', 
                  display: 'flex',
                  alignItems: 'center',
                  outline: 'none'
                }}
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span style={{ fontSize: '0.76rem', fontWeight: 900 }}>{quantity} added</span>
              <button 
                onClick={handleIncrease} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#360910', 
                  cursor: 'pointer', 
                  padding: '0.2rem 0.4rem', 
                  display: 'flex',
                  alignItems: 'center',
                  outline: 'none'
                }}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/checkout');
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #360910 0%, #54111c 100%)',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '0.65rem 1rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 800,
                outline: 'none',
                boxShadow: '0 4px 14px rgba(54, 9, 16, 0.3)'
              }}
            >
              Checkout Now
            </button>
          </div>
        ) : (
          getActiveStock() === 0 ? (
            <button 
              disabled 
              style={{
                width: '100%',
                backgroundColor: '#e2e8f0',
                color: '#94a3b8',
                border: 'none',
                padding: '0.65rem',
                borderRadius: '12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'not-allowed'
              }}
            >
              Out of Stock
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.65rem 0.4rem',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              >
                <ShoppingCart size={14} strokeWidth={2.5} />
                Add
              </button>
              <button
                onClick={handleBuyNow}
                style={{
                  flex: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #360910 0%, #54111c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 0.4rem',
                  borderRadius: '12px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(54, 9, 16, 0.3)',
                  outline: 'none'
                }}
              >
                Buy Now
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AmazonProductCard;
