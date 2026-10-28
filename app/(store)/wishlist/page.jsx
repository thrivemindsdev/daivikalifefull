'use client';

import React from 'react';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link } from '@/hooks/useRouterShim';
import { useAuth } from '@/context/AuthContext';

const Wishlist = () => {
  const { wishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="container wishlist-guest-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            maxWidth: '500px',
            textAlign: 'center',
            padding: 'clamp(3rem, 8vw, 4rem) clamp(1.5rem, 5vw, 4rem) clamp(4rem, 10vw, 5rem)',
            backgroundColor: '#fff',
            borderRadius: '40px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.05)',
            border: '1px solid #f0f0f0'
          }}
        >
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: '#fdfbf9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 2rem'
          }}>
            <Heart size={32} color="var(--color-primary)" fill="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: '#111' }}>Wishlist Access</h2>
          <p style={{ color: '#666', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
            Please log in to your account to view and manage your saved items.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '1.25rem 2.5rem', borderRadius: '16px', fontWeight: 800 }}>
            Sign In to Continue
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>My Wishlist</h1>
        <p style={{ color: '#888', fontSize: '1.1rem' }}>Items you've saved for later.</p>
      </div>

      {wishlist.length > 0 ? (
        <div className="grid-4">
          <AnimatePresence>
            {wishlist.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '5rem 0' }}
        >
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            backgroundColor: '#f5f5f5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 2rem'
          }}>
            <Heart size={40} color="#ccc" />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your wishlist is empty</h3>
          <p style={{ color: '#888', marginBottom: '2.5rem' }}>Start adding items you love to your wishlist!</p>
          <Link to="/products" className="btn btn-primary">
            Explore Collection
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default Wishlist;
