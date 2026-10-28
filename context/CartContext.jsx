"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { trackMetaPixelEvent } from '@/lib/meta-pixel';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const recalculateCartItemPrices = (items, productGroups = []) => {
  // Purge any orphan free gifts whose parent product is no longer present in the cart
  const nonGiftCartIds = new Set(items.filter(i => !i.isFreeGift).map(i => i.cartId));
  const validItems = items.filter(item => {
    if (item.isFreeGift && item.freeGiftParentCartId) {
      return nonGiftCartIds.has(item.freeGiftParentCartId);
    }
    return true;
  });

  // Map product IDs to their group for easy lookup
  const groupMap = {};
  productGroups.forEach(group => {
    if (group.products && Array.isArray(group.products)) {
      group.products.forEach(p => {
        const pId = typeof p === 'object' ? (p._id || p.id) : p;
        if (pId) {
          groupMap[pId.toString()] = group;
        }
      });
    }
  });

  // Compute combined quantities grouped by product ID (or group ID) and variant name
  const groupQuantities = {};
  
  validItems.forEach(item => {
    if (item.isFreeGift) return; // Free gifts don't count towards bulk discount pricing thresholds
    const productId = (item.id || item._id || '').toString();
    const variantName = item.selectedVariant ? (item.selectedVariant.name || '').trim().toLowerCase() : '';
    
    const group = groupMap[productId];
    if (group) {
      const key = `group_${group._id}_${variantName}`;
      groupQuantities[key] = (groupQuantities[key] || 0) + item.quantity;
    } else {
      const key = `prod_${productId}_${variantName}`;
      groupQuantities[key] = (groupQuantities[key] || 0) + item.quantity;
    }
  });

  return validItems.map(item => {
    if (item.isFreeGift) {
      return {
        ...item,
        price: 0,
        quantity: 1
      };
    }

    const originalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
    let activePrice = originalPrice;
    
    const productId = (item.id || item._id || '').toString();
    const variantName = item.selectedVariant ? (item.selectedVariant.name || '').trim().toLowerCase() : '';
    
    const group = groupMap[productId];
    let key;
    if (group) {
      key = `group_${group._id}_${variantName}`;
    } else {
      key = `prod_${productId}_${variantName}`;
    }
    const totalQuantity = groupQuantities[key] || 0;
    
    if (item.selectedVariant) {
      const variant = item.selectedVariant;
      const vMinQty = Number(variant.bulkMinQty);
      const vBulkPrice = Number(variant.bulkPrice);
      if (vMinQty > 0 && vBulkPrice > 0 && totalQuantity >= vMinQty) {
        activePrice = vBulkPrice;
      }
    } else {
      const pMinQty = Number(item.bulkMinQty);
      const pBulkPrice = Number(item.bulkPrice);
      if (pMinQty > 0 && pBulkPrice > 0 && totalQuantity >= pMinQty) {
        activePrice = pBulkPrice;
      }
    }
    
    return {
      ...item,
      originalPrice,
      price: activePrice
    };
  });
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [latestProductsMap, setLatestProductsMap] = useState({});
  const [productGroups, setProductGroups] = useState([]);

  // Fetch product groups for consolidated variant bulk calculations
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/products/groups');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProductGroups(json.data);
        }
      } catch (err) {
        console.warn('Failed to fetch product groups for cart calculations:', err);
      }
    };
    fetchGroups();
  }, []);

  // Pre-fetch all products to populate memory cache and support 0ms details page loading
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const res = await fetch(`/api/products?t=${Date.now()}`);
        const json = await res.json();
        const rawList = json.success && Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
        if (rawList.length > 0) {
          const cacheMap = {};
          rawList.forEach(p => {
            const pId = p._id || p.id;
            if (pId) {
              cacheMap[pId] = p;
            }
          });
          setLatestProductsMap(cacheMap);
        }
      } catch (err) {
        console.warn('Failed to pre-fetch products for local caching:', err);
      }
    };
    fetchAllProducts();

    // Live price/stock changes arrive through the SSE stream below; this is only a safety refresh.
    // It runs every 5 minutes while the tab is visible, and right away when the shopper comes back to the tab.
    let lastFetch = Date.now();
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > 60000) {
        lastFetch = Date.now();
        fetchAllProducts();
      }
    };
    const interval = setInterval(refreshIfVisible, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);

  // Recalculate price once product groups load or change
  useEffect(() => {
    if (productGroups.length > 0) {
      setCartItems(prev => recalculateCartItemPrices(prev, productGroups));
    }
  }, [productGroups]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('drop_cart');
      if (savedCart) {
        const items = JSON.parse(savedCart) || [];
        const mapped = items.map(item => ({
          ...item,
          cartId: item.cartId || item.id || item._id
        }));
        setCartItems(recalculateCartItemPrices(mapped, productGroups));
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('drop_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  // Connect to SSE stream or poll as fallback
  useEffect(() => {
    if (!isLoaded) return;

    let eventSource = null;
    let pollInterval = null;

    const handleProductUpdate = (data) => {
      if (!data) return;
      
      if (data.type === 'delete') {
        const deletedId = data.productId;
        setLatestProductsMap(prev => {
          const copy = { ...prev };
          delete copy[deletedId];
          return copy;
        });
        setCartItems(prev => prev.filter(item => (item.id || item._id) !== deletedId));
        return;
      }
      
      const updatedProduct = data.product;
      if (!updatedProduct) return;
      
      const productId = updatedProduct._id || updatedProduct.id;
      setLatestProductsMap(prev => ({
        ...prev,
        [productId]: updatedProduct
      }));

      setCartItems(prev => {
        const hasItem = prev.some(item => (item.id || item._id) === productId);
        if (!hasItem) return prev;
        
        const updatedItems = prev.map(item => {
          if ((item.id || item._id) !== productId) {
            return item;
          }
          
          let newPrice = item.price;
          let newMRP = item.mrp;
          let newOriginalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
          let selectedVariant = item.selectedVariant;
          
          if (selectedVariant) {
            const updatedVariant = updatedProduct.variants?.find(v => v.name === selectedVariant.name);
            if (updatedVariant) {
              selectedVariant = {
                ...selectedVariant,
                price: updatedVariant.price,
                mrp: updatedVariant.mrp,
                bulkMinQty: updatedVariant.bulkMinQty,
                bulkPrice: updatedVariant.bulkPrice
              };
              newOriginalPrice = Number(updatedVariant.price);
              newPrice = newOriginalPrice;
              newMRP = Number(updatedVariant.mrp);
            }
          } else {
            newOriginalPrice = Number(updatedProduct.price);
            newPrice = newOriginalPrice;
            newMRP = Number(updatedProduct.mrp);
          }
          
          return {
            ...item,
            originalPrice: newOriginalPrice,
            price: newPrice,
            mrp: newMRP,
            bulkMinQty: updatedProduct.bulkMinQty,
            bulkPrice: updatedProduct.bulkPrice,
            selectedVariant
          };
        });
        
        return recalculateCartItemPrices(updatedItems, productGroups);
      });
    };

    const startPollingFallback = () => {
      if (pollInterval) return;
      console.log('Starting polling fallback for price updates...');
      pollInterval = setInterval(async () => {
        if (document.visibilityState !== 'visible') return;
        try {
          const res = await fetch(`/api/products?t=${Date.now()}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              json.data.forEach(p => {
                handleProductUpdate({
                  type: 'update',
                  productId: p._id,
                  product: p
                });
              });
            }
          }
        } catch (e) {
          console.warn('Fallback poll fetch failed:', e);
        }
      }, 60000);
    };

    const connectSSE = () => {
      try {
        console.log('Connecting to product events SSE stream...');
        eventSource = new EventSource('/api/products/events');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') {
              console.log('SSE Stream connected successfully');
              return;
            }
            handleProductUpdate(data);
          } catch (err) {
            console.error('Error parsing SSE event data:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('SSE stream error encountered. Activating polling fallback...', err);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startPollingFallback();
        };
      } catch (e) {
        console.error('SSE initialization failed. Starting polling fallback...', e);
        startPollingFallback();
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isLoaded]);

  const trackRecentlyViewed = (product) => {
    if (!product || typeof window === 'undefined') return;
    try {
      const productId = product.id || product._id;
      if (!productId) return;

      const saved = localStorage.getItem('daivika_keep_shopping_products');
      let list = saved ? JSON.parse(saved) : [];

      // Remove duplicate to move to front
      list = list.filter(p => (p.id || p._id) !== productId);

      // Add to front
      const productInfo = {
        id: productId,
        _id: productId,
        name: product.name,
        image: (product.image && typeof product.image === 'object') ? (product.image.url || product.image.src) : product.image,
        price: product.price,
        mrp: product.mrp,
        category: product.category,
        ratingInfo: product.ratingInfo,
        variants: product.variants,
        colors: product.colors
      };
      list.unshift(productInfo);

      // Slice to max 6
      if (list.length > 6) {
        list = list.slice(0, 6);
      }

      localStorage.setItem('daivika_keep_shopping_products', JSON.stringify(list));
      localStorage.setItem('kinzo_keep_shopping_product', JSON.stringify(productInfo));
    } catch (e) {
      console.error('Failed to save recently viewed product:', e);
    }
  };

  const addToCart = (product, quantity = 1, selectedVariant = null, selectedColor = null, selectedTexture = null, freeGiftProduct = null) => {
    const baseId = product.id || product._id;
    
    // Construct cartId with variant, color and texture if present
    let cartId = baseId;
    if (selectedVariant) {
      cartId += `-${selectedVariant.name}`;
    }
    if (selectedColor) {
      cartId += `-${selectedColor.name}`;
    }
    if (selectedTexture) {
      cartId += `-${selectedTexture.name}`;
    }
    
    setCartItems(prev => {
      const existing = prev.find(item => item.cartId === cartId);
      let updatedItems;
      if (existing) {
        updatedItems = prev.map(item => 
          item.cartId === cartId ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        // Construct descriptive item name showing size, color and texture selection
        let displayName = product.name;
        const details = [];
        if (selectedVariant) details.push(selectedVariant.name);
        if (selectedColor) details.push(selectedColor.name);
        if (selectedTexture) details.push(selectedTexture.name);
        if (details.length > 0) {
          displayName += ` (${details.join(' / ')})`;
        }
 
        const cartProduct = {
          ...product,
          cartId,
          name: displayName,
          image: (selectedColor && selectedColor.image) ? selectedColor.image : 
                 ((selectedTexture && selectedTexture.image) ? selectedTexture.image : 
                 (product.colors?.find(c => c.image)?.image || product.textures?.find(t => t.image)?.image || product.image)),
          originalPrice: selectedVariant ? Number(selectedVariant.price) : Number(product.price),
          price: selectedVariant ? Number(selectedVariant.price) : Number(product.price),
          mrp: selectedVariant ? Number(selectedVariant.mrp) : Number(product.mrp),
          selectedVariant: selectedVariant,
          selectedColor: selectedColor,
          selectedTexture: selectedTexture,
          isFreeGift: false
        };
        updatedItems = [...prev, { ...cartProduct, quantity }];
      }

      // If a promotional free gift is awarded with this product
      if (freeGiftProduct) {
        const giftId = (freeGiftProduct._id || freeGiftProduct.id || 'free_gift').toString();
        const giftCartId = `gift_${giftId}_for_${cartId}`;
        const existingGift = updatedItems.find(item => item.cartId === giftCartId);
        if (!existingGift) {
          const giftItem = {
            ...freeGiftProduct,
            id: giftId,
            _id: giftId,
            cartId: giftCartId,
            name: `${freeGiftProduct.name} (Free Gift 🎁)`,
            image: (freeGiftProduct.images && freeGiftProduct.images[0]) || freeGiftProduct.image || '/logo.png',
            originalPrice: Number(freeGiftProduct.price || freeGiftProduct.mrp || 399),
            price: 0,
            mrp: Number(freeGiftProduct.mrp || freeGiftProduct.price || 399),
            quantity: 1,
            isFreeGift: true,
            freeGiftParentCartId: cartId,
            parentProductName: product.name,
            badge: 'FREE GIFT 🎁'
          };
          updatedItems = [...updatedItems, giftItem];
        }
      }

      return recalculateCartItemPrices(updatedItems, productGroups);
    });

    trackRecentlyViewed(product);

    // Track Meta Pixel AddToCart Event
    try {
      const pPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
      trackMetaPixelEvent('AddToCart', {
        content_name: product.name || 'Product',
        content_category: product.category || 'General',
        content_ids: [baseId ? baseId.toString() : ''],
        content_type: 'product',
        value: pPrice * quantity,
        currency: 'INR',
        num_items: quantity
      });
    } catch (e) {
      // Non-blocking
    }
  };

  const removeFromCart = (cartId) => {
    setCartItems(prev => {
      // Remove product and also immediately purge any linked free gifts
      const remaining = prev.filter(item => 
        item.cartId !== cartId && item.freeGiftParentCartId !== cartId
      );
      return recalculateCartItemPrices(remaining, productGroups);
    });
  };

  const updateQuantity = (cartId, amount) => {
    let stockExceeded = false;
    let maxStock = 999;

    setCartItems(prev => {
      // Disallow altering quantity directly on a promotional free gift item
      const targetItem = prev.find(item => item.cartId === cartId);
      if (targetItem?.isFreeGift) {
        return prev;
      }

      let willBeRemoved = false;
      const updatedItems = prev.map(item => {
        if (item.cartId === cartId) {
          if (amount > 0) {
            const productId = item.id || item._id;
            const latestProduct = latestProductsMap ? latestProductsMap[productId] : null;
            if (latestProduct) {
              const sizeName = item.selectedVariant ? item.selectedVariant.name : '';
              const colorName = item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : '');
              const inv = latestProduct.inventory?.find(i => 
                (i.variant || '').toLowerCase() === (sizeName || '').toLowerCase() && 
                (i.color || '').toLowerCase() === (colorName || '').toLowerCase()
              );
              const stock = inv ? inv.stock : 50;
              maxStock = stock;
              if (item.quantity + amount > stock) {
                stockExceeded = true;
                return item;
              }
            }
          }
          const newQty = item.quantity + amount;
          if (newQty <= 0) {
            willBeRemoved = true;
          }
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      });

      let finalItems = updatedItems;
      if (willBeRemoved) {
        finalItems = finalItems.filter(item => item.cartId !== cartId && item.freeGiftParentCartId !== cartId);
      }

      return recalculateCartItemPrices(finalItems, productGroups);
    });

    if (stockExceeded) {
      window.dispatchEvent(new CustomEvent('show_toast', {
        detail: {
          message: `Only ${maxStock} item(s) left in stock.`,
          type: 'error'
        }
      }));
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartTotal,
      getCartCount,
      isCartOpen,
      setIsCartOpen,
      clearCart,
      latestProductsMap,
      trackRecentlyViewed,
      isCartLoaded: isLoaded
    }}>
      {children}
    </CartContext.Provider>
  );
};
