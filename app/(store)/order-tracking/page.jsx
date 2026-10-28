'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedTitle from '@/components/AnimatedTitle';
import { Truck, Search, CheckCircle2, Package, MapPin, Calendar, HelpCircle, ArrowRight, FileText, ShoppingBag, Clock } from 'lucide-react';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';
import { API_BASE_URL } from '@/config';
import { useNavigate } from '@/hooks/useRouterShim';

const OrderTracking = () => {
  const navigate = useNavigate();
  const [trackingSettings, setTrackingSettings] = useState({
    heroTitle: "Track Your Sacred Shipment",
    heroSubtitle: "Follow the consecrated journey of your authentic spiritual wearables from our sanctum to your home.",
    step1Title: "Sanctified & Packed with Care",
    step1Desc: "Your order is consecrated, energized, and safely packed in protective devotional packaging.",
    step2Title: "Dispatched via Express Courier",
    step2Desc: "Shipped swiftly via trusted express courier partners across India.",
    step3Title: "Out for Sacred Delivery",
    step3Desc: "Our courier partner is en route to deliver divine blessings directly to your doorstep.",
    faqQuestion: "How are spiritual products energized before shipping?",
    faqAnswer: "All sacred malas and wearables undergo authentic Vedic Prana Pratishtha rituals by our priests prior to careful devotional packaging and dispatch."
  });

  const [trackingId, setTrackingId] = useState('');
  const [trackingPhone, setTrackingPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundOrder, setFoundOrder] = useState(null);
  const [localOrders, setLocalOrders] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useDocumentSEO({
    title: 'Track Your Sacred Order | DAIVIKA by Zodimithra',
    description: 'Track the consecrated journey of your DAIVIKA order. Follow the real-time shipment of your Karungali mala, Rudraksha, and spiritual wearables.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Track Your Sacred Order - DAIVIKA",
      "description": "Real-time parcel tracking and consecrated shipping status for DAIVIKA spiritual orders."
    }
  });

  // Load tracking settings & local guest orders on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('vaugun_tracking_settings');
        if (saved) {
          setTrackingSettings(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadSettings();
    window.addEventListener('vaugun_settings_updated', loadSettings);

    // Read stored guest & user orders from localStorage
    try {
      const savedOrdersStr = localStorage.getItem('vaugun_orders');
      if (savedOrdersStr) {
        const parsed = JSON.parse(savedOrdersStr);
        if (Array.isArray(parsed)) {
          setLocalOrders(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not read local orders:', err);
    }

    return () => window.removeEventListener('vaugun_settings_updated', loadSettings);
  }, []);

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    const query = trackingId.trim();
    if (!query) return;

    setLoading(true);
    setSearchError('');
    setFoundOrder(null);
    setSearched(false);

    const queryLower = query.toLowerCase();

    // 1. First check local storage orders (Guest + User placed on this browser)
    const queryDigits = query.replace(/\D/g, '');
    const localMatch = localOrders.find(o =>
      (o._id && o._id.toLowerCase() === queryLower) ||
      (o.invoiceNumber && o.invoiceNumber.toLowerCase() === queryLower) ||
      (queryDigits.length >= 10 && o.phone && o.phone.replace(/\D/g, '').endsWith(queryDigits.slice(-10))) ||
      (o.email && o.email.toLowerCase() === queryLower)
    );

    if (localMatch) {
      setFoundOrder(localMatch);
      setSearched(true);
      setLoading(false);
      return;
    }

    // 2. Ask the server (needs the order ID / invoice number and the mobile number on the order)
    const phone = trackingPhone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) {
      setSearchError('Enter the 10-digit mobile number you used when placing the order.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/orders/track?ref=${encodeURIComponent(query)}&phone=${phone}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setFoundOrder(json.data);
        setSearched(true);
      } else {
        setSearchError(json.message || 'No order found with these details. Please check your order ID and mobile number.');
      }
    } catch (err) {
      console.warn('Order tracking lookup failed', err);
      setSearchError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('deliver') || s.includes('complete')) return 3;
    if (s.includes('ship') || s.includes('transit') || s.includes('dispatch')) return 2;
    return 1;
  };

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <main style={{ paddingTop: isMobile ? '1rem' : '7rem', paddingBottom: '6rem' }}>
        <div className="container" style={{ paddingLeft: '1rem', paddingRight: '1rem', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
            <Breadcrumbs items={[{ name: 'Order Tracking', url: '/order-tracking' }]} />

            {/* Header */}
            <div style={{ marginBottom: '2.5rem', textAlign: 'center', width: '100%' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#360910', marginBottom: '0.75rem' }}>
                  📦 CONCIERGE & ORDER STATUS
                </div>
                <AnimatedTitle
                  text={trackingSettings.heroTitle}
                  style={{
                    fontSize: 'clamp(1.6rem, 5.5vw, 2.6rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    marginBottom: '1rem',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1.25,
                    wordBreak: 'break-word'
                  }}
                />
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '620px', margin: '0 auto', padding: '0 0.5rem' }}>
                  {trackingSettings.heroSubtitle}
                </p>
              </motion.div>
            </div>

            {/* Tracking Search Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                padding: '1.25rem 1rem',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.05)',
                marginBottom: '2.5rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <form onSubmit={handleTrack} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%' }}>
                <div style={{ position: 'relative', flex: '1 1 220px', width: '100%', minWidth: 0 }}>
                  <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    required
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="Order ID or invoice number"
                    aria-label="Order ID or invoice number"
                    style={{
                      width: '100%',
                      padding: '0.85rem 0.85rem 0.85rem 2.8rem',
                      borderRadius: '14px',
                      border: '2px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      backgroundColor: '#fff',
                      textOverflow: 'ellipsis'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#360910'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={trackingPhone}
                  onChange={(e) => setTrackingPhone(e.target.value)}
                  placeholder="Mobile number used for the order"
                  aria-label="Mobile number used for the order"
                  style={{
                    flex: '1 1 200px',
                    width: '100%',
                    minWidth: 0,
                    padding: '0.85rem 1rem',
                    borderRadius: '14px',
                    border: '2px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#360910'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: '1 1 auto',
                    width: '100%',
                    padding: '0.85rem 1.5rem',
                    background: 'linear-gradient(135deg, #360910 0%, #54111c 100%)',
                    color: '#fff',
                    borderRadius: '14px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(54, 9, 16, 0.35)'
                  }}
                >
                  {loading ? 'Locating Package...' : 'Track Package'}
                </button>
              </form>
              {searchError && (
                <div role="alert" style={{ marginTop: '0.85rem', padding: '0.75rem 1rem', borderRadius: '12px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                  {searchError}
                </div>
              )}
            </motion.div>

            {/* Live Tracking Status Results */}
            {searched && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  padding: 'clamp(1.25rem, 4vw, 2.5rem)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.05)',
                  marginBottom: '2.5rem',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Order Reference</span>
                    <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                      #{foundOrder?._id || trackingId.toUpperCase()}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '50px',
                      backgroundColor: '#fce7eb',
                      color: '#360910',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      border: '1px solid #f8b4c0'
                    }}>
                      {foundOrder?.status || 'Processing'}
                    </span>
                    {foundOrder?.total && (
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{foundOrder.total}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', paddingLeft: '2.5rem' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: '15px', top: '15px', bottom: '15px', width: '2px', backgroundColor: '#e2e8f0', zIndex: 1 }} />

                  {/* Step 1 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-35px', top: '2px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {trackingSettings.step1Title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                      {trackingSettings.step1Desc}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.35rem', fontWeight: 700 }}>Confirmed & Processed</div>
                  </div>

                  {/* Step 2 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-35px', top: '2px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: getStepProgress(foundOrder?.status) >= 2 ? '#360910' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>
                      {getStepProgress(foundOrder?.status) >= 2 ? '✓' : '•'}
                    </div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {trackingSettings.step2Title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                      {trackingSettings.step2Desc}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: getStepProgress(foundOrder?.status) >= 2 ? '#360910' : '#94a3b8', marginTop: '0.35rem', fontWeight: 700 }}>
                      {getStepProgress(foundOrder?.status) >= 2 ? 'In Transit with Express Courier' : 'Preparing for Dispatch'}
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ position: 'relative', opacity: getStepProgress(foundOrder?.status) >= 3 ? 1 : 0.6 }}>
                    <div style={{ position: 'absolute', left: '-35px', top: '2px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: getStepProgress(foundOrder?.status) >= 3 ? '#16a34a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: getStepProgress(foundOrder?.status) >= 3 ? '#fff' : '#94a3b8', fontSize: '0.75rem', fontWeight: 900 }}>
                      {getStepProgress(foundOrder?.status) >= 3 ? '✓' : '•'}
                    </div>
                    <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {trackingSettings.step3Title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                      {trackingSettings.step3Desc}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', fontWeight: 700 }}>
                      {getStepProgress(foundOrder?.status) >= 3 ? 'Delivered' : 'Pending Final Delivery'}
                    </div>
                  </div>
                </div>

                {/* Items in Order */}
                {foundOrder?.itemsList && foundOrder.itemsList.length > 0 && (
                  <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>Items in Parcel</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {foundOrder.itemsList.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#ffffff' }}>
                            <img src={typeof item.image === 'string' ? item.image : (item.image?.url || '/logo.png')} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h6 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {(item.isFreeGift || (item.price === 0 && (item.name?.toLowerCase().includes('gift') || item.productId?.includes('gift')))) && (
                                <span style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800 }}>🎁 FREE GIFT</span>
                              )}
                              {item.name}
                            </h6>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                              Qty: {item.qty} {item.size ? `• Size: ${item.size}` : ''} {item.color ? `• Color: ${item.color}` : ''}
                            </p>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: (item.isFreeGift || item.price === 0) ? '#059669' : '#0f172a' }}>
                            {(item.isFreeGift || item.price === 0) ? 'FREE (₹0)' : `₹${item.price}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Recent Orders List (For Guests & Logged-in Users) */}
            {localOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  padding: 'clamp(1.25rem, 4vw, 2rem)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.05)',
                  marginBottom: '2.5rem',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShoppingBag size={20} color="#360910" /> Your Recent Orders
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {localOrders.length} Order(s) Saved
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {localOrders.slice(0, 5).map((order) => (
                    <div
                      key={order._id}
                      onClick={() => {
                        setTrackingId(order._id);
                        setFoundOrder(order);
                        setSearched(true);
                        window.scrollTo({ top: 350, behavior: 'smooth' });
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderRadius: '16px',
                        border: '1.5px solid #f1f5f9',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#360910'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                            Order #{order._id}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '50px',
                            backgroundColor: '#fce7eb',
                            color: '#360910',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {order.status || 'Processing'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={13} color="#94a3b8" />
                          <span>{order.date || 'Recent'}</span>
                          <span>•</span>
                          <span>{order.itemsList?.length || 1} Item(s)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            ₹{order.total}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                            {order.paymentMethod || 'COD'}
                          </div>
                        </div>
                        <ArrowRight size={18} color="#360910" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Helper Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '3rem'
              }}
            >
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} color="#360910" /> {trackingSettings.faqQuestion}
              </h4>
              <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
                {trackingSettings.faqAnswer}
              </p>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
