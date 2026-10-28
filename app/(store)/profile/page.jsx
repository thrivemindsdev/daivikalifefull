'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import SearchableSelect from '@/components/SearchableSelect';
import { getDistricts } from '@/lib/india-districts';
import usePincodeLookup from '@/hooks/usePincodeLookup';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Shield, ShieldCheck, Heart, ShoppingBag, Lock, Camera,
  LogOut, CheckCircle, CheckCircle2, Clock, Trash2, ArrowRight,
  Settings, CreditCard, MapPin, Bell, HelpCircle, ChevronRight,
  Package, Truck, RefreshCcw, X, Check, AlertTriangle,
  Edit2, Plus, Star, Home, Briefcase, Phone, ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { Link, useLocation } from '@/hooks/useRouterShim';
import { API_BASE_URL } from '@/config';

export default function Profile() {
  const { user, logout, updateAvatar, updateProfile, updatePassword } = useAuth();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'content'
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab && ['profile', 'orders', 'wishlist', 'security', 'addresses'].includes(tab)) {
        setActiveTab(tab);
        if (window.innerWidth < 768) {
          setMobileView('content');
        }
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [hoveredStar, setHoveredStar] = useState({ orderId: null, itemId: null, star: 0 });
  const [ratings, setRatings] = useState({});
  const fileInputRef = useRef(null);
  const addressFormRef = useRef(null);

  // States for Profile Forms
  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user?.name]);

  // Dynamic Customer Orders state
  const [ordersList, setOrdersList] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState({ show: false, itemId: null, itemName: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ── Saved Addresses State ─────────────────────────────────────────
  const indianStatesList = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const getPossibleAddrKeys = () => {
    if (!user) return [];
    const keys = [];
    if (user.email) {
      keys.push(`daivika_addresses_${user.email}`);
      keys.push(`daivika_addresses_${user.email.toLowerCase()}`);
    }
    if (user.phone) {
      keys.push(`daivika_addresses_${user.phone}`);
    }
    if (user._id || user.id) {
      keys.push(`daivika_addresses_${user._id || user.id}`);
    }
    return Array.from(new Set(keys));
  };

  const loadAddresses = () => {
    if (!user) return [];
    let combined = [];

    // 1. Load from all possible localStorage address keys
    const possibleKeys = getPossibleAddrKeys();
    possibleKeys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed)) {
            combined = [...combined, ...parsed];
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    // 2. Also extract addresses from past orders placed by the user
    try {
      const allOrders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
      const userOrders = allOrders.filter(o =>
        (user.email && o.email?.toLowerCase() === user.email.toLowerCase()) ||
        (user.phone && o.phone === user.phone) ||
        (user._id && o.userId === user._id)
      );

      userOrders.forEach(o => {
        if (o.address && (o.address.street || o.address.addressLine1 || o.address.city)) {
          const street = o.address.street || o.address.addressLine1 || '';
          const city = o.address.city || '';
          const state = o.address.state || '';
          const pincode = o.address.pincode || o.address.zipCode || '';

          if (street || city) {
            const userNameParts = (o.user || '').trim().split(' ');
            combined.push({
              id: `order_addr_${o._id || Date.now()}`,
              label: 'Checkout Address',
              firstName: userNameParts[0] || '',
              lastName: userNameParts.slice(1).join(' ') || '',
              phone: o.phone || user.phone || '',
              email: o.email || user.email || '',
              street,
              city,
              state,
              pincode,
              isDefault: false
            });
          }
        }
      });
    } catch (e) {
      console.error('Error extracting addresses from orders:', e);
    }

    // Deduplicate addresses based on street + city + pincode
    const uniqueMap = new Map();
    combined.forEach(addr => {
      const key = `${(addr.street || '').trim().toLowerCase()}_${(addr.city || '').trim().toLowerCase()}_${(addr.pincode || '').trim()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, addr);
      }
    });

    return Array.from(uniqueMap.values());
  };

  const saveAddresses = (list) => {
    if (!user) return;
    const possibleKeys = getPossibleAddrKeys();
    possibleKeys.forEach(key => {
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
    });
    setAddresses(list);
  };

  const emptyAddrForm = { label: 'Home', firstName: '', lastName: '', phone: '', email: user?.email || '', street: '', city: '', state: '', district: '', pincode: '' };

  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addrForm, setAddrForm] = useState(emptyAddrForm);
  const [addrStateDropOpen, setAddrStateDropOpen] = useState(false);
  const [addrStateSearch, setAddrStateSearch] = useState('');
  const [addrFormError, setAddrFormError] = useState('');
  const addrPin = usePincodeLookup();
  const addrAutoCity = useRef('');

  // Typing the PIN code fills state, district and city (city only if empty or filled by an earlier lookup)
  const handleAddrPincode = (value) => {
    const pin = value.replace(/\D/g, '').slice(0, 6);
    setAddrForm(f => ({ ...f, pincode: pin }));
    addrPin.lookup(pin, (found) => {
      setAddrForm(f => {
        const keepCity = f.city.trim() && f.city !== addrAutoCity.current;
        if (found.city && !keepCity) addrAutoCity.current = found.city;
        return {
          ...f,
          ...(found.state ? { state: found.state, district: found.district || '' } : {}),
          ...(found.city && !keepCity ? { city: found.city } : {}),
        };
      });
    });
  };

  // Address form, after the street: PIN code first, then city, state and district (filled from the PIN code)
  const addrInputStyle = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' };
  const addrLabelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' };
  const renderAddrLocationFields = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={addrLabelStyle}>PIN Code *</label>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="670001" value={addrForm.pincode}
            onChange={e => handleAddrPincode(e.target.value)}
            style={addrInputStyle}
            onFocus={e => e.target.style.borderColor = '#0a0a0a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          {addrPin.message && (
            <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: addrPin.status === 'error' ? '#dc2626' : '#6b7280' }}>{addrPin.message}</div>
          )}
        </div>
        <div>
          <label style={addrLabelStyle}>City / Town *</label>
          <input type="text" placeholder="Kochi" value={addrForm.city}
            onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
            style={addrInputStyle}
            onFocus={e => e.target.style.borderColor = '#0a0a0a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <label style={addrLabelStyle}>State *</label>
          <div
            onClick={() => setAddrStateDropOpen(o => !o)}
            style={{
              padding: '0.6rem 0.85rem', borderRadius: '8px',
              border: `1.5px solid ${addrStateDropOpen ? '#0a0a0a' : '#e2e8f0'}`,
              backgroundColor: '#fff', fontSize: '0.88rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: addrForm.state ? '#111827' : '#9ca3af', userSelect: 'none'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addrForm.state || 'Select State'}</span>
            <ChevronDownIcon size={14} color="#9ca3af" style={{ transform: addrStateDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
          </div>
          {addrStateDropOpen && (
            <>
              <div onClick={() => { setAddrStateDropOpen(false); setAddrStateSearch(''); }} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 999,
                maxHeight: '220px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '200px'
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <input
                    type="text" placeholder="Search state..." autoFocus
                    value={addrStateSearch}
                    onChange={e => setAddrStateSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '100%', padding: '0.35rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {indianStatesList
                    .filter(s => s.toLowerCase().includes(addrStateSearch.toLowerCase()))
                    .map(s => (
                      <div
                        key={s}
                        onClick={e => { e.stopPropagation(); setAddrForm(f => ({ ...f, state: s, district: s === f.state ? f.district : '' })); setAddrStateDropOpen(false); setAddrStateSearch(''); }}
                        style={{
                          padding: '0.55rem 0.85rem', fontSize: '0.85rem', cursor: 'pointer',
                          backgroundColor: addrForm.state === s ? '#f0fdf4' : 'transparent',
                          color: addrForm.state === s ? '#16a34a' : '#374151',
                          fontWeight: addrForm.state === s ? 700 : 500
                        }}
                        onMouseEnter={e => { if (addrForm.state !== s) e.target.style.backgroundColor = '#f9fafb'; }}
                        onMouseLeave={e => { if (addrForm.state !== s) e.target.style.backgroundColor = 'transparent'; }}
                      >{s}</div>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
        {/* District (used to ship from the nearest store) */}
        <div>
          <label style={addrLabelStyle}>District *</label>
          <SearchableSelect
            value={addrForm.district || ''}
            onChange={d => setAddrForm(f => ({ ...f, district: d }))}
            options={getDistricts(addrForm.state)}
            placeholder="Select District"
            searchPlaceholder="Search district..."
            emptyText="No matching districts found"
            disabled={!addrForm.state}
            disabledText="Select state first"
          />
        </div>
      </div>
    </>
  );

  useEffect(() => {
    setAddresses(loadAddresses());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrForm({ ...emptyAddrForm, email: user?.email || '' });
    setAddrFormError('');
    addrPin.lookup('');
    addrAutoCity.current = '';
    setShowAddressForm(true);
    setTimeout(() => {
      if (addressFormRef.current) {
        addressFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddrForm({ label: addr.label, firstName: addr.firstName, lastName: addr.lastName, phone: addr.phone, email: addr.email, street: addr.street, city: addr.city, state: addr.state, district: addr.district || '', pincode: addr.pincode });
    setAddrFormError('');
    addrPin.lookup('');
    addrAutoCity.current = '';
    setShowAddressForm(true);
    setTimeout(() => {
      if (addressFormRef.current) {
        addressFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  };

  const handleSaveAddress = () => {
    const { label, firstName, lastName, phone, street, city, state: st, district, pincode } = addrForm;
    if (!label || !firstName || !phone || !street || !city || !st || !district || !pincode) {
      setAddrFormError('Please fill all required fields (*).');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setAddrFormError('Enter a valid 10-digit phone number.');
      return;
    }
    setAddrFormError('');
    const existing = loadAddresses();
    if (editingAddressId) {
      const updated = existing.map(a => a.id === editingAddressId ? { ...a, ...addrForm } : a);
      saveAddresses(updated);
    } else {
      const newAddr = { id: `addr_${Date.now()}`, ...addrForm, isDefault: existing.length === 0 };
      saveAddresses([...existing, newAddr]);
    }
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const handleDeleteAddress = (id) => {
    const existing = loadAddresses();
    const filtered = existing.filter(a => a.id !== id);
    if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
      filtered[0].isDefault = true;
    }
    saveAddresses(filtered);
  };

  const handleSetDefault = (id) => {
    const existing = loadAddresses();
    saveAddresses(existing.map(a => ({ ...a, isDefault: a.id === id })));
  };

  // Fetch submitted reviews from MongoDB API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reviews`);
        const data = await res.json();
        if (data.success) {
          const initialRatings = {};
          data.data.forEach(rev => {
            if (rev.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim()) {
              initialRatings[`${rev.orderId}-${rev.productName}`] = {
                rating: rev.rating,
                comment: rev.comment,
                submitted: true
              };
            }
          });
          setRatings(initialRatings);
        }
      } catch (err) {
        console.error("Error loading reviews from database:", err);
      }
    };
    if (user?.email) {
      fetchReviews();
    }
  }, [user?.email, ordersList]);

  useEffect(() => {
    const syncAndFetchOrders = async () => {
      if (!user) return;

      let localOrders = [];
      const saved = localStorage.getItem('vaugun_orders');
      if (saved) {
        try {
          localOrders = JSON.parse(saved);
        } catch (e) {
          console.error("Error parsing local orders:", e);
        }
      }

      const userEmail = user.email ? user.email.toLowerCase().trim() : '';
      const userPhone = user.phone ? user.phone.trim() : '';
      const userLocalOrders = localOrders.filter(o => {
        const orderEmail = o.email?.toLowerCase().trim();
        const orderPhone = o.phone?.trim();
        return (userEmail && orderEmail === userEmail) || (userPhone && orderPhone === userPhone);
      });

      const token = localStorage.getItem('vaugun_token');

      try {
        // Step 1: Sync local orders to backend to link guest orders to this account
        await fetch(`${API_BASE_URL}/orders/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ orders: userLocalOrders })
        }).catch(() => {});

        // Step 2: Directly fetch ALL confirmed orders from DB as source of truth
        // This catches orders from other devices or when localStorage is cleared
        const getRes = await fetch(`${API_BASE_URL}/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        const getResult = await getRes.json();

        const allDbOrders = Array.isArray(getResult)
          ? getResult
          : (getResult.success && Array.isArray(getResult.data) ? getResult.data : []);

        if (getRes.ok && allDbOrders.length >= 0) {

          // Also include confirmed local-only orders not yet in DB
          const dbIds = new Set(allDbOrders.map(o => (o._id || o.id || '').toString()));
          const localOnlyConfirmed = userLocalOrders.filter(o => {
            const oid = (o._id || o.id || '').toString();
            const payStatus = (o.paymentStatus || '').toLowerCase();
            const payMethod = (o.paymentMethod || '').toLowerCase();
            const status = (o.status || '').toLowerCase();
            const isConfirmed = status !== 'pending payment' && payStatus !== 'pending' &&
              (payStatus === 'paid' || payStatus === 'partially paid' ||
               payMethod.includes('cash on delivery') || payMethod.includes('cashfree') ||
               payMethod.includes('razorpay'));
            return !dbIds.has(oid) && isConfirmed;
          });

          const finalOrders = [...allDbOrders, ...localOnlyConfirmed];

          // Update localStorage with the most complete merged picture
          const otherLocalOrders = localOrders.filter(o => {
            const orderEmail = o.email?.toLowerCase().trim();
            const orderPhone = o.phone?.trim();
            return !((userEmail && orderEmail === userEmail) || (userPhone && orderPhone === userPhone));
          });
          localStorage.setItem('vaugun_orders', JSON.stringify([...finalOrders, ...otherLocalOrders]));
          setOrdersList(finalOrders);
          return;
        }
      } catch (err) {
        console.warn("Backend order fetch failed, falling back to localStorage:", err.message);
      }

      // Offline/Fallback: only show confirmed orders from localStorage
      const filtered = userLocalOrders.filter(o => {
        const payStatus = (o.paymentStatus || '').toLowerCase();
        const payMethod = (o.paymentMethod || '').toLowerCase();
        const status = (o.status || '').toLowerCase();
        return (
          status !== 'pending payment' &&
          payStatus !== 'pending' &&
          (payStatus === 'paid' || payStatus === 'partially paid' ||
           payMethod.includes('cash on delivery') || payMethod.includes('cashfree') ||
           payMethod.includes('razorpay'))
        );
      });
      setOrdersList(filtered);
    };

    syncAndFetchOrders();

    // Listen for storage events so newly placed orders appear immediately after checkout
    const handleStorageUpdate = () => syncAndFetchOrders();
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [activeTab, user?.email, user?.phone]);

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file' });
      return;
    }

    setUploading(true);
    setMessage({ type: 'info', text: 'Updating your profile picture...' });

    const result = await updateAvatar(file);
    setUploading(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile picture updated!' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Upload failed' });
    }

    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName || !profileName.trim()) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return;
    }

    setMessage({ type: 'info', text: 'Saving profile updates...' });
    const result = await updateProfile(profileName.trim());

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile information updated successfully.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Please fill in both current and new password fields.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'New password must be different from your current password.' });
      return;
    }

    setMessage({ type: 'info', text: 'Verifying credentials and updating password...' });
    const result = await updatePassword(currentPassword, newPassword);

    if (result && result.success) {
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage({ type: 'error', text: result?.error || 'Failed to update password. Please check your current password.' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  const handleConfirmRemove = (id, name) => {
    setShowConfirmModal({ show: true, itemId: id, itemName: name });
  };

  const executeRemove = () => {
    removeFromWishlist(showConfirmModal.itemId);
    setShowConfirmModal({ show: false, itemId: null, itemName: '' });
    setMessage({ type: 'success', text: 'Item removed from wishlist.' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleRateItem = async (orderId, productName, ratingVal, commentVal = '') => {
    // Optimistically set status
    setRatings(prev => ({
      ...prev,
      [`${orderId}-${productName}`]: {
        rating: ratingVal,
        comment: commentVal,
        submitting: true
      }
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: user?.name || 'Customer',
          email: user?.email,
          productName,
          rating: ratingVal,
          comment: commentVal,
          orderId
        })
      });
      const data = await res.json();
      if (data.success) {
        setRatings(prev => ({
          ...prev,
          [`${orderId}-${productName}`]: {
            rating: ratingVal,
            comment: commentVal,
            submitted: true
          }
        }));
        setMessage({ type: 'success', text: 'Review submitted successfully!' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to submit review' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Server error submitting review' });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const generateInvoicePDF = async (order) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    const settings = order.companyDetails || JSON.parse(localStorage.getItem('vaugun_invoice_settings')) || {
      companyName: 'DAIVIKA Store',
      companyStreet: 'Mullonkal building, Therthally, Alakode',
      companyCity: 'Kannur',
      companyState: 'Kerala',
      companyPin: '670571',
      companyEmail: 'support@daivika.in',
      companyPhone: '+91 7736030808, +91 7736030809'
    };

    // Header
    doc.setFontSize(20);
    doc.setTextColor(10, 10, 10); // #0a0a0a
    doc.text(settings.companyName, 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text([
      settings.companyStreet,
      `${settings.companyCity}, ${settings.companyState} - ${settings.companyPin}`,
      `Email: ${settings.companyEmail}`,
      `Phone: ${settings.companyPhone}`
    ], 20, 30);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('TAX INVOICE', 190, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.text(`Invoice No: ${order.invoiceNumber || 'N/A'}`, 190, 30, { align: 'right' });
    doc.text(`Date: ${order.date}`, 190, 35, { align: 'right' });
    doc.text(`Order ID: ${order._id}`, 190, 40, { align: 'right' });

    // Billing Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text([
      order.user,
      order.address?.street || '',
      `${order.address?.city || ''}, ${order.address?.state || ''}`,
      `PIN: ${order.address?.pincode || ''}`,
      `Country: India`,
      `Phone: ${order.phone || ''}`
    ], 20, 65);

    // Clean Malayalam / non-ASCII characters from PDF print to avoid garbage characters
    const cleanItemName = (name) => {
      if (!name) return '';
      let cleaned = name.replace(/[^\x00-\x7F]/g, '');
      cleaned = cleaned.replace(/\(\s*\)/g, ''); // Remove empty parentheses
      cleaned = cleaned.replace(/\s+/g, ' ').trim(); // Collapse spaces
      return cleaned;
    };

    // Items Table
    const tableData = order.itemsList.map(item => {
      let displayName = cleanItemName(item.name);
      const isGift = item.isFreeGift || (item.price === 0 && (item.name?.toLowerCase().includes('gift') || item.productId?.includes('gift')));
      if (isGift && !displayName.includes('FREE GIFT')) {
        displayName = `[FREE GIFT 🎁] ${displayName}`;
      }
      const sizeText = item.size ? `Size: ${item.size}` : '';
      const colorText = item.color ? `Color: ${item.color}` : '';
      const meta = [sizeText, colorText].filter(Boolean).join(' | ');
      if (meta && !displayName.includes('(')) {
        displayName += `\n(${meta})`;
      }
      return [
        displayName,
        item.qty || 1,
        isGift ? 'FREE (INR 0)' : `INR ${item.price?.toLocaleString()}`,
        isGift ? 'INR 0' : `INR ${(item.price * (item.qty || 1)).toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['Item Details', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      headStyles: { fillColor: [10, 10, 10] },
      margin: { left: 20, right: 20 },
    });

    // Summary
    const itemsSubtotal = order.itemsList ? order.itemsList.reduce((acc, item) => acc + (item.price * (item.qty || 1)), 0) : 0;
    const discountVal = order.discount !== undefined && order.discount !== null ? order.discount : Math.max(0, itemsSubtotal + (order.shippingCharge || 0) - order.total);

    const finalY = (doc).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    
    let currentY = finalY;
    doc.text(`Subtotal: INR ${itemsSubtotal.toLocaleString('en-IN')}`, 190, currentY, { align: 'right' });
    
    if (discountVal > 0) {
      currentY += 5;
      const couponLabel = order.couponCode ? `Coupon Discount (${order.couponCode})` : 'Discount';
      doc.text(`${couponLabel}: -INR ${discountVal.toLocaleString('en-IN')}`, 190, currentY, { align: 'right' });
    }
    
    currentY += 5;
    doc.text(`Shipping: ${order.shippingCharge > 0 ? 'INR ' + order.shippingCharge.toLocaleString('en-IN') : 'FREE'}`, 190, currentY, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text(`Total Due: INR ${order.total?.toLocaleString('en-IN')}`, 190, currentY + 10, { align: 'right' });

    doc.save(`Invoice_${order.invoiceNumber || order._id}.pdf`);
    setMessage({ type: 'success', text: 'Invoice downloaded successfully!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const filteredOrders = ordersList.filter(order => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      order._id.toLowerCase().includes(query) ||
      order.itemsList?.some(item => item.name.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const menuItems = [
    { id: 'profile', name: 'Account Settings', icon: <User size={20} />, desc: 'Manage your name and identity' },
    { id: 'orders', name: 'My Orders', icon: <Package size={20} />, desc: 'Track and view your purchases' },
    { id: 'addresses', name: 'Saved Addresses', icon: <MapPin size={20} />, desc: 'Manage your delivery addresses', count: addresses.length || 0 },
    { id: 'wishlist', name: 'Wishlist', icon: <Heart size={20} />, desc: 'Items you have saved for later', count: wishlist?.length || 0 },
    { id: 'security', name: 'Privacy & Security', icon: <Shield size={20} />, desc: 'Passwords and authentication' },
  ];

  if (!user) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#faf8f5',
        fontFamily: '"Poppins", sans-serif'
      }}>
        <div style={{
          maxWidth: '450px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '3rem 2.2rem',
          boxShadow: '0 20px 40px rgba(10, 10, 10, 0.05)',
          border: '1px solid rgba(10, 10, 10, 0.05)'
        }}>
          <ShoppingBag size={48} style={{ color: '#0a0a0a', marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0a0a0a', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            My Orders
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.5', marginBottom: '2rem' }}>
            You are currently viewing this page as a guest. Please login or register an account to track, view, and manage your orders permanently.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to="/login"
              style={{
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '100px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'block',
                boxShadow: '0 8px 20px rgba(10, 10, 10, 0.15)',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              Login / Register
            </Link>
            <Link
              to="/"
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '100px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'block',
                transition: 'all 0.2s',
                textAlign: 'center'
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper" style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b'
    }}>
      <div className="container" style={{ maxWidth: '1560px' }}>

        <style>{`
          .profile-layout-grid {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 2rem;
          }
          .profile-sticky-card {
            background-color: #fff;
            border-radius: 24px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
            position: sticky;
            top: 8rem;
          }
          .mobile-back-button {
            display: none;
          }
          .order-card-header {
            padding: 1.25rem 1.5rem;
            background-color: #fafafa;
            border-bottom: 1px solid #e2e8f0;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            align-items: center;
          }
          .order-card-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #fafafa;
          }
          .order-review-form-row {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
          }
          .order-modal-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #f1f5f9;
          }
          .order-modal-body {
            padding: 2rem;
          }
          @media (max-width: 992px) {
            .profile-layout-grid {
              grid-template-columns: 250px 1fr;
            }
          }
          @media (max-width: 768px) {
            .profile-layout-grid {
              grid-template-columns: 1fr;
            }
            .profile-sticky-card {
              position: static;
              box-shadow: none !important;
              border: 1px solid #e2e8f0;
            }
            .profile-sidebar-card-wrapper.hide-mobile {
              display: none !important;
            }
            .profile-main-content.hide-mobile {
              display: none !important;
            }
            .profile-main-content {
              padding: 1.5rem !important;
            }
            .mobile-back-button {
              display: flex;
            }
            .order-card-header {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1rem !important;
              padding: 1rem !important;
            }
            .order-card-footer {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 0.75rem !important;
              padding: 1rem !important;
            }
            .order-card-footer button {
              width: 100% !important;
              justify-content: center !important;
            }
            .order-review-form-row {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .order-review-form-row button {
              width: 100% !important;
            }
            .order-modal-body {
              padding: 1.25rem !important;
            }
            .order-modal-grid {
              padding-top: 1rem !important;
            }
          }
          @media (max-width: 600px) {
            .order-modal-grid {
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
          }
          @media (max-width: 480px) {
            .order-card-header {
              grid-template-columns: 1fr !important;
              gap: 0.75rem !important;
            }
            .order-modal-body {
              padding: 0.85rem !important;
            }
          }
        `}</style>
        <div className="profile-layout-grid">

          {/* LEFT SIDEBAR MENU */}
          <aside className={`profile-sidebar-card-wrapper ${mobileView === 'content' ? 'hide-mobile' : ''}`}>
            <div className="profile-sticky-card">
              {/* Profile Brief */}
              <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1rem' }}>
                  <div
                    onClick={handleAvatarClick}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '4px solid #fff',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                      position: 'relative'
                    }}
                  >
                    {user?.avatar && !user.avatar.includes('pravatar') ? (
                      <img
                        src={user.avatar}
                        alt={user?.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#0a0a0a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.2rem',
                        fontWeight: 900,
                        color: '#fff',
                        letterSpacing: '-1px',
                        userSelect: 'none',
                        fontFamily: '"Poppins", sans-serif'
                      }}>
                        {(user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <Camera size={20} color="#fff" />
                    </div>
                  </div>
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCcw size={20} className="animate-spin" color="#0a0a0a" />
                    </div>
                  )}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{user?.name}</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{user?.email}</p>
              </div>

              {/* Menu List */}
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileView('content');
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'instant' });
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: activeTab === item.id ? '#fdf8f5' : 'transparent',
                      color: activeTab === item.id ? '#0a0a0a' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ display: 'flex', color: activeTab === item.id ? '#0a0a0a' : '#94a3b8' }}>{item.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                    </div>
                    {item.count > 0 && (
                      <span style={{ backgroundColor: activeTab === item.id ? '#0a0a0a' : '#e2e8f0', color: activeTab === item.id ? '#fff' : '#475569', padding: '0.1rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>{item.count}</span>
                    )}
                  </button>
                ))}
              </nav>

              <button
                onClick={logout}
                style={{
                  marginTop: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #fee2e2',
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*"
            />
          </aside>

          {/* MAIN CONTENT AREA */}
          <main
            className={`profile-main-content ${mobileView === 'menu' ? 'hide-mobile' : ''}`}
            style={{
              backgroundColor: '#fff',
              borderRadius: '24px',
              padding: '2.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
              minHeight: '600px'
            }}
          >
            {/* Mobile Back to Menu button */}
            <div className="mobile-back-button" style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setMobileView('menu');
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f1f5f9',
                  border: 'none',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#0a0a0a',
                  cursor: 'pointer',
                  width: 'fit-content'
                }}
              >
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Menu
              </button>
            </div>
            {/* Global feedback message banner */}
            <AnimatePresence>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    borderRadius: '16px',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    backgroundColor: message.type === 'error' ? '#fef2f2' : message.type === 'success' ? '#f0fdf4' : '#f0f9ff',
                    color: message.type === 'error' ? '#b91c1c' : message.type === 'success' ? '#15803d' : '#0369a1',
                    border: `1px solid ${message.type === 'error' ? '#fca5a5' : message.type === 'success' ? '#86efac' : '#7dd3fc'}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}>
                    {message.type === 'error' ? (
                      <AlertTriangle size={18} />
                    ) : message.type === 'success' ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <RefreshCcw size={18} className="animate-spin" />
                    )}
                  </span>
                  <span style={{ flex: 1 }}>{message.text}</span>
                  <button
                    type="button"
                    onClick={() => setMessage({ type: '', text: '' })}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'inherit',
                      opacity: 0.6,
                      display: 'flex'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* PROFILE TAB */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Account Settings</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Update your personal information and profile details.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>
                          Full Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter your full name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Email Address</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', color: '#94a3b8', outline: 'none', cursor: 'not-allowed' }}
                        />
                      </div>
                    </div>

                    <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Phone Number</label>
                        <input
                          type="text"
                          placeholder="Not provided"
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                      <div className="input-group">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Date of Birth</label>
                        <input
                          type="date"
                          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1rem' }}>
                      <button
                        type="submit"
                        style={{ padding: '0.8rem 2rem', backgroundColor: '#0a0a0a', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10, 10, 10, 0.2)' }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ORDERS TAB (Flipkart Style) */}
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>My Orders</h2>
                  </div>

                  <div className="orders-search-filter-row">
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Search your order here"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.8rem 1.2rem',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#fff',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                      >
                        <Settings size={18} color={statusFilter !== 'All' ? '#0a0a0a' : '#94a3b8'} />
                        {statusFilter === 'All' ? 'Filters' : statusFilter}
                      </button>

                      <AnimatePresence>
                        {showFilterDropdown && (
                          <>
                            <div
                              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                              onClick={() => setShowFilterDropdown(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                width: '200px',
                                backgroundColor: '#fff',
                                borderRadius: '16px',
                                padding: '0.5rem',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                border: '1px solid #f1f5f9',
                                zIndex: 11,
                                overflow: 'hidden'
                              }}
                            >
                              {['All', 'Processing', 'Shipped', 'Delivered'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    setStatusFilter(status);
                                    setShowFilterDropdown(false);
                                  }}
                                  style={{
                                    display: 'flex',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: statusFilter === status ? '#fdf8f5' : 'transparent',
                                    color: statusFilter === status ? '#0a0a0a' : '#475569',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (statusFilter !== status) e.currentTarget.style.backgroundColor = '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (statusFilter !== status) e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  {status === 'All' ? 'All Orders' : status}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: '#f8fafc', borderRadius: '20px' }}>
                      <ShoppingBag size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>No orders found</h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Looks like you haven't placed any orders yet.</p>
                      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0a0a0a', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                        Start Shopping <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {filteredOrders.map((order) => {
                        const orderTotal = order.total || 0;

                        return (
                          <div key={order._id}
                            style={{
                              backgroundColor: order.status === 'Delivered' ? '#f0fdf4' : order.status === 'Shipped' ? '#fce7eb' : order.status === 'Packed' ? '#fdf2f4' : '#fffbeb',
                              borderRadius: '16px',
                              border: `1px solid ${order.status === 'Delivered' ? '#bbf7d0' : order.status === 'Shipped' ? '#f8b4c0' : order.status === 'Packed' ? '#fed7df' : '#fef08a'}`,
                              overflow: 'hidden',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)',
                              transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025)';
                            }}
                          >
                            {/* Card Header: Order Metadata */}
                            <div className="order-card-header" style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.45)',
                              borderBottom: `1px solid ${order.status === 'Delivered' ? '#bbf7d0' : order.status === 'Shipped' ? '#f8b4c0' : order.status === 'Packed' ? '#fed7df' : '#fef08a'}`,
                              backdropFilter: 'blur(4px)'
                            }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Order Placed</span>
                                <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                                  {new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Amount</span>
                                <div style={{ fontSize: '0.85rem', color: '#0a0a0a', fontWeight: 800 }}>
                                  ₹{orderTotal.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Ship To</span>
                                <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                                  {order.user}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Order ID</span>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
                                  #{order._id.split('_')[1] || order._id}
                                </div>
                              </div>
                            </div>

                            {(order.isPartialCod || order.paymentMethod === 'Cash on Delivery') && (
                              <div style={{
                                backgroundColor: '#fef3c7',
                                borderBottom: '1px solid #fde68a',
                                padding: '0.5rem 1.5rem',
                                fontSize: '0.78rem',
                                color: '#92400e',
                                fontWeight: 700,
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>💵 Cash on Delivery (30% Paid Online: ₹{(order.advanceAmount || Math.round(orderTotal * 0.3)).toLocaleString('en-IN')})</span>
                                <span>70% Remaining Due on Delivery: ₹{(order.remainingAmount || (orderTotal - Math.round(orderTotal * 0.3))).toLocaleString('en-IN')}</span>
                              </div>
                            )}

                            {/* Card Body: Items List */}
                            <div style={{ padding: '1.5rem' }}>
                              {order.itemsList?.map((item, i) => {
                                const reviewState = ratings[`${order._id}-${item.name}`] || {};
                                const ratingVal = reviewState.rating || 0;
                                const commentVal = reviewState.comment || '';

                                return (
                                  <div key={i} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    paddingBottom: i === order.itemsList.length - 1 ? 0 : '1.5rem',
                                    borderBottom: i === order.itemsList.length - 1 ? 'none' : '1px solid #f1f5f9',
                                    marginBottom: i === order.itemsList.length - 1 ? 0 : '1.5rem'
                                  }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                      {/* Product Image */}
                                      <div style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        border: '1px solid #f1f5f9',
                                        backgroundColor: '#f8fafc',
                                        flexShrink: 0
                                      }}>
                                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                      </div>

                                      {/* Item Description */}
                                      <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                          {(item.isFreeGift || (item.price === 0 && (item.name?.toLowerCase().includes('gift') || item.productId?.includes('gift')))) && (
                                            <span style={{
                                              backgroundColor: '#ecfdf5',
                                              color: '#059669',
                                              border: '1px solid #a7f3d0',
                                              padding: '2px 8px',
                                              borderRadius: '20px',
                                              fontSize: '0.72rem',
                                              fontWeight: 800,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '0.2rem'
                                            }}>
                                              🎁 FREE GIFT
                                            </span>
                                          )}
                                          {item.name}
                                        </h4>
                                        {(item.size || item.color) && (
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem', alignItems: 'center' }}>
                                            {item.size && (
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                backgroundColor: '#fff7ed',
                                                color: '#9a3412',
                                                border: '1px solid #fed7aa',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.2px'
                                              }}>
                                                📐 Size: {item.size}
                                              </span>
                                            )}
                                            {item.color && (
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                backgroundColor: '#fce7eb',
                                                color: '#360910',
                                                border: '1px solid #f8b4c0',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.2px'
                                              }}>
                                                🎨 Color: {item.color}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                                          <span>Qty: <strong>{item.qty || 1}</strong></span>
                                          <span>Price: <strong style={{ color: (item.isFreeGift || item.price === 0) ? '#059669' : '#1e293b' }}>{(item.isFreeGift || item.price === 0) ? 'FREE (₹0)' : `₹${item.price?.toLocaleString()}`}</strong></span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Inline Review Panel */}
                                    <div style={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                      borderRadius: '12px',
                                      padding: '1rem',
                                      border: `1px solid ${order.status === 'Delivered' ? '#bbf7d0' : order.status === 'Shipped' ? '#bfdbfe' : order.status === 'Packed' ? '#bae6fd' : '#fef08a'}`,
                                      marginTop: '0.5rem'
                                    }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0a0a0a' }}>
                                          {reviewState.submitted ? '✓ Rated & Reviewed:' : 'Rate & Review this product:'}
                                        </span>

                                        {/* Stars Row */}
                                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                                          {[1, 2, 3, 4, 5].map(star => {
                                            const isFilled = ratingVal >= star;
                                            return (
                                              <svg
                                                key={star}
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill={isFilled ? "#0a0a0a" : "none"}
                                                stroke={isFilled ? "#0a0a0a" : "#cbd5e1"}
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                style={{ cursor: reviewState.submitted ? 'default' : 'pointer', transition: 'all 0.2s' }}
                                                onClick={() => {
                                                  if (!reviewState.submitted) {
                                                    setRatings(prev => ({
                                                      ...prev,
                                                      [`${order._id}-${item.name}`]: {
                                                        ...prev[`${order._id}-${item.name}`],
                                                        rating: star
                                                      }
                                                    }));
                                                  }
                                                }}
                                              >
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                              </svg>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Text Comment and Submit Box */}
                                      {!reviewState.submitted ? (
                                        <div className="order-review-form-row">
                                          <input
                                            type="text"
                                            placeholder="Write a short review comment..."
                                            value={commentVal || ''}
                                            onChange={(e) => {
                                              setRatings(prev => ({
                                                ...prev,
                                                [`${order._id}-${item.name}`]: {
                                                  ...prev[`${order._id}-${item.name}`],
                                                  comment: e.target.value
                                                }
                                              }));
                                            }}
                                            style={{
                                              flex: 1,
                                              padding: '0.5rem 0.75rem',
                                              borderRadius: '8px',
                                              border: '1px solid #cbd5e1',
                                              fontSize: '0.8rem',
                                              outline: 'none'
                                            }}
                                          />
                                          <button
                                            disabled={!ratingVal || reviewState.submitting}
                                            onClick={() => handleRateItem(order._id, item.name, ratingVal, commentVal)}
                                            style={{
                                              padding: '0.5rem 1rem',
                                              backgroundColor: ratingVal ? '#0a0a0a' : '#cbd5e1',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '8px',
                                              fontSize: '0.8rem',
                                              fontWeight: 700,
                                              cursor: ratingVal ? 'pointer' : 'not-allowed',
                                              transition: 'all 0.2s'
                                            }}
                                          >
                                            {reviewState.submitting ? 'Submitting...' : 'Submit'}
                                          </button>
                                        </div>
                                      ) : (
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                                          "{commentVal || 'No comment added.'}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Card Footer: Status & Action */}
                            <div className="order-card-footer" style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.45)',
                              borderTop: `1px solid ${order.status === 'Delivered' ? '#bbf7d0' : order.status === 'Shipped' ? '#bfdbfe' : order.status === 'Packed' ? '#bae6fd' : '#fef08a'}`,
                              backdropFilter: 'blur(4px)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: order.status === 'Delivered' ? '#360910' : order.status === 'Shipped' ? '#54111c' : order.status === 'Packed' ? '#781928' : '#f59e0b'
                                }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                  Status: {order.status}
                                </span>
                              </div>

                              <button
                                onClick={() => setSelectedOrder(order)}
                                style={{
                                  padding: '0.5rem 1.25rem',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: '#374151',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                              >
                                View Details & Invoice <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* WISHLIST TAB */}
              {activeTab === 'wishlist' && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Wishlist</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Items you have saved to purchase later.</p>
                  </div>

                  {!wishlist || wishlist.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 2rem', backgroundColor: '#f8fafc', borderRadius: '20px' }}>
                      <Heart size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>Wishlist is empty</h4>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>Save items to your wishlist and they will appear here.</p>
                      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0a0a0a', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                        Browse Products <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '2rem' }}>
                      <AnimatePresence mode="popLayout">
                        {wishlist.map(item => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            whileHover={{ y: -5 }}
                            style={{
                              backgroundColor: '#fff',
                              borderRadius: '20px',
                              overflow: 'hidden',
                              border: '1px solid #f1f5f9',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                              position: 'relative'
                            }}
                          >
                            {/* Product Image Container */}
                            <div style={{ position: 'relative', height: '240px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1.5rem' }}
                              />

                              {/* Floating Remove Button */}
                              <button
                                onClick={() => handleConfirmRemove(item.id, item.name)}
                                style={{
                                  position: 'absolute',
                                  top: '0.75rem',
                                  right: '0.75rem',
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: 'rgba(255,255,255,0.9)',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                  backdropFilter: 'blur(4px)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'; e.currentTarget.style.color = '#ef4444'; }}
                              >
                                <Trash2 size={16} />
                              </button>

                              {/* Price Tag Badge */}
                              <div style={{
                                position: 'absolute',
                                bottom: '0.75rem',
                                left: '0.75rem',
                                backgroundColor: '#1e293b',
                                color: '#fff',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                              }}>
                                ₹{item.price?.toLocaleString()}
                              </div>
                            </div>

                            {/* Product Info */}
                            <div style={{ padding: '1.25rem' }}>
                              <div style={{ marginBottom: '1rem' }}>
                                <h4 style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 700,
                                  margin: '0 0 0.25rem 0',
                                  color: '#1e293b',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {item.name}
                                </h4>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                                <Link
                                  to={`/product/${item.id}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.7rem',
                                    backgroundColor: '#0a0a0a',
                                    color: '#fff',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    boxShadow: '0 4px 12px rgba(10, 10, 10, 0.2)',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  View Details
                                </Link>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#fff',
                                    color: '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#0a0a0a'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#475569'; }}
                                >
                                  <ShoppingBag size={20} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}

              {/* SECURITY TAB */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Privacy & Security</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage your password and account security settings.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                    <div className="input-group">
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#475569' }}>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ padding: '1.25rem', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ color: '#0ea5e9' }}><ShieldCheck size={24} /></div>
                      <div style={{ fontSize: '0.85rem', color: '#0369a1', lineHeight: '1.4' }}>
                        <strong>Two-Factor Authentication</strong> is not enabled yet. We recommend enabling it for better security.
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', marginTop: '1rem' }}>
                      <button
                        type="submit"
                        style={{ padding: '0.8rem 2rem', backgroundColor: '#0a0a0a', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10, 10, 10, 0.2)' }}
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ── SAVED ADDRESSES TAB ─────────────────────────────── */}
              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  {/* Header Row */}
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? '1rem' : '1.5rem',
                    marginBottom: '1.75rem'
                  }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Saved Addresses</h2>
                      <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>Save addresses for faster checkout.</p>
                    </div>
                    <button
                      onClick={handleOpenAddAddress}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.65rem 1.25rem', backgroundColor: '#0a0a0a', color: '#fff',
                        border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,10,10,0.15)', transition: 'all 0.2s',
                        width: isMobile ? '100%' : 'auto'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Plus size={16} /> Add Address
                    </button>
                  </div>

                  {/* Add / Edit Address Form (Placed AT TOP for instant UX visibility) */}
                  <AnimatePresence>
                    {showAddressForm && (
                      <motion.div
                        ref={addressFormRef}
                        initial={{ opacity: 0, y: -15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -15, scale: 0.98 }}
                        style={{
                          backgroundColor: '#ffffff',
                          border: `2px solid ${editingAddressId ? '#0284c7' : '#0a0a0a'}`,
                          borderRadius: '24px',
                          padding: '2rem 1.75rem',
                          marginBottom: '2rem',
                          boxShadow: '0 20px 40px rgba(10, 10, 10, 0.08)',
                          scrollMarginTop: '120px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: editingAddressId ? '#0284c7' : '#16a34a',
                              backgroundColor: editingAddressId ? '#e0f2fe' : '#dcfce7',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '100px',
                              marginBottom: '0.4rem'
                            }}>
                              {editingAddressId ? <Edit2 size={12} /> : <Plus size={12} />}
                              {editingAddressId ? 'Editing Saved Address' : 'New Address Form'}
                            </span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                              {editingAddressId ? 'Edit Address Details' : 'Add New Delivery Address'}
                            </h3>
                          </div>
                          <button
                            onClick={() => { setShowAddressForm(false); setAddrFormError(''); setEditingAddressId(null); }}
                            style={{
                              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                              backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0a0a0a'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {addrFormError && (
                          <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#be123c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} /> {addrFormError}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                          {/* Label / Nickname */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Address Label *</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {/* Home Button */}
                                <button
                                  type="button"
                                  onClick={() => setAddrForm(f => ({ ...f, label: 'Home' }))}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '0.4rem 1rem', borderRadius: '20px', border: `2px solid ${addrForm.label === 'Home' ? '#0a0a0a' : '#e2e8f0'}`,
                                    backgroundColor: addrForm.label === 'Home' ? '#0a0a0a' : '#fff',
                                    color: addrForm.label === 'Home' ? '#fff' : '#475569',
                                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
                                  }}
                                >
                                  <Home size={14} style={{ marginRight: '6px' }} />
                                  Home
                                </button>

                                {/* Office Button */}
                                <button
                                  type="button"
                                  onClick={() => setAddrForm(f => ({ ...f, label: 'Office' }))}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '0.4rem 1rem', borderRadius: '20px', border: `2px solid ${addrForm.label === 'Office' ? '#0a0a0a' : '#e2e8f0'}`,
                                    backgroundColor: addrForm.label === 'Office' ? '#0a0a0a' : '#fff',
                                    color: addrForm.label === 'Office' ? '#fff' : '#475569',
                                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
                                  }}
                                >
                                  <Briefcase size={14} style={{ marginRight: '6px' }} />
                                  Office
                                </button>

                                {/* Other Button */}
                                {(() => {
                                  const isOtherActive = addrForm.label !== 'Home' && addrForm.label !== 'Office';
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => setAddrForm(f => ({ ...f, label: isOtherActive ? f.label : 'Friend / Family' }))}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center',
                                        padding: '0.4rem 1rem', borderRadius: '20px', border: `2px solid ${isOtherActive ? '#0a0a0a' : '#e2e8f0'}`,
                                        backgroundColor: isOtherActive ? '#0a0a0a' : '#fff',
                                        color: isOtherActive ? '#fff' : '#475569',
                                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s'
                                      }}
                                    >
                                      <MapPin size={14} style={{ marginRight: '6px' }} />
                                      {isOtherActive ? addrForm.label : 'Other'}
                                    </button>
                                  );
                                })()}
                              </div>

                              {/* Custom Label Input */}
                              {addrForm.label !== 'Home' && addrForm.label !== 'Office' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <input
                                    type="text"
                                    placeholder="Enter custom label (e.g. Vacation Home, Gym)"
                                    value={addrForm.label}
                                    onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                                    style={{
                                      width: '100%',
                                      maxWidth: '300px',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '8px',
                                      border: '1.5px solid #e2e8f0',
                                      backgroundColor: '#fff',
                                      fontSize: '0.85rem',
                                      fontWeight: 600,
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                  />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Name Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>First Name *</label>
                              <input type="text" placeholder="First name" value={addrForm.firstName}
                                onChange={e => setAddrForm(f => ({ ...f, firstName: e.target.value }))}
                                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Last Name</label>
                              <input type="text" placeholder="Last name" value={addrForm.lastName}
                                onChange={e => setAddrForm(f => ({ ...f, lastName: e.target.value }))}
                                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                              />
                            </div>
                          </div>

                          {/* Phone + Email Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Phone *</label>
                              <input type="tel" placeholder="10-digit mobile" value={addrForm.phone}
                                onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))}
                                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Email</label>
                              <input type="email" placeholder="email@example.com" value={addrForm.email}
                                onChange={e => setAddrForm(f => ({ ...f, email: e.target.value }))}
                                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                              />
                            </div>
                          </div>

                          {/* Street / Address Line */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Street Address / Flat / Building *</label>
                            <input type="text" placeholder="House no, Street name, Area" value={addrForm.street}
                              onChange={e => setAddrForm(f => ({ ...f, street: e.target.value }))}
                              style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                              onFocus={e => e.target.style.borderColor = '#0a0a0a'}
                              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                          </div>

                          {renderAddrLocationFields()}

                          {/* Form Actions */}
                          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                flex: 1, padding: '0.75rem', backgroundColor: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,10,10,0.2)', transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Check size={16} />
                              {editingAddressId ? 'Save Changes' : 'Save Address'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setShowAddressForm(false); setAddrFormError(''); setEditingAddressId(null); }}
                              style={{ padding: '0.75rem 1.25rem', backgroundColor: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Address Cards Grid */}
                  {addresses.length === 0 && !showAddressForm ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                      <MapPin size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                      <h4 style={{ fontWeight: 700, margin: '0 0 0.5rem 0', color: '#475569' }}>No saved addresses</h4>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Add an address to checkout faster next time.</p>
                      <button
                        onClick={handleOpenAddAddress}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', backgroundColor: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        <Plus size={16} /> Add First Address
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                      {addresses.map(addr => {
                        const isBeingEdited = editingAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            style={{
                              backgroundColor: isBeingEdited ? '#f0f9ff' : addr.isDefault ? '#fdf8f2' : '#fff',
                              border: `2px solid ${isBeingEdited ? '#0284c7' : addr.isDefault ? '#f5c97b' : '#e2e8f0'}`,
                              borderRadius: '18px',
                              padding: '1.25rem',
                              position: 'relative',
                              transition: 'all 0.25s ease',
                              boxShadow: isBeingEdited ? '0 0 0 4px rgba(2, 132, 199, 0.15)' : addr.isDefault ? '0 4px 20px rgba(245,201,123,0.2)' : '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                          >
                            {/* Label + Default Badge + Editing Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                  backgroundColor: addr.isDefault ? '#fef3c7' : '#f1f5f9',
                                  color: addr.isDefault ? '#92400e' : '#475569',
                                  border: `1px solid ${addr.isDefault ? '#fde68a' : '#e2e8f0'}`,
                                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800
                                }}>
                                  {addr.label === 'Home' ? <Home size={12} /> : addr.label === 'Office' ? <Briefcase size={12} /> : <MapPin size={12} />}
                                  {addr.label}
                                </span>
                                {addr.isDefault && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, color: '#b45309' }}>
                                    <Star size={11} fill="#f59e0b" color="#f59e0b" /> Default
                                  </span>
                                )}
                              </div>
                              {isBeingEdited && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  color: '#0284c7',
                                  backgroundColor: '#e0f2fe',
                                  padding: '2px 8px',
                                  borderRadius: '20px'
                                }}>
                                  <Edit2 size={10} /> Editing...
                                </span>
                              )}
                            </div>

                            {/* Address Details */}
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.3rem 0' }}>
                              {addr.firstName} {addr.lastName}
                            </p>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 0.2rem 0' }}>
                              {addr.street}<br />
                              {addr.city}, {addr.district ? `${addr.district}, ` : ''}{addr.state} — {addr.pincode}
                            </p>
                            {addr.phone && (
                              <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
                                <Phone size={12} style={{ color: '#64748b' }} />
                                {addr.phone}
                              </p>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                              {!addr.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(addr.id)}
                                  style={{ flex: 1, padding: '0.45rem', backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                                >
                                  <Star size={12} /> Set Default
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEditAddress(addr)}
                                style={{ flex: 1, padding: '0.45rem', backgroundColor: isBeingEdited ? '#0284c7' : '#f0f9ff', color: isBeingEdited ? '#fff' : '#0369a1', border: `1px solid ${isBeingEdited ? '#0284c7' : '#bae6fd'}`, borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                              >
                                <Edit2 size={12} /> {isBeingEdited ? 'Editing' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                style={{ padding: '0.45rem 0.65rem', backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </motion.div>
              )}

            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Beautiful Custom Confirmation Modal */}
      {/* Premium Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.5rem' : '1rem' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              style={{
                width: '100%',
                maxWidth: '700px',
                maxHeight: isMobile ? '92vh' : '90vh',
                backgroundColor: '#fff',
                borderRadius: isMobile ? '16px' : '28px',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 2001,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
                <div>
                  <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 800, margin: 0 }}>Order Details</h3>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', borderRadius: '50%', border: 'none', backgroundColor: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={isMobile ? 16 : 20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="order-modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                {/* Status & Tracker */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: isMobile ? '1rem' : '1.5rem', marginBottom: isMobile ? '1.25rem' : '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? '1rem' : '1.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700, color: '#475569' }}>Order Status</span>
                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '100px',
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      fontWeight: 800,
                      backgroundColor: selectedOrder.status === 'Delivered' ? '#dcfce7' : selectedOrder.status === 'Shipped' ? '#dbeafe' : selectedOrder.status === 'Packed' ? '#e0f2fe' : '#fef3c7',
                      color: selectedOrder.status === 'Delivered' ? '#166534' : selectedOrder.status === 'Shipped' ? '#1e40af' : selectedOrder.status === 'Packed' ? '#0369a1' : '#92400e'
                    }}>
                      {selectedOrder.status}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: isMobile ? '0' : '0 1rem' }}>
                    <div style={{ position: 'absolute', top: '12px', left: isMobile ? '12.5%' : '1rem', right: isMobile ? '12.5%' : '1rem', height: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: isMobile ? '12.5%' : '1rem',
                      width: selectedOrder.status === 'Delivered' ? (isMobile ? '75%' : '100%') : selectedOrder.status === 'Shipped' ? (isMobile ? '50%' : '66%') : selectedOrder.status === 'Packed' ? (isMobile ? '25%' : '33%') : '0%',
                      height: '2px',
                      backgroundColor: '#0a0a0a',
                      zIndex: 1,
                      transition: 'width 0.5s ease'
                    }} />

                    {['Processing', 'Packed', 'Shipped', 'Delivered'].map((s, i) => {
                      const isActive = selectedOrder.status === s ||
                        (s === 'Processing') ||
                        (s === 'Packed' && (selectedOrder.status === 'Packed' || selectedOrder.status === 'Shipped' || selectedOrder.status === 'Delivered')) ||
                        (s === 'Shipped' && (selectedOrder.status === 'Shipped' || selectedOrder.status === 'Delivered')) ||
                        (s === 'Delivered' && selectedOrder.status === 'Delivered');
                      return (
                        <div key={s} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.35rem' : '0.5rem', width: '25%' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#0a0a0a' : '#fff',
                            border: `2px solid ${isActive ? '#0a0a0a' : '#e2e8f0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                          }}>
                            {isActive && <Check size={12} />}
                          </div>
                          <span style={{ fontSize: isMobile ? '0.62rem' : '0.7rem', fontWeight: 700, color: isActive ? '#1e293b' : '#94a3b8', textAlign: 'center', letterSpacing: isMobile ? '-0.3px' : 'normal' }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items List */}
                <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                  <h4 style={{ fontSize: isMobile ? '0.88rem' : '0.95rem', fontWeight: 800, marginBottom: isMobile ? '0.75rem' : '1rem' }}>Items Ordered</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1rem' }}>
                    {selectedOrder.itemsList?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: isMobile ? '0.75rem' : '1rem', alignItems: 'center' }}>
                        <div style={{ width: isMobile ? '50px' : '60px', height: isMobile ? '50px' : '60px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                          <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 700, margin: '0 0 0.15rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(item.isFreeGift || (item.price === 0 && (item.name?.toLowerCase().includes('gift') || item.productId?.includes('gift')))) && (
                              <span style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, marginRight: '0.35rem' }}>🎁 FREE GIFT</span>
                            )}
                            {item.name}
                          </h5>
                          {(item.size || item.color) && (
                            <div style={{ display: 'flex', gap: isMobile ? '0.2rem' : '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem', alignItems: 'center' }}>
                              {item.size && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  backgroundColor: '#fff7ed',
                                  color: '#9a3412',
                                  border: '1px solid #fed7aa',
                                  padding: '1px 5px',
                                  borderRadius: '20px',
                                  fontSize: isMobile ? '0.62rem' : '0.68rem',
                                  fontWeight: 700,
                                }}>
                                  📐 Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  backgroundColor: '#fce7eb',
                                  color: '#360910',
                                  border: '1px solid #f8b4c0',
                                  padding: '1px 5px',
                                  borderRadius: '20px',
                                  fontSize: isMobile ? '0.62rem' : '0.68rem',
                                  fontWeight: 700,
                                }}>
                                  🎨 Color: {item.color}
                                </span>
                              )}
                            </div>
                          )}
                          <p style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: '#64748b', margin: 0 }}>
                            Qty: {item.qty || 1} • {(item.isFreeGift || item.price === 0) ? <span style={{ color: '#059669', fontWeight: 700 }}>FREE (₹0)</span> : `₹${item.price?.toLocaleString()}`}
                          </p>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: isMobile ? '0.82rem' : '0.9rem', whiteSpace: 'nowrap', color: (item.isFreeGift || item.price === 0) ? '#059669' : '#0f172a' }}>
                          {(item.isFreeGift || item.price === 0) ? 'FREE' : `₹${(item.price * (item.qty || 1)).toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary & Shipping Grid */}
                <div className="order-modal-grid">
                  <div>
                    <h4 style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: isMobile ? '0.5rem' : '0.75rem' }}>Shipping Address</h4>
                    <p style={{ fontSize: isMobile ? '0.78rem' : '0.85rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                      {selectedOrder.address?.street}<br />
                      {selectedOrder.address?.city}, {selectedOrder.address?.state}<br />
                      {selectedOrder.address?.pincode}, {selectedOrder.address?.country}
                    </p>
                  </div>
                  {(() => {
                    const itemsSubtotal = selectedOrder.itemsList ? selectedOrder.itemsList.reduce((acc, item) => acc + (item.price * item.qty), 0) : 0;
                    const discountVal = selectedOrder.discount !== undefined && selectedOrder.discount !== null ? selectedOrder.discount : Math.max(0, itemsSubtotal + (selectedOrder.shippingCharge || 0) - selectedOrder.total);
                    return (
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: isMobile ? '12px' : '16px', padding: isMobile ? '0.75rem' : '1rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', color: '#64748b' }}>Subtotal</span>
                          <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight: 700 }}>₹{itemsSubtotal.toLocaleString()}</span>
                        </div>
                        {discountVal > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', color: '#360910', fontWeight: 600 }}>Discount {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}</span>
                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight: 700, color: '#360910' }}>-₹{discountVal.toLocaleString()}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', color: '#64748b' }}>Shipping</span>
                          <span style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', fontWeight: 700, color: selectedOrder.shippingCharge > 0 ? '#1e293b' : '#360910' }}>
                            {selectedOrder.shippingCharge > 0 ? `₹${selectedOrder.shippingCharge.toLocaleString()}` : 'FREE'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isMobile ? '0.5rem' : '0.75rem', paddingTop: isMobile ? '0.5rem' : '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                          <span style={{ fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: 800 }}>Total Paid</span>
                          <span style={{ fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: 800, color: '#0a0a0a' }}>₹{selectedOrder.total?.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.5rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: isMobile ? '0.5rem' : '1rem', backgroundColor: '#fff' }}>
                <button
                  onClick={() => generateInvoicePDF(selectedOrder)}
                  style={{
                    padding: isMobile ? '0.65rem 1.25rem' : '0.7rem 1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #0a0a0a',
                    backgroundColor: '#fff',
                    color: '#0a0a0a',
                    fontWeight: 700,
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <CreditCard size={16} /> Download Invoice
                </button>

                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    padding: isMobile ? '0.65rem 1.25rem' : '0.7rem 1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}



