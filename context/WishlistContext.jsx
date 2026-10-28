"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '@/config';

const WishlistContext = createContext();

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch (e) {
      console.error('Failed to parse wishlist from localStorage:', e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isLoaded]);

  useEffect(() => {
    const syncWishlist = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const result = await response.json();
        
        if (response.ok && result.success && Array.isArray(result.data)) {
          const liveProducts = result.data;
          setWishlist((prev) => {
            const synced = prev
              .map((item) => {
                const itemId = item._id || item.id;
                const liveMatch = liveProducts.find((p) => p._id === itemId);
                if (liveMatch) {
                  return { ...liveMatch, id: liveMatch._id };
                }
                return null;
              })
              .filter(Boolean);

            if (JSON.stringify(prev) !== JSON.stringify(synced)) {
              return synced;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Wishlist dynamic synchronization error:', error);
      }
    };

    syncWishlist();

    window.addEventListener('storage', syncWishlist);
    window.addEventListener('vaugun_settings_updated', syncWishlist);
    return () => {
      window.removeEventListener('storage', syncWishlist);
      window.removeEventListener('vaugun_settings_updated', syncWishlist);
    };
  }, []);

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const pId = product.id || product._id;
      const isExist = prev.find((item) => (item.id || item._id) === pId);
      if (isExist) {
        return prev.filter((item) => (item.id || item._id) !== pId);
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => (item.id || item._id) === productId);
  };

  const removeFromWishlist = (productId) => {
    setWishlist((prev) => prev.filter((item) => (item.id || item._id) !== productId));
  };

  const getWishlistCount = () => wishlist.length;

  return (
    <WishlistContext.Provider value={{ 
      wishlist, 
      toggleWishlist, 
      isInWishlist, 
      removeFromWishlist, 
      getWishlistCount 
    }}>
      {children}
    </WishlistContext.Provider>
  );
};
