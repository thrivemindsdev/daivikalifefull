'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from '@/hooks/useRouterShim';
import { API_BASE_URL } from '@/config';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getOptimizedImageUrl } from '@/lib/image-optimizer';
import { trackMetaPixelEvent, getCapturedAdParameters } from '@/lib/meta-pixel';
import {
  ShoppingBag, ShieldCheck, CheckCircle2, ChevronRight, MapPin,
  Phone, Mail, ArrowLeft, Loader2, Sparkles, Landmark,
  Search, ChevronDown, Tag, AlertTriangle, CreditCard, Truck, Download, Package,
  Minus, Plus, Trash2, Lock, User, Eye, EyeOff, Gift, Clock
} from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import useMobileAuth from '@/hooks/useMobileAuth';
import { getDistricts } from '@/lib/india-districts';

const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const recalculateCheckoutItemPrices = (items, productGroups = []) => {
  const groupMap = {};
  productGroups.forEach(group => {
    // Database groups list member ids in productIds; offline groups have populated products
    const members = Array.isArray(group.products) ? group.products : group.productIds;
    if (Array.isArray(members)) {
      members.forEach(p => {
        const pId = typeof p === 'object' ? (p._id || p.id) : p;
        if (pId) {
          groupMap[pId.toString()] = group;
        }
      });
    }
  });

  const groupQuantities = {};

  items.forEach(item => {
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

  return items.map(item => {
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

const Checkout = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    cartItems: originalCartItems,
    getCartTotal: originalGetCartTotal,
    clearCart,
    updateQuantity: originalUpdateQuantity,
    removeFromCart: originalRemoveFromCart,
    latestProductsMap,
    isCartLoaded
  } = useCart();
  const { user, login, signup, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [productGroups, setProductGroups] = useState([]);
  // Tracks when user is being redirected back from Cashfree — prevents empty-cart redirect from firing
  const [isPendingCashfreeReturn, setIsPendingCashfreeReturn] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!new URLSearchParams(window.location.search).get('order_id');
    }
    return false;
  });

  // Fetch product groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/products/groups');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProductGroups(json.data);
        }
      } catch (err) {
        console.warn('Failed to fetch product groups for checkout:', err);
      }
    };
    fetchGroups();
  }, []);

  // Recalculate prices once groups load
  useEffect(() => {
    if (productGroups.length > 0) {
      setCheckoutItems(prev => recalculateCheckoutItemPrices(prev, productGroups));
    }
  }, [productGroups]);

  const [checkoutItems, setCheckoutItems] = useState(() => {
    const rawItems = location.state?.checkoutItems || originalCartItems;
    return recalculateCheckoutItemPrices(rawItems, []);
  });
  const cartItems = checkoutItems;

  // Sync checkoutItems with real-time price updates in latestProductsMap
  useEffect(() => {
    if (latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      setCheckoutItems(prev => {
        const updated = prev.map(item => {
          const productId = item.id || item._id;
          const latestProduct = latestProductsMap[productId];
          if (!latestProduct) return item;

          let newPrice = item.price;
          let newMRP = item.mrp;
          let newOriginalPrice = item.originalPrice !== undefined ? item.originalPrice : item.price;
          let selectedVariant = item.selectedVariant;

          if (selectedVariant) {
            const updatedVariant = latestProduct.variants?.find(v => v.name === selectedVariant.name);
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
            newOriginalPrice = Number(latestProduct.price);
            newPrice = newOriginalPrice;
            newMRP = Number(latestProduct.mrp);
          }

          return {
            ...item,
            originalPrice: newOriginalPrice,
            price: newPrice,
            mrp: newMRP,
            selectedVariant
          };
        });
        return recalculateCheckoutItemPrices(updated, productGroups);
      });
    }
  }, [latestProductsMap]);

  // Sync checkoutItems when originalCartItems changes (if not direct Buy Now)
  useEffect(() => {
    if (!location.state?.checkoutItems) {
      setCheckoutItems(recalculateCheckoutItemPrices(originalCartItems, productGroups));
    }
  }, [originalCartItems, location.state?.checkoutItems, productGroups]);

  const getCartTotal = () => {
    return checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getAvailableStockForItem = (item) => {
    const productId = item.id || item._id;
    const latestProduct = latestProductsMap ? latestProductsMap[productId] : null;
    if (!latestProduct) return 999;
    const sizeName = item.selectedVariant ? item.selectedVariant.name : '';
    const colorName = item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : '');
    const inv = latestProduct.inventory?.find(i =>
      (i.variant || '').toLowerCase() === (sizeName || '').toLowerCase() &&
      (i.color || '').toLowerCase() === (colorName || '').toLowerCase()
    );
    return inv ? inv.stock : 50;
  };

  const updateQuantity = (itemKey, amount) => {
    let stockExceeded = false;
    let maxStock = 999;

    setCheckoutItems(prev => {
      const updated = prev.map(item => {
        const currentKey = item.cartId || item.id || item._id;
        if (currentKey === itemKey) {
          const availableStock = getAvailableStockForItem(item);
          maxStock = availableStock;
          const newQty = item.quantity + amount;
          if (newQty > availableStock) {
            stockExceeded = true;
            return item;
          }
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      });
      return recalculateCheckoutItemPrices(updated, productGroups);
    });

    if (stockExceeded) {
      triggerAlert(`Only ${maxStock} item(s) left in stock.`, 'Out of Stock');
      return;
    }

    if (!location.state?.checkoutItems) {
      originalUpdateQuantity(itemKey, amount);
    }
  };

  const removeFromCart = (itemKey) => {
    setCheckoutItems(prev => {
      const filtered = prev.filter(item => (item.cartId || item.id || item._id) !== itemKey);
      return recalculateCheckoutItemPrices(filtered, productGroups);
    });

    if (!location.state?.checkoutItems) {
      originalRemoveFromCart(itemKey);
    }
  };

  // Redirect to collection if cart is empty — but NOT if we're mid-Cashfree return verification,
  // and not before the saved cart has been read (a page refresh would otherwise always bounce)
  useEffect(() => {
    // checkoutItems copies the cart one render later, so look at the cart itself unless this is a direct "Buy now"
    const items = location.state?.checkoutItems ? checkoutItems : originalCartItems;
    if (isCartLoaded && items.length === 0 && !orderSuccess && !isPendingCashfreeReturn) {
      navigate('/products');
    }
  }, [checkoutItems, originalCartItems, navigate, orderSuccess, isPendingCashfreeReturn, isCartLoaded]);

  // Form states
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.name?.split(' ')[1] || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneInputRef = React.useRef(null);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinLookup, setPinLookup] = useState({ status: 'idle', message: '' });
  const pinLookupRef = React.useRef({ pin: '', autoCity: '' });

  // Typing a full PIN code fills in state, district and city (city only if empty or filled by an earlier lookup)
  const handlePincodeChange = async (value) => {
    const pin = value.replace(/\D/g, '').slice(0, 6);
    setPincode(pin);
    if (pin.length !== 6) {
      setPinLookup({ status: 'idle', message: '' });
      return;
    }
    pinLookupRef.current.pin = pin;
    setPinLookup({ status: 'loading', message: 'Finding your location...' });
    try {
      const res = await fetch(`${API_BASE_URL}/public/pincode/${pin}`);
      const json = await res.json().catch(() => ({}));
      if (pinLookupRef.current.pin !== pin) return;
      if (!res.ok || !json.success || !json.data) {
        setPinLookup(res.status === 404
          ? { status: 'error', message: 'PIN code not found. Please check it or fill in the address manually.' }
          : { status: 'idle', message: '' });
        return;
      }
      const found = json.data;
      if (found.state) {
        setState(found.state);
        setDistrict(found.district || '');
      }
      if (found.city) {
        setCity(prev => {
          if (prev.trim() && prev !== pinLookupRef.current.autoCity) return prev;
          pinLookupRef.current.autoCity = found.city;
          return found.city;
        });
      }
      setPinLookup({
        status: 'success',
        message: found.state && !found.district ? 'State filled in — please select your district.' : ''
      });
    } catch {
      if (pinLookupRef.current.pin === pin) setPinLookup({ status: 'idle', message: '' });
    }
  };
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [stockAlertModal, setStockAlertModal] = useState({ isOpen: false, items: [] });

  // ── Saved Addresses ──────────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedAddrId, setSelectedSavedAddrId] = useState('');
  const [addrDropOpen, setAddrDropOpen] = useState(false);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(false);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    if (user) {
      const userIdentifier = user.email || user.phone;
      if (userIdentifier) {
        try {
          const addrs = JSON.parse(localStorage.getItem(`daivika_addresses_${userIdentifier}`) || '[]');
          setSavedAddresses(addrs);
          // Auto-fill with default address if available
          const def = addrs.find(a => a.isDefault) || addrs[0];
          if (def) {
            setSelectedSavedAddrId(def.id);
            setFirstName(prev => prev || def.firstName || '');
            setLastName(prev => prev || def.lastName || '');
            setPhone(prev => prev || def.phone || '');
            setEmail(prev => prev || def.email || '');
            setStreet(prev => prev || def.street || '');
            setCity(prev => prev || def.city || '');
            setState(prev => prev || def.state || '');
            setDistrict(prev => prev || def.district || '');
            setPincode(prev => prev || def.pincode || '');
          }
        } catch { setSavedAddresses([]); }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSelectSavedAddr = (addr) => {
    if (!addr) {
      // "New address" chosen
      setSelectedSavedAddrId('new');
      setFirstName(''); setLastName(''); setPhone('');
      setEmail(user?.email || ''); setStreet(''); setCity(''); setState(''); setDistrict(''); setPincode('');
    } else {
      setSelectedSavedAddrId(addr.id);
      setFirstName(addr.firstName || '');
      setLastName(addr.lastName || '');
      setPhone(addr.phone || '');
      setEmail(addr.email || user?.email || '');
      setStreet(addr.street || '');
      setCity(addr.city || '');
      setState(addr.state || '');
      setDistrict(addr.district || '');
      setPincode(addr.pincode || '');
    }
    setAddrDropOpen(false);
  };

  const saveEnteredAddressToProfileIfNeeded = () => {
    if (user && (street || city)) {
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
      const uniqueKeys = Array.from(new Set(keys));

      uniqueKeys.forEach(addrKey => {
        try {
          const existing = JSON.parse(localStorage.getItem(addrKey) || '[]');

          const isDuplicate = existing.some(a =>
            (a.street || '').trim().toLowerCase() === (street || '').trim().toLowerCase() &&
            (a.city || '').trim().toLowerCase() === (city || '').trim().toLowerCase() &&
            (a.pincode || '').trim() === (pincode || '').trim()
          );

          if (!isDuplicate) {
            const finalLabel = addressLabel === 'Other'
              ? (customLabel.trim() || 'Other')
              : addressLabel;
            const newAddr = {
              id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              label: finalLabel || 'Home',
              firstName: firstName || '',
              lastName: lastName || '',
              phone: phone || '',
              email: email || user.email || '',
              street: street || '',
              city: city || '',
              state: state || '',
              district: district || '',
              pincode: pincode || '',
              isDefault: existing.length === 0
            };
            const updated = [...existing, newAddr];
            localStorage.setItem(addrKey, JSON.stringify(updated));
            setSavedAddresses(updated);
          }
        } catch (err) {
          console.error("Error saving address from checkout:", err);
        }
      });
    }
  };

  const handleRemoveOutOfStockAndContinue = () => {
    const itemsToRemove = stockAlertModal.items;
    itemsToRemove.forEach(item => {
      const itemKey = item.cartId || item.id || item._id;
      removeFromCart(itemKey);
    });
    setStockAlertModal({ isOpen: false, items: [] });
    window.dispatchEvent(new CustomEvent('show_toast', {
      detail: {
        message: 'Out-of-stock items have been removed. You can now complete your purchase!',
        type: 'success'
      }
    }));
  };

  // Sync form inputs when user state changes (e.g. after registering or logging in)
  useEffect(() => {
    if (user) {
      if (user.name) {
        const parts = user.name.split(' ');
        setFirstName(prev => prev || parts[0] || '');
        setLastName(prev => prev || parts[1] || '');
      }
      if (user.email) {
        setEmail(prev => prev || user.email || '');
      }
    }
  }, [user]);

  // Coupon states
  const [coupons, setCoupons] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCoupons = localStorage.getItem('vaugun_coupons');
      if (savedCoupons) return JSON.parse(savedCoupons);
    }
    return [
      { code: 'Daivika10', discountType: 'percentage', discountValue: 10, minPurchase: 500, usageLimit: 1 },
      { code: 'KERALA500', discountType: 'fixed', discountValue: 500, minPurchase: 2000, usageLimit: 2 },
      { code: 'FIRSTBUY', discountType: 'percentage', discountValue: 20, minPurchase: 1000, usageLimit: 3 }
    ];
  });

  const [couponsEnabled, setCouponsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaugun_coupons_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [couponUsage, setCouponUsage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUsage = localStorage.getItem('vaugun_coupon_usage');
      if (savedUsage) return JSON.parse(savedUsage);
    }
    return {};
  });

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isCouponExpanded, setIsCouponExpanded] = useState(false);

  // Auto-fill pending coupon from popup (copied before login)
  useEffect(() => {
    try {
      const pending = localStorage.getItem('daivika_pending_coupon');
      if (pending && pending.trim()) {
        setCouponInput(pending.trim().toUpperCase());
        setIsCouponExpanded(true);
        // Clear after loading so it doesn't persist forever
        localStorage.removeItem('daivika_pending_coupon');
      }
    } catch (e) {}
  }, []);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: 'Notice', message: '' });

  const triggerAlert = (message, title = 'Notice') => {
    setAlertModal({ isOpen: true, title, message });
  };

  const getCouponDiscount = () => {
    if (!couponsEnabled || !appliedCoupon) return 0;
    
    // Always apply discount on the FULL cart subtotal (all products, excluding shipping).
    // Category is only used as an eligibility gate in handleApplyCoupon, not to restrict the discount amount.
    const targetTotal = getCartTotal();

    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((targetTotal * appliedCoupon.discountValue) / 100);
    } else {
      return Math.min(targetTotal, appliedCoupon.discountValue);
    }
  };

  // Shipping zones configurations state
  const [shippingZones, setShippingZones] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaugun_shipping_zones');
      if (saved) {
        const parsed = JSON.parse(saved);
        const containsInternational = parsed.some(zone =>
          zone.states.some(st => st.includes('United Arab Emirates') || st.includes('Saudi Arabia'))
        );
        if (!containsInternational && parsed.length >= 3) return parsed;
      }
    }
    return [
      {
        id: 'zone_1',
        name: 'South India Logistics',
        rate: 75,
        states: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry', 'Lakshadweep'],
        rules: []
      },
      {
        id: 'zone_2',
        name: 'North India Express',
        rate: 150,
        states: ['Delhi', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Himachal Pradesh', 'Jammu and Kashmir', 'Uttarakhand', 'Ladakh', 'Chandigarh'],
        rules: []
      },
      {
        id: 'zone_3',
        name: 'Middle India Cargo',
        rate: 120,
        states: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Goa', 'Bihar', 'Jharkhand', 'West Bengal', 'Odisha', 'Sikkim', 'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram', 'Manipur', 'Nagaland', 'Tripura', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu'],
        rules: []
      }
    ];
  });

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaugun_free_shipping_threshold');
      return saved ? parseInt(saved) : 600;
    }
    return 600;
  });

  const [logoUrl, setLogoUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vaugun_site_settings') || localStorage.getItem('vaugun_invoice_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.companyLogo || parsed.logo) return parsed.companyLogo || parsed.logo;
        }
      } catch (e) {}
    }
    return '/logo.png?v=daivika_v3';
  });

  // Always re-read from DB on mount to pick up latest admin-set value (cross-system sync)
  useEffect(() => {
    const loadSettings = async () => {
      // First apply localStorage value for instant display
      const saved = localStorage.getItem('vaugun_free_shipping_threshold');
      if (saved) setFreeShippingThreshold(parseInt(saved));
      const savedZones = localStorage.getItem('vaugun_shipping_zones');
      if (savedZones) { try { setShippingZones(JSON.parse(savedZones)); } catch (e) { } }
      const savedCoupons = localStorage.getItem('vaugun_coupons');
      if (savedCoupons) { try { setCoupons(JSON.parse(savedCoupons)); } catch (e) { } }
      const savedCouponsEnabled = localStorage.getItem('vaugun_coupons_enabled');
      if (savedCouponsEnabled !== null) { try { setCouponsEnabled(JSON.parse(savedCouponsEnabled)); } catch (e) { } }
      const savedCodSettings = localStorage.getItem('vaugun_cod_settings');
      if (savedCodSettings) { try { setCodSettings(JSON.parse(savedCodSettings)); } catch (e) { } }
      const savedGiftSettings = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
      if (savedGiftSettings) { try { setFreeGiftSettings(prev => ({ ...prev, ...JSON.parse(savedGiftSettings) })); } catch (e) { } }

      // Then fetch from DB to get the latest admin-saved value
      try {
        const res = await fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`);
        if (res.ok) {
          const resJson = await res.json();
          const data = resJson.data || resJson;
          if (data?.free_shipping_threshold !== undefined) {
            const dbVal = parseInt(data.free_shipping_threshold);
            setFreeShippingThreshold(dbVal);
            localStorage.setItem('vaugun_free_shipping_threshold', dbVal);
          }
          if (data?.shipping_zones !== undefined) {
            setShippingZones(data.shipping_zones);
            localStorage.setItem('vaugun_shipping_zones', JSON.stringify(data.shipping_zones));
          }
          if (data?.coupons !== undefined) {
            setCoupons(data.coupons);
            localStorage.setItem('vaugun_coupons', JSON.stringify(data.coupons));
          }
          if (data?.coupons_enabled !== undefined) {
            setCouponsEnabled(data.coupons_enabled);
            localStorage.setItem('vaugun_coupons_enabled', JSON.stringify(data.coupons_enabled));
          }
          if (data?.cod_settings !== undefined) {
            setCodSettings(data.cod_settings);
            localStorage.setItem('vaugun_cod_settings', JSON.stringify(data.cod_settings));
          }
          if (data?.free_gift_settings !== undefined) {
            setFreeGiftSettings(prev => ({ ...prev, ...data.free_gift_settings }));
            localStorage.setItem('daivika_free_gift_settings', JSON.stringify(data.free_gift_settings));
          }
        }
      } catch (e) {
        // Silently fall back to localStorage value already applied above
      }
    };
    loadSettings();
  }, []);

  // COD Advance Deposit Settings State
  const [codSettings, setCodSettings] = useState(() => {
    const defaults = { enabled: true, advancePercent: 30 };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('vaugun_cod_settings');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });

  // Free Gift Promotional Settings State
  const [freeGiftSettings, setFreeGiftSettings] = useState(() => {
    const defaults = {
      enabled: true,
      timerMinutes: 10,
      giftProductId: 'prod_daivika_anti_fog_spray_001',
      minimumSpend: 0,
      eligibleProductIds: [],
      title: 'FREE GIFT UNLOCKED!',
      subtitle: 'Complete your checkout before the timer ends to receive your exclusive gift for FREE!',
      badgeText: 'LIMITED TIME FREE GIFT'
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  const [giftProduct, setGiftProduct] = useState(null);
  const [giftTimeLeft, setGiftTimeLeft] = useState(0);
  const [isGiftTimerActive, setIsGiftTimerActive] = useState(false);
  const [giftTimerExpired, setGiftTimerExpired] = useState(false);

  // Load free gift product details from cache or DB
  useEffect(() => {
    const giftId = freeGiftSettings?.giftProductId;
    if (!giftId || !freeGiftSettings?.enabled) {
      setGiftProduct(null);
      return;
    }

    if (latestProductsMap && latestProductsMap[giftId]) {
      setGiftProduct(latestProductsMap[giftId]);
      return;
    }

    let isCancelled = false;
    fetch(`/api/products/${giftId}?t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        if (!isCancelled && json.success && json.data) {
          setGiftProduct(json.data);
        }
      })
      .catch(err => console.warn('Could not load gift product:', err));

    return () => { isCancelled = true; };
  }, [freeGiftSettings?.giftProductId, freeGiftSettings?.enabled, latestProductsMap]);

  // Determine if current cart is eligible for the free gift offer
  const isGiftEligible = Boolean(
    freeGiftSettings?.enabled &&
    cartItems.length > 0 &&
    giftProduct &&
    getCartTotal() >= (Number(freeGiftSettings.minimumSpend) || 0) &&
    (!freeGiftSettings.eligibleProductIds ||
      freeGiftSettings.eligibleProductIds.length === 0 ||
      cartItems.some(item => {
        const pId = (item.id || item._id || '').toString();
        return freeGiftSettings.eligibleProductIds.includes(pId);
      })) &&
    (
      !giftProduct.inventory ||
      giftProduct.inventory.length === 0 ||
      giftProduct.inventory.some(inv => (inv.stock || 0) > 0) ||
      (giftProduct.stock !== undefined && giftProduct.stock > 0)
    )
  );

  // Free Gift Countdown Timer Hook with Session Storage persistence
  useEffect(() => {
    if (!isGiftEligible) {
      setIsGiftTimerActive(false);
      return;
    }

    const durationSeconds = Math.max(1, (Number(freeGiftSettings?.timerMinutes) || 10) * 60);
    const storedExpiryStr = typeof window !== 'undefined' ? sessionStorage.getItem('daivika_gift_timer_expiry') : null;
    let expiry = storedExpiryStr ? parseInt(storedExpiryStr, 10) : null;

    if (!expiry || isNaN(expiry)) {
      expiry = Date.now() + durationSeconds * 1000;
      sessionStorage.setItem('daivika_gift_timer_expiry', expiry.toString());
    }

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      if (diff <= 0) {
        setGiftTimeLeft(0);
        setIsGiftTimerActive(false);
        setGiftTimerExpired(true);
      } else {
        setGiftTimeLeft(diff);
        setIsGiftTimerActive(true);
        setGiftTimerExpired(false);
      }
    };

    updateCountdown();
    const timerInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerInterval);
  }, [isGiftEligible, freeGiftSettings?.timerMinutes]);

  const formatTimerDigits = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return {
      minutes: String(mins).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0')
    };
  };

  // Helper to construct complete order itemsList (including free gift if eligible and countdown timer is active)
  const getOrderItemsList = () => {
    const baseItems = cartItems.map(item => ({
      productId: item.id || item._id,
      name: item.name,
      qty: item.quantity,
      price: item.price,
      image: item.image,
      size: item.selectedVariant ? item.selectedVariant.name : '',
      color: item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : ''),
      isFreeGift: Boolean(item.isFreeGift)
    }));

    if (isGiftEligible && isGiftTimerActive && giftProduct) {
      baseItems.push({
        productId: giftProduct._id || giftProduct.id || 'free_gift_item',
        name: `${giftProduct.name} (Free Gift 🎁)`,
        qty: 1,
        price: 0,
        image: (giftProduct.images && giftProduct.images[0]) || giftProduct.image || '/logo.png',
        size: 'Standard',
        color: 'Default',
        isFreeGift: true
      });
    }

    return baseItems;
  };

  // Listen for changes in shipping zones & free shipping rules across other tabs (e.g., Admin Panel) and update state instantly
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'vaugun_shipping_zones') {
        if (e.newValue) setShippingZones(JSON.parse(e.newValue));
      } else if (e.key === 'vaugun_free_shipping_threshold') {
        if (e.newValue) setFreeShippingThreshold(parseInt(e.newValue));
      } else if (e.key === 'vaugun_coupons') {
        if (e.newValue) setCoupons(JSON.parse(e.newValue));
      } else if (e.key === 'vaugun_coupons_enabled') {
        if (e.newValue) setCouponsEnabled(JSON.parse(e.newValue));
      } else if (e.key === 'vaugun_cod_settings' || e.key === 'vaugun_cod_settings_changed') {
        if (e.newValue) setCodSettings(JSON.parse(e.newValue));
      } else if (e.key === 'daivika_free_gift_settings' || e.key === 'vaugun_free_gift_settings') {
        if (e.newValue) setFreeGiftSettings(JSON.parse(e.newValue));
      }
    };
    const handleSettingsUpdated = () => {
      const saved = localStorage.getItem('vaugun_free_shipping_threshold');
      if (saved) setFreeShippingThreshold(parseInt(saved));
      const savedZones = localStorage.getItem('vaugun_shipping_zones');
      if (savedZones) setShippingZones(JSON.parse(savedZones));
      const savedCoupons = localStorage.getItem('vaugun_coupons');
      if (savedCoupons) setCoupons(JSON.parse(savedCoupons));
      const savedCouponsEnabled = localStorage.getItem('vaugun_coupons_enabled');
      if (savedCouponsEnabled !== null) setCouponsEnabled(JSON.parse(savedCouponsEnabled));
      const savedCod = localStorage.getItem('vaugun_cod_settings');
      if (savedCod) setCodSettings(JSON.parse(savedCod));
      const savedGift = localStorage.getItem('daivika_free_gift_settings') || localStorage.getItem('vaugun_free_gift_settings');
      if (savedGift) setFreeGiftSettings(JSON.parse(savedGift));
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('vaugun_settings_updated', handleSettingsUpdated);
    window.addEventListener('vaugun_cod_settings_changed', handleSettingsUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vaugun_settings_updated', handleSettingsUpdated);
      window.removeEventListener('vaugun_cod_settings_changed', handleSettingsUpdated);
    };
  }, []);

  // Track InitiateCheckout Meta Pixel Event
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      try {
        const prodIds = cartItems.map(i => (i.id || i._id || '').toString()).filter(Boolean);
        const totalVal = getFinalTotal();
        trackMetaPixelEvent('InitiateCheckout', {
          content_ids: prodIds,
          content_type: 'product',
          value: totalVal || 0,
          currency: 'INR',
          num_items: cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)
        });
      } catch (e) {
        // Non-blocking
      }
    }
  }, []);

  // Auto-check and verify Cashfree return redirect if customer was redirected back
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const returnOrderId = urlParams.get('order_id');

    if (returnOrderId) {
      // Clear URL params so reload doesn't re-trigger
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}

      const verifyReturnOrder = async () => {
        try {
          setIsCheckingStock(true);
          const res = await fetch(`${API_BASE_URL}/payment/cashfree-verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: returnOrderId })
          });
          const data = await res.json();
          if (res.ok && data.success && data.data) {
            const freshOrders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
            localStorage.setItem('vaugun_orders', JSON.stringify([data.data, ...freshOrders.filter(o => o._id !== returnOrderId)]));
            window.dispatchEvent(new Event('storage'));

            clearCart();
            setPlacedOrderId(returnOrderId);
            setOrderSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            console.warn('Cashfree redirect verification failed / pending:', data);
            // Payment not confirmed — clear pending flag so cart-empty redirect can work normally
            setIsPendingCashfreeReturn(false);
            triggerAlert(data.message || 'Payment was not completed or is still pending on Cashfree. Please try again.', 'Payment Incomplete');
          }
        } catch (e) {
          console.error('Cashfree return verify error:', e);
          setIsPendingCashfreeReturn(false);
          triggerAlert('Could not verify payment status with Cashfree. Please contact support if money was debited.', 'Verification Error');
        } finally {
          setIsCheckingStock(false);
          setIsPendingCashfreeReturn(false);
        }
      };
      verifyReturnOrder();
    }
  }, []);

  const [shippingCharge, setShippingCharge] = useState(0);

  // Auto-calculate shipping charge instantly when state is selected
  useEffect(() => {
    if (!state) {
      setShippingCharge(0);
      return;
    }
    // If subtotal is greater than or equal to the free shipping threshold, delivery fee is 0!
    if (getCartTotal() >= freeShippingThreshold) {
      setShippingCharge(0);
      return;
    }
    const matchedZone = shippingZones.find(zone =>
      zone.states.some(st => st.toLowerCase() === state.toLowerCase())
    );
    
    if (!matchedZone) {
      setShippingCharge(100);
      return;
    }

    const zoneBaseRate = Number(matchedZone.rate) || 0;
    const rules = matchedZone.rules || [];

    if (cartItems.length === 0) {
      setShippingCharge(zoneBaseRate);
      return;
    }

    // Dynamic calculation: sum of additional costs for all items in the cart
    let totalAdditionalCost = 0;

    cartItems.forEach(item => {
      const itemCollection = (item.gender || '').toLowerCase().trim();
      const itemCategory = (item.category || '').toLowerCase().trim();
      const qty = item.quantity || 1;

      // Find the most specific matching rule first (exact collection and exact category)
      let matchedRule = rules.find(rule => 
        (rule.collection || '').toLowerCase().trim() === itemCollection &&
        (rule.category || '').toLowerCase().trim() === itemCategory
      );

      // If no exact match, try matching Collection: all and exact category
      if (!matchedRule) {
        matchedRule = rules.find(rule => 
          (rule.collection || '').toLowerCase().trim() === 'all' &&
          (rule.category || '').toLowerCase().trim() === itemCategory
        );
      }

      // If still no match, try matching exact collection and Category: all
      if (!matchedRule) {
        matchedRule = rules.find(rule => 
          (rule.collection || '').toLowerCase().trim() === itemCollection &&
          (rule.category || '').toLowerCase().trim() === 'all'
        );
      }

      // If still no match, try fallback Collection: all and Category: all
      if (!matchedRule) {
        matchedRule = rules.find(rule => 
          (rule.collection || '').toLowerCase().trim() === 'all' &&
          (rule.category || '').toLowerCase().trim() === 'all'
        );
      }

      // If a rule is matched, multiply its rate (additional cost per item) by the item quantity
      if (matchedRule) {
        totalAdditionalCost += (Number(matchedRule.rate) || 0) * qty;
      }
    });

    const finalCharge = zoneBaseRate + totalAdditionalCost;
    setShippingCharge(finalCharge);
  }, [state, shippingZones, cartItems, freeShippingThreshold]);

  const getFinalTotal = () => {
    const baseTotal = Math.max(0, getCartTotal() - getCouponDiscount());
    return baseTotal + shippingCharge;
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');

    if (!phone || phone.trim().length < 10) {
      setCouponError('Please enter a valid 10-digit Phone Number first to verify coupon availability.');
      return;
    }

    if (!couponInput) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    const codeUpper = couponInput.toUpperCase().trim();
    const couponObj = coupons.find(c => c.code && c.code.toUpperCase().trim() === codeUpper);

    if (!couponObj) {
      setCouponError('Invalid coupon code.');
      return;
    }

    const cartTotal = getCartTotal();
    if (cartTotal < couponObj.minPurchase) {
      setCouponError(`Minimum purchase of ₹${couponObj.minPurchase} required to apply this coupon.`);
      return;
    }

    // Verify category restriction if the coupon has a specific category
    const standardCategories = ['welcome', 'referral', 'festival', 'other'];
    const couponCategory = couponObj.category ? couponObj.category.toLowerCase().trim() : '';
    if (couponCategory && !standardCategories.includes(couponCategory)) {
      const matchingItems = cartItems.filter(item => 
        item.category && item.category.toLowerCase().trim() === couponCategory
      );
      const categoryTotal = matchingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (matchingItems.length === 0) {
        setCouponError(`This coupon is only valid for items in the "${couponObj.category}" category.`);
        return;
      }
      
      if (categoryTotal < couponObj.minPurchase) {
        setCouponError(`Minimum purchase of ₹${couponObj.minPurchase} for "${couponObj.category}" items is required.`);
        return;
      }
    }

    // Verify limit using mobile number
    const key = `${codeUpper}_${phone.trim()}`;
    const usedCount = couponUsage[key] || 0;
    if (usedCount >= couponObj.usageLimit) {
      setCouponError(`This coupon has already been applied ${usedCount}/${couponObj.usageLimit} times by mobile number ${phone}.`);
      return;
    }

    setAppliedCoupon(couponObj);

    // Calculate discount on FULL cart subtotal (all products, excluding shipping)
    let discount = 0;
    if (couponObj.discountType === 'percentage') {
      discount = Math.round((cartTotal * couponObj.discountValue) / 100);
    } else {
      discount = Math.min(cartTotal, couponObj.discountValue);
    }

    setCouponSuccess(`Coupon "${codeUpper}" applied successfully! You saved ₹${discount.toLocaleString('en-IN')}.`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };


  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone || !street || !city || !state || !pincode) {
      triggerAlert('Please fill out all required shipping and contact details', 'Missing Information');
      return;
    }
    if (!district) {
      triggerAlert('Please select your district so we can ship from the store nearest to you.', 'District Required');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile phone number');
      triggerAlert('Please enter a valid 10-digit mobile phone number for delivery updates (e.g. 9876543210).', 'Invalid Phone Number');
      if (phoneInputRef.current) {
        phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current.focus();
      }
      return;
    }
    setPhoneError('');

    setIsCheckingStock(true);
    const outOfStockItems = [];

    try {
      // Validate live inventory stock for all shopping cart items
      for (const item of cartItems) {
        const response = await fetch(`${API_BASE_URL}/products/${item.id || item._id}?t=${Date.now()}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const sizeName = item.selectedVariant ? item.selectedVariant.name : '';
            const colorName = item.selectedColor ? item.selectedColor.name : (item.selectedTexture ? item.selectedTexture.name : '');
            const inv = result.data.inventory?.find(i =>
              (i.variant || '').toLowerCase() === (sizeName || '').toLowerCase() &&
              (i.color || '').toLowerCase() === (colorName || '').toLowerCase()
            );
            const latestStock = inv ? inv.stock : 50;
            if (latestStock < item.quantity) {
              outOfStockItems.push({
                ...item,
                latestStock
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to verify catalog stock before checkout:", err);
    } finally {
      setIsCheckingStock(false);
    }

    if (outOfStockItems.length > 0) {
      setStockAlertModal({
        isOpen: true,
        items: outOfStockItems
      });
      return;
    }

    const isCodPayment = paymentMethod === 'Cash on Delivery';
    const savedSettingsStr = localStorage.getItem('vaugun_invoice_settings');
    const invoiceSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : { companyLogo: '' };

    if (typeof window === 'undefined' || !window.Razorpay) {
      triggerAlert('Payment Gateway failed to load. Please check your internet connection and reload the page.', 'Payment Error');
      return;
    }

    // 1. Create the order on the server. The server prices it from the catalogue and store settings,
    //    so the amount charged never depends on values held in the browser.
    setIsCheckingStock(true);
    let dbOrder = null;
    let rzpOrder = null;
    let rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    try {
      const createRes = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user: `${firstName} ${lastName}`.trim(),
          email,
          phone,
          couponCode: appliedCoupon ? appliedCoupon.code : '',
          isPartialCod: isCodPayment,
          paymentMethod: isCodPayment ? 'Cash on Delivery (Advance Paid)' : 'Razorpay',
          address: { street, city, district, state, pincode, country: 'India' },
          itemsList: getOrderItemsList(),
          utmData: getCapturedAdParameters()
        })
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData.success || !createData.data) {
        // A product saved in the cart was removed from the store: take it out so the shopper can order the rest
        if (createData.unavailableProductId) {
          const goneId = String(createData.unavailableProductId);
          checkoutItems
            .filter(item => String(item.id || item._id) === goneId)
            .forEach(item => removeFromCart(item.cartId || item.id || item._id));
          throw new Error(`${createData.message}. It has been removed from your cart — please review your order and try again.`);
        }
        throw new Error(createData.message || 'Could not create your order. Please try again.');
      }
      dbOrder = createData.data;

      // Prices, offers or delivery charges changed since the page loaded: show the amount that will be charged
      const shownTotal = getFinalTotal();
      if (Math.abs(Number(dbOrder.total) - shownTotal) > 1) {
        const proceed = window.confirm(`Your order total has been updated to ₹${Number(dbOrder.total).toLocaleString('en-IN')} (latest prices, offers and delivery charges). Continue to payment?`);
        if (!proceed) return;
      }

      // 2. Razorpay order for the amount the server says is due
      const payRes = await fetch(`${API_BASE_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dbOrder._id })
      });
      const payData = await payRes.json().catch(() => ({}));
      rzpOrder = payData.order || payData.data;
      if (!payRes.ok || !payData.success || !rzpOrder?.id) {
        throw new Error(payData.message || 'Failed to initialize the payment. Please try again.');
      }
      rzpKey = payData.keyId || rzpKey;
    } catch (err) {
      console.error('Failed to start payment:', err);
      triggerAlert(err.message || 'Failed to initialize payment. Please try again.', 'Order Not Placed');
      return;
    } finally {
      setIsCheckingStock(false);
    }

    const actualOrderId = dbOrder._id;
    const options = {
      key: rzpKey,
      amount: rzpOrder.amount, // paise, set by the server
      currency: "INR",
      name: "Daivika Store",
      description: isCodPayment ? `${dbOrder.codPercent}% Advance Deposit (COD)` : "Complete your sacred purchase",
      image: invoiceSettings.companyLogo || '/logo-light.png?v=daivika_v3',
      order_id: rzpOrder.id,
      handler: function (response) {
        // Runs only when Razorpay reports success; the server verifies the signature before confirming
        handleExecutePayment(
          response.razorpay_payment_id,
          actualOrderId,
          dbOrder,
          response.razorpay_order_id,
          response.razorpay_signature
        );
      },
      prefill: {
        name: `${firstName} ${lastName}`,
        email: email,
        contact: phone
      },
      notes: { orderId: actualOrderId },
      theme: {
        color: "#28060b" // Daivika Royal Temple Maroon
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error('Razorpay Payment Failed:', response.error);
      triggerAlert(response.error.description || 'Payment was cancelled or failed.', 'Payment Failed');
    });
    rzp.open();
  };

  // Razorpay reported success: the server checks the signature and confirms the order
  const handleExecutePayment = async (paymentId, orderId, preCreatedOrder, razorpayOrderId = null, razorpaySignature = null) => {
    setIsCheckingStock(true);
    let confirmedOrder = null;
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          razorpay_payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature
        })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.success || !verifyData.data) {
        triggerAlert(`${verifyData.message || 'We could not verify your payment.'} If money was debited, it will be confirmed automatically or refunded. Please contact support with payment ID ${paymentId}.`, 'Verification Error');
        return;
      }
      confirmedOrder = verifyData.data;
    } catch (networkErr) {
      // The payment went through at Razorpay; their webhook confirms the order on the server
      console.warn('Payment verify request failed; the Razorpay webhook will confirm the order:', networkErr);
      confirmedOrder = {
        ...(preCreatedOrder || {}),
        _id: orderId,
        razorpay_payment_id: paymentId,
        status: 'Processing',
        paymentStatus: preCreatedOrder?.isPartialCod ? 'Partially Paid' : 'Paid'
      };
    } finally {
      setIsCheckingStock(false);
    }

    try {
      setOrderSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('daivika_gift_timer_expiry');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setPlacedOrderId(orderId);

      // Save address to profile if checked
      saveEnteredAddressToProfileIfNeeded();

      // Remember coupon use on this device (the server enforces the real limit per phone number)
      if (appliedCoupon) {
        const key = `${appliedCoupon.code}_${phone.trim()}`;
        const updatedUsage = {
          ...couponUsage,
          [key]: (couponUsage[key] || 0) + 1
        };
        setCouponUsage(updatedUsage);
        localStorage.setItem('vaugun_coupon_usage', JSON.stringify(updatedUsage));
      }

      // Keep a local copy for order history / invoice download
      const savedOrders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
      localStorage.setItem('vaugun_orders', JSON.stringify([confirmedOrder, ...savedOrders.filter(o => o._id !== orderId)]));

      // Dispatch Meta Pixel Purchase Event for Razorpay
      try {
        const prodIds = cartItems.map(i => (i.id || i._id || '').toString()).filter(Boolean);
        trackMetaPixelEvent('Purchase', {
          content_name: `Order ${orderId}`,
          content_ids: prodIds,
          content_type: 'product',
          value: Number(confirmedOrder.total) || getFinalTotal(),
          currency: 'INR',
          num_items: cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0),
          order_id: orderId
        }, {
          email,
          phone
        });
      } catch (e) {
        // Non-blocking
      }

      // Clear current shopping cart
      if (location.state?.checkoutItems) {
        location.state.checkoutItems.forEach(item => removeFromCart(item.id || item._id));
      } else {
        clearCart();
      }
    } catch (error) {
      console.error('Payment completion error:', error);
      triggerAlert('Your payment was received, but something went wrong showing the confirmation. Please check My Orders or contact support.', 'System Error');
    }
  };

    const handleDownloadInvoice = async () => {
    if (!placedOrderId) return;
    const orders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
    const order = orders.find(o => o._id === placedOrderId);
    if (!order) return;

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
      companyPhone: '+91 75108 21228'
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

    const finalY = doc.lastAutoTable.finalY + 10;
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
  };

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        color: '#0a0a0a',
        fontFamily: '"Poppins", sans-serif'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(10, 10, 10, 0.1)',
            borderTopColor: '#0a0a0a',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Securing checkout session...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Guest checkout is allowed directly - no login gate

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '0 0 4rem 0',
      color: '#111827',
      fontFamily: '"Poppins", sans-serif'
    }}>
      <style>{`
        input::placeholder, textarea::placeholder {
          color: #9ca3af !important;
          opacity: 0.7 !important;
          font-weight: 400 !important;
        }
      `}</style>

      {/* Clean Minimal Checkout Top Bar with Back Button */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.85rem 1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#0f172a',
            textDecoration: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '0.4rem 0.85rem',
            borderRadius: '100px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        {/* Brand Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={logoUrl && !logoUrl.includes('api/images') ? logoUrl : '/logo.png?v=daivika_v3'}
            alt="DAIVIKA"
            style={{ height: '36px', maxHeight: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.png?v=daivika_v3';
            }}
          />
        </Link>

        {/* 100% Secure Checkout Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: '#15803d',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: '#f0fdf4',
          padding: '0.35rem 0.75rem',
          borderRadius: '100px',
          border: '1px solid #bbf7d0'
        }}>
          <Lock size={12} />
          <span>100% Secure</span>
        </div>
      </div>

      <div className="checkout-container">

        <AnimatePresence mode="wait">
          {!orderSuccess ? (
            <motion.div
              key="checkout-form-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '1.5rem', color: '#0f172a' }}>Checkout</h1>

              {/* Free Gift Countdown Timer Banner */}
              {freeGiftSettings?.enabled && giftProduct && (
                <div style={{ marginBottom: '1.75rem' }}>
                  <AnimatePresence mode="wait">
                    {isGiftEligible && isGiftTimerActive ? (
                      <motion.div
                        key="checkout-gift-timer-active"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #10b981',
                          borderRadius: '14px',
                          padding: '1.1rem 1.25rem',
                          boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                          flexWrap: 'wrap',
                          position: 'relative'
                        }}
                      >
                        {/* Left Side: Product preview and title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '260px' }}>
                          <div style={{
                            position: 'relative',
                            width: '58px',
                            height: '58px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            flexShrink: 0
                          }}>
                            <img
                              src={(giftProduct.images && giftProduct.images[0]) || giftProduct.image || '/logo.png'}
                              alt={giftProduct.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              fontSize: '0.58rem',
                              fontWeight: 800,
                              textAlign: 'center',
                              padding: '1px 0',
                              letterSpacing: '0.5px'
                            }}>
                              FREE
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '100px',
                                letterSpacing: '0.3px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <Gift size={11} /> {freeGiftSettings.badgeText || 'FREE GIFT'}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                Worth <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>₹{giftProduct.price || giftProduct.mrp || 499}</span> • <span style={{ color: '#059669', fontWeight: 700 }}>100% Free</span>
                              </span>
                            </div>
                            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0 0 0.15rem 0', color: '#0f172a', letterSpacing: '-0.2px' }}>
                              {freeGiftSettings.title || 'Free Gift Unlocked!'}
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                              {giftProduct.name} will be added to your order for free if completed before the timer ends.
                            </p>
                          </div>
                        </div>

                        {/* Right Side: Clean Modern Countdown Timer */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          backgroundColor: giftTimeLeft <= 120 ? '#fef2f2' : '#f8fafc',
                          border: `1px solid ${giftTimeLeft <= 120 ? '#fecaca' : '#e2e8f0'}`,
                          borderRadius: '10px',
                          padding: '0.5rem 0.85rem',
                          flexShrink: 0
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: giftTimeLeft <= 120 ? '#ef4444' : '#10b981',
                            boxShadow: giftTimeLeft <= 120 ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : '0 0 0 3px rgba(16, 185, 129, 0.15)',
                            flexShrink: 0
                          }} />

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              color: giftTimeLeft <= 120 ? '#dc2626' : '#64748b',
                              lineHeight: 1
                            }}>
                              {giftTimeLeft <= 120 ? 'Ending soon' : 'Offer expires in'}
                            </span>
                            <span style={{
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                              fontSize: '1.08rem',
                              fontWeight: 800,
                              lineHeight: 1.2,
                              color: giftTimeLeft <= 120 ? '#dc2626' : '#0f172a',
                              letterSpacing: '0.5px'
                            }}>
                              {formatTimerDigits(giftTimeLeft).minutes} : {formatTimerDigits(giftTimeLeft).seconds}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ) : giftTimerExpired ? (
                      <motion.div
                        key="checkout-gift-timer-expired"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '12px',
                          padding: '0.85rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          color: '#991b1b'
                        }}
                      >
                        <AlertTriangle size={17} color="#dc2626" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                          <strong style={{ fontWeight: 700 }}>Offer Expired:</strong> The free gift countdown timer for this checkout session has ended. Your order will proceed with standard cart items.
                        </div>
                      </motion.div>
                    ) : !isGiftEligible && freeGiftSettings.minimumSpend > 0 && getCartTotal() < freeGiftSettings.minimumSpend ? (
                      <motion.div
                        key="checkout-gift-timer-spend-needed"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #360910',
                          borderRadius: '12px',
                          padding: '0.85rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          color: '#1e293b'
                        }}
                      >
                        <Gift size={17} color="#360910" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                          <strong>Special Offer:</strong> Add <strong>₹{(freeGiftSettings.minimumSpend - getCartTotal()).toLocaleString('en-IN')}</strong> more to your cart to instantly unlock a <strong>FREE {giftProduct.name}</strong>!
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}

              {/* Responsive Split Columns */}
              <div className="responsive-grid-auto-fit checkout-grid-container" style={{ gap: '3rem', alignItems: 'start' }}>

                {/* Left Column: Details form */}
                <div>
                  <form onSubmit={handleInitiatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                    {/* Contact details section card */}
                    <div className="checkout-card">
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#111827' }}>
                        <Mail size={18} color="#0a0a0a" /> Contact Coordinates
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>Phone Number (Required for Delivery alerts)</label>
                          <input
                            ref={phoneInputRef}
                            type="tel"
                            required
                            maxLength={10}
                            placeholder="10-digit mobile number (e.g. 9876543210)"
                            value={phone}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setPhone(digits);
                              if (digits.length === 10) {
                                setPhoneError('');
                              } else if (digits.length > 0 && digits.length < 10) {
                                setPhoneError('Phone number must be exactly 10 digits');
                              } else {
                                setPhoneError('');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '6px',
                              border: phoneError ? '1.5px solid #ef4444' : '1px solid #d1d5db',
                              backgroundColor: '#fff',
                              color: '#111827',
                              outline: 'none',
                              fontSize: '0.9rem'
                            }}
                            onFocus={(e) => e.target.style.borderColor = phoneError ? '#ef4444' : '#0a0a0a'}
                            onBlur={(e) => e.target.style.borderColor = phoneError ? '#ef4444' : '#d1d5db'}
                          />
                          {phoneError && (
                            <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <AlertTriangle size={13} /> {phoneError}
                            </span>
                          )}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>Email Address (Optional)</label>
                          <input
                            type="email"
                            placeholder="e.g. name@domain.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address Section Card */}
                    <div className="checkout-card">
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#111827' }}>
                        <MapPin size={18} color="#0a0a0a" /> Shipping Destination
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* ── Saved Address Selector (only when user has saved addresses) */}
                        {user && savedAddresses.length > 0 && (
                          <div style={{
                            backgroundColor: '#f0f9ff',
                            border: '1.5px solid #bae6fd',
                            borderRadius: '12px',
                            padding: '1rem 1.1rem',
                            marginBottom: '0.25rem'
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <MapPin size={13} /> Use a Saved Address
                            </div>
                            <div style={{ position: 'relative' }}>
                              {/* Dropdown Trigger */}
                              <div
                                onClick={() => setAddrDropOpen(o => !o)}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '0.65rem 0.9rem', backgroundColor: '#fff',
                                  border: `1.5px solid ${addrDropOpen ? '#0369a1' : '#bae6fd'}`,
                                  borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                  <MapPin size={15} color="#0ea5e9" style={{ flexShrink: 0 }} />
                                  <div style={{ overflow: 'hidden' }}>
                                    {selectedSavedAddrId && selectedSavedAddrId !== 'new' ? (() => {
                                      const sel = savedAddresses.find(a => a.id === selectedSavedAddrId);
                                      return sel ? (
                                        <>
                                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0c4a6e', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {sel.label} — {sel.firstName} {sel.lastName}
                                          </span>
                                          <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                            {sel.street}, {sel.city}, {sel.state} {sel.pincode}
                                          </span>
                                        </>
                                      ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Select a saved address...</span>;
                                    })() : (
                                      <span style={{ fontSize: '0.85rem', color: selectedSavedAddrId === 'new' ? '#374151' : '#94a3b8', fontWeight: selectedSavedAddrId === 'new' ? 700 : 400 }}>
                                        {selectedSavedAddrId === 'new' ? 'Entering new address manually' : 'Select a saved address...'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronDown size={15} color="#0369a1" style={{ transform: addrDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                              </div>

                              {/* Click-away backdrop */}
                              {addrDropOpen && (
                                <div onClick={() => setAddrDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9990 }} />
                              )}

                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {addrDropOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                                      backgroundColor: '#fff', border: '1px solid #e0f2fe',
                                      borderRadius: '12px', boxShadow: '0 12px 35px rgba(0,0,0,0.12)',
                                      zIndex: 9991, overflow: 'hidden'
                                    }}
                                  >
                                    {/* Saved Address Options */}
                                    {savedAddresses.map(addr => (
                                      <div
                                        key={addr.id}
                                        onClick={() => handleSelectSavedAddr(addr)}
                                        style={{
                                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                          padding: '0.85rem 1rem', cursor: 'pointer',
                                          backgroundColor: selectedSavedAddrId === addr.id ? '#f0f9ff' : '#fff',
                                          borderBottom: '1px solid #f0f9ff',
                                          transition: 'background 0.1s'
                                        }}
                                        onMouseEnter={e => { if (selectedSavedAddrId !== addr.id) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                        onMouseLeave={e => { if (selectedSavedAddrId !== addr.id) e.currentTarget.style.backgroundColor = '#fff'; }}
                                      >
                                        <div style={{
                                          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                          backgroundColor: addr.isDefault ? '#fef3c7' : '#f1f5f9',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                          <MapPin size={15} color={addr.isDefault ? '#d97706' : '#64748b'} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.83rem', color: '#1e293b' }}>{addr.label}</span>
                                            {addr.isDefault && (
                                              <span style={{ fontSize: '0.65rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '10px', fontWeight: 700, border: '1px solid #fde68a' }}>Default</span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {addr.firstName} {addr.lastName}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                                          </div>
                                        </div>
                                        {selectedSavedAddrId === addr.id && (
                                          <CheckCircle2 size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                                        )}
                                      </div>
                                    ))}
                                    {/* New address option */}
                                    <div
                                      onClick={() => handleSelectSavedAddr(null)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.85rem 1rem', cursor: 'pointer',
                                        backgroundColor: selectedSavedAddrId === 'new' ? '#f0fdf4' : '#fff',
                                        borderTop: '1px solid #f1f5f9', transition: 'background 0.1s'
                                      }}
                                      onMouseEnter={e => { if (selectedSavedAddrId !== 'new') e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                      onMouseLeave={e => { if (selectedSavedAddrId !== 'new') e.currentTarget.style.backgroundColor = '#fff'; }}
                                    >
                                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Plus size={15} color="#64748b" />
                                      </div>
                                      <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#374151' }}>Enter a new address</span>
                                      {selectedSavedAddrId === 'new' && <CheckCircle2 size={16} color="#360910" style={{ marginLeft: 'auto' }} />}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}


                        <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>First Name</label>
                            <input
                              type="text"
                              required
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                              onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>Last Name</label>
                            <input
                              type="text"
                              required
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                              onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                        </div>

                        {/* Street Address */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>Street Address</label>
                          <input
                            type="text"
                            required
                            placeholder="Flat/House number, building name, street..."
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </div>

                        {/* PIN code right after the street: it fills in city, state and district below */}
                        <div className="responsive-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>PIN Code</label>
                            <input
                              type="text"
                              required
                              placeholder="682030"
                              inputMode="numeric"
                              maxLength={6}
                              value={pincode}
                              onChange={(e) => handlePincodeChange(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                              onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                            {pinLookup.message && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem', fontSize: '0.75rem', color: pinLookup.status === 'error' ? '#dc2626' : '#6b7280' }}>
                                {pinLookup.status === 'loading' && <Loader2 size={12} className="animate-spin" />}
                                {pinLookup.message}
                              </div>
                            )}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>City</label>
                            <input
                              type="text"
                              required
                              placeholder="Kochi"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', outline: 'none', fontSize: '0.9rem' }}
                              onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                        </div>

                        {/* State & District (district decides which nearby store ships the order) */}
                        <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>State</label>
                            <SearchableSelect
                              value={state}
                              onChange={(st) => {
                                if (st !== state) setDistrict('');
                                setState(st);
                              }}
                              options={indianStates}
                              placeholder="Select State"
                              searchPlaceholder="Search state..."
                              emptyText="No matching states found"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem' }}>District</label>
                            <SearchableSelect
                              value={district}
                              onChange={setDistrict}
                              options={getDistricts(state)}
                              placeholder="Select District"
                              searchPlaceholder="Search district..."
                              emptyText="No matching districts found"
                              disabled={!state}
                              disabledText="Select state first"
                            />
                          </div>
                        </div>

                        {/* Save Address to Profile Option */}
                        {user && (selectedSavedAddrId === 'new' || savedAddresses.length === 0) && (
                          <div style={{
                            marginTop: '1.25rem',
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                          }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                              <input
                                type="checkbox"
                                checked={saveAddressToProfile}
                                onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#0a0a0a',
                                  cursor: 'pointer'
                                }}
                              />
                              <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#374151' }}>
                                Save this address to my profile for future orders
                              </span>
                            </label>

                            {saveAddressToProfile && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '1.6rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Address Label:
                                  </span>
                                  {['Home', 'Work', 'Other'].map((lbl) => (
                                    <button
                                      key={lbl}
                                      type="button"
                                      onClick={() => setAddressLabel(lbl)}
                                      style={{
                                        padding: '0.3rem 0.8rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        borderRadius: '20px',
                                        border: '1px solid ' + (addressLabel === lbl ? '#0a0a0a' : '#cbd5e1'),
                                        backgroundColor: addressLabel === lbl ? '#0a0a0a' : '#ffffff',
                                        color: addressLabel === lbl ? '#ffffff' : '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {lbl}
                                    </button>
                                  ))}
                                </div>

                                {addressLabel === 'Other' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', maxWidth: '240px' }}>
                                    <input
                                      type="text"
                                      placeholder="Enter custom label (e.g. Friends, Parents)"
                                      value={customLabel}
                                      onChange={(e) => setCustomLabel(e.target.value)}
                                      style={{
                                        padding: '0.45rem 0.65rem',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.8rem',
                                        color: '#111827',
                                        backgroundColor: '#ffffff',
                                        outline: 'none',
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        transition: 'border-color 0.15s'
                                      }}
                                      onFocus={(e) => e.target.style.borderColor = '#0a0a0a'}
                                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>



                    {/* Integrated Payment Gateways Selector Card */}
                    <div className="checkout-card">
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#111827' }}>
                        <CreditCard size={18} color="#0a0a0a" /> Payment Method
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                        {/* Gateway option 1 - Razorpay Full Online */}
                        <div
                          onClick={() => setPaymentMethod('Razorpay')}
                          style={{
                            padding: '1rem',
                            border: paymentMethod === 'Razorpay' ? '1.5px solid #0a0a0a' : '1.5px solid #e5e7eb',
                            backgroundColor: paymentMethod === 'Razorpay' ? '#fdfbf9' : '#ffffff',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '2px solid ' + (paymentMethod === 'Razorpay' ? '#0a0a0a' : '#d1d5db'),
                              backgroundColor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}>
                              {paymentMethod === 'Razorpay' && (
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', wordBreak: 'break-word', lineHeight: '1.35' }}>
                                Full Online Payment (UPI / Card / NetBanking)
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>Pay 100% online for instant order confirmation</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, backgroundColor: '#fce7eb', color: '#360910', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>100% ONLINE</span>
                          </div>
                        </div>

                        {/* Gateway option 2 - Cash on Delivery */}
                        {codSettings?.enabled !== false && (
                          <div
                            onClick={() => setPaymentMethod('Cash on Delivery')}
                            style={{
                              padding: '1rem',
                              border: paymentMethod === 'Cash on Delivery' ? '1.5px solid #0a0a0a' : '1.5px solid #e5e7eb',
                              backgroundColor: paymentMethod === 'Cash on Delivery' ? '#fdfbf9' : '#ffffff',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              gap: '0.5rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                              <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid ' + (paymentMethod === 'Cash on Delivery' ? '#0a0a0a' : '#d1d5db'),
                                backgroundColor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                {paymentMethod === 'Cash on Delivery' && (
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0a0a0a' }} />
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', wordBreak: 'break-word', lineHeight: '1.35' }}>
                                  Cash on Delivery ({codSettings.advancePercent ?? 30}% Advance Deposit Online)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.2rem', lineHeight: '1.4' }}>
                                  Pay {codSettings.advancePercent ?? 30}% advance (₹{Math.round(getFinalTotal() * ((codSettings.advancePercent ?? 30) / 100)).toLocaleString('en-IN')}) online, and remaining {100 - (codSettings.advancePercent ?? 30)}% in cash upon delivery.
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, backgroundColor: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{codSettings.advancePercent ?? 30}% ADVANCE</span>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Refund & Exchange Policy Notice */}
                    <p style={{
                      fontSize: '0.78rem',
                      color: '#4b5563',
                      lineHeight: '1.4',
                      textAlign: 'center',
                      margin: '0.5rem 0 0 0'
                    }}>
                      All items are final sale. Read our{' '}
                      <Link to="/refund-policy" style={{ color: '#0a0a0a', textDecoration: 'underline', fontWeight: 600, transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'} onMouseLeave={(e) => e.currentTarget.style.color = '#0a0a0a'}>
                        Refund Policy
                      </Link>{' '}
                      &{' '}
                      <Link to="/returns-exchanges" style={{ color: '#0a0a0a', textDecoration: 'underline', fontWeight: 600, transition: 'color 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#6b7280'} onMouseLeave={(e) => e.currentTarget.style.color = '#0a0a0a'}>
                        Return Policy
                      </Link>.
                    </p>

                    <button
                      type="submit"
                      disabled={isCheckingStock}
                      style={{
                        backgroundColor: isCheckingStock ? '#6b7280' : '#0a0a0a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '100px',
                        width: '100%',
                        height: '56px',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        cursor: isCheckingStock ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgba(10, 10, 10, 0.2)',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCheckingStock) e.currentTarget.style.backgroundColor = '#1f1f1f';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCheckingStock) e.currentTarget.style.backgroundColor = '#0a0a0a';
                      }}
                    >
                      <span>
                        {isCheckingStock
                          ? 'Checking inventory...'
                          : `Pay & Place Order • ₹${getFinalTotal().toLocaleString('en-IN')}`}
                      </span>
                      <ChevronRight size={18} />
                    </button>

                  </form>
                </div>

                {/* Right Column: Cart items review Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Shopping Bag Review List */}
                  <div className="checkout-card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#111827' }}>
                      <ShoppingBag size={18} color="#0a0a0a" /> Order Summary
                    </h3>

                    {/* Free Shipping Dynamic Progress/Alert Banner */}
                    <div style={{
                      backgroundColor: getCartTotal() >= freeShippingThreshold ? '#f0fdf4' : '#f8fafc',
                      border: '1px solid ' + (getCartTotal() >= freeShippingThreshold ? '#bbf7d0' : '#e2e8f0'),
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getCartTotal() >= freeShippingThreshold ? (
                          <CheckCircle2 size={15} color="#059669" style={{ flexShrink: 0 }} />
                        ) : (
                          <Truck size={15} color="#0f172a" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: getCartTotal() >= freeShippingThreshold ? '#065f46' : '#334155'
                        }}>
                          {getCartTotal() >= freeShippingThreshold ? (
                            <span>Congratulations! You've unlocked <strong>Free Standard Shipping</strong></span>
                          ) : (
                            <span>Add <strong>₹{(freeShippingThreshold - getCartTotal()).toLocaleString('en-IN')}</strong> more for <strong>Free Shipping</strong></span>
                          )}
                        </span>
                      </div>

                      {/* Interactive Progress Bar */}
                      <div style={{ width: '100%', height: '5px', backgroundColor: getCartTotal() >= freeShippingThreshold ? '#dcfce7' : '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, (getCartTotal() / freeShippingThreshold) * 100)}%`,
                          height: '100%',
                          backgroundColor: getCartTotal() >= freeShippingThreshold ? '#10b981' : '#0f172a',
                          borderRadius: '100px',
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                        <span>Subtotal: ₹{getCartTotal().toLocaleString('en-IN')}</span>
                        <span>Free Shipping: ₹{freeShippingThreshold.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {cartItems.map((item) => {
                        const itemKey = item.cartId || item.id || item._id;

                        if (item.isFreeGift) {
                          return (
                            <div key={itemKey} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              padding: '0.65rem 0.75rem',
                              backgroundColor: '#f0fdf4',
                              borderRadius: '8px',
                              border: '1px solid #bbf7d0',
                              marginBottom: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                  <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                                    <img
                                      src={getOptimizedImageUrl(item.image || '/logo.png', 100)}
                                      alt={item.name}
                                      style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover', border: '1px solid #bbf7d0' }}
                                      onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '-3px',
                                      right: '-3px',
                                      backgroundColor: '#10b981',
                                      color: '#fff',
                                      borderRadius: '50%',
                                      width: '15px',
                                      height: '15px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '9px'
                                    }}>
                                      🎁
                                    </div>
                                  </div>

                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      <span style={{
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        letterSpacing: '0.3px'
                                      }}>
                                        FREE GIFT
                                      </span>
                                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.name.replace(/\(Free Gift.*?\)/i, '').trim()}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '0.15rem' }}>
                                      Unlocked with: {item.parentProductName || 'Selected Product'}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                    ₹{(item.originalPrice || 399).toLocaleString('en-IN')}
                                  </span>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669' }}>
                                    FREE
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={itemKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                <img
                                  src={getOptimizedImageUrl(item.image || '/logo.png', 100)}
                                  alt={item.name}
                                  style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/logo.png';
                                  }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name.split(' (')[0]}
                                  </div>

                                  {(item.selectedColor || item.selectedTexture || item.selectedVariant) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                      {item.selectedColor && (
                                        <div
                                          title={`Color: ${item.selectedColor.name}`}
                                          style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: item.selectedColor.code || '#cccccc',
                                            border: '1px solid rgba(0, 0, 0, 0.15)',
                                            flexShrink: 0
                                          }}
                                        />
                                      )}

                                      {item.selectedTexture && (
                                        <div
                                          title={`Texture: ${item.selectedTexture.name}`}
                                          style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundImage: `url(${item.selectedTexture.image})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '1px solid rgba(0, 0, 0, 0.15)',
                                            flexShrink: 0
                                          }}
                                        />
                                      )}

                                      {item.selectedVariant && (
                                        <span style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          color: '#4b5563',
                                          backgroundColor: '#f3f4f6',
                                          padding: '0.05rem 0.35rem',
                                          borderRadius: '4px',
                                          border: '1px solid #e5e7eb',
                                          lineHeight: 1
                                        }}>
                                          {item.selectedVariant.name}
                                        </span>
                                      )}

                                      {(item.selectedColor || item.selectedTexture) && (
                                        <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 500 }}>
                                          {item.selectedColor ? item.selectedColor.name : item.selectedTexture.name}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '0.15rem' }}>₹{item.price.toLocaleString('en-IN')} each</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                                  ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(itemKey)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.6,
                                    transition: 'all 0.15s',
                                    borderRadius: '50%'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  title="Remove item from order"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Interactive Quantity Adjustment panel */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '3.5rem' }}>
                              <div className="qty-control">
                                <button
                                  type="button"
                                  className="qty-btn"
                                  onClick={() => updateQuantity(itemKey, -1)}
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="qty-value">{item.quantity}</span>
                                <button
                                  type="button"
                                  className="qty-btn"
                                  onClick={() => updateQuantity(itemKey, 1)}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Free Gift Item Row in Order Summary if Eligible & Timer Active */}
                      {isGiftEligible && isGiftTimerActive && giftProduct && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          padding: '0.75rem',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '10px',
                          border: '1px solid #bbf7d0',
                          marginTop: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                              <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                                <img
                                  src={(giftProduct.images && giftProduct.images[0]) || giftProduct.image || '/logo.png'}
                                  alt={giftProduct.name}
                                  style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover', border: '1px solid #bbf7d0' }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  bottom: '-4px',
                                  right: '-4px',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Sparkles size={9} />
                                </div>
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  <span style={{
                                    backgroundColor: '#10b981',
                                    color: '#ffffff',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.3px'
                                  }}>
                                    FREE GIFT
                                  </span>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {giftProduct.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                    ₹{(giftProduct.price || giftProduct.mrp || 499).toLocaleString('en-IN')}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                                    ₹0 (Qty: 1)
                                  </span>
                                  <span style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: '#dcfce7',
                                    color: '#065f46',
                                    padding: '1px 6px',
                                    borderRadius: '100px',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    <Clock size={10} /> {formatTimerDigits(giftTimeLeft).minutes}:{formatTimerDigits(giftTimeLeft).seconds} left
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>
                                FREE
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                                Special Offer
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cost Breakdown */}
                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
                        <span>Subtotal</span>
                        <span>₹{getCartTotal().toLocaleString('en-IN')}</span>
                      </div>

                      {appliedCoupon && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Tag size={13} /> Coupon Discount ({appliedCoupon.code})
                          </span>
                          <span>-₹{getCouponDiscount().toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
                        <span>Shipping Handling {state ? `(${state})` : ''}</span>
                        <span style={{ color: (state && shippingCharge > 0) ? '#111827' : '#059669', fontWeight: 700 }}>
                          {!state && getCartTotal() < freeShippingThreshold ? (
                            <span style={{ color: '#9ca3af', fontWeight: 500 }}>Select state to calculate</span>
                          ) : shippingCharge > 0 ? (
                            `₹${shippingCharge.toLocaleString('en-IN')}`
                          ) : (
                            'FREE'
                          )}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#111827', borderTop: '1px dashed #e5e7eb', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <span>Total Order Amount</span>
                        <span style={{ color: '#0a0a0a', fontSize: '1.15rem' }}>
                          ₹{getFinalTotal().toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* COD 30% Advance Breakdown display when COD is selected */}
                      {paymentMethod === 'Cash on Delivery' && (
                        <div style={{
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          marginTop: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                            <span>30% Advance (Pay Online Now via Razorpay)</span>
                            <span>₹{Math.round(getFinalTotal() * 0.3).toLocaleString('en-IN')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#78350f' }}>
                            <span>70% Balance (Payable on Delivery in Cash)</span>
                            <span>₹{(getFinalTotal() - Math.round(getFinalTotal() * 0.3)).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}


                    </div>

                    {/* Promo Coupon Application Form */}
                    {couponsEnabled && (
                      <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
                        <AnimatePresence initial={false}>
                          {!isCouponExpanded && !appliedCoupon ? (
                            <motion.div
                              key="coupon-trigger-row"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                            >
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>
                                Do you have a coupon?
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsCouponExpanded(true)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  color: '#0a0a0a',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#4b5563'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#0a0a0a'}
                              >
                                Apply Coupon
                              </button>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="coupon-form-expanded"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                              style={{ overflow: 'hidden' }}
                            >
                              {!appliedCoupon ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Apply Promo Coupon</label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCouponExpanded(false);
                                        setCouponError('');
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        color: '#6b7280',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                      type="text"
                                      placeholder="Enter Code (e.g. Daivika10)"
                                      value={couponInput}
                                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '0.8rem',
                                        outline: 'none',
                                        color: '#111827',
                                        backgroundColor: '#ffffff',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={handleApplyCoupon}
                                      style={{
                                        backgroundColor: '#0a0a0a',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0 1.25rem',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background-color 0.1s',
                                        flexShrink: 0
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f1f1f'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.75rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#065f46', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <Tag size={13} />
                                    <span>{appliedCoupon.code} Applied!</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleRemoveCoupon}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: 700
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}

                              {couponError && (
                                <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '0.4rem', fontWeight: 500, lineHeight: '1.4' }}>
                                  {couponError}
                                </div>
                              )}

                              {couponSuccess && (
                                <div style={{ color: '#360910', fontSize: '0.72rem', marginTop: '0.4rem', fontWeight: 500, lineHeight: '1.4' }}>
                                  {couponSuccess}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Trust guarantees footer */}
                  <div className="checkout-card" style={{ display: 'flex', gap: '0.75rem', backgroundColor: '#fcfcfe' }}>
                    <ShieldCheck size={20} color="#360910" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>100% Encrypted Transactions</div>
                      <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: '0.2rem 0 0 0', lineHeight: '1.4' }}>We protect your credentials with 256-bit SSL network encryption. Powered securely by PCI-DSS compliant gateways.</p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          ) : (

            /* SPECTACULAR PLACEMENT SUCCESS COMPONENT */
            <motion.div
              key="placement-success"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              style={{
                maxWidth: '520px',
                margin: '4rem auto 0 auto',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                padding: '3rem 2.5rem',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fce7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#360910', margin: '0 auto 1.5rem auto' }}>
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
                {placedOrderId && JSON.parse(localStorage.getItem('vaugun_orders') || '[]').find(o => o._id === placedOrderId)?.paymentMethod === 'Cash on Delivery'
                  ? `${codSettings.advancePercent ?? 30}% Advance Received & COD Order Confirmed!`
                  : 'Payment Complete!'
                }
              </h2>


              <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.6', margin: '0 0 2rem 0' }}>
                {placedOrderId && JSON.parse(localStorage.getItem('vaugun_orders') || '[]').find(o => o._id === placedOrderId)?.paymentMethod === 'Cash on Delivery'
                  ? `Congratulations! Your ${codSettings.advancePercent ?? 30}% advance deposit was received successfully. Your Cash on Delivery order has been placed, and the remaining ${100 - (codSettings.advancePercent ?? 30)}% balance is payable in cash upon delivery.`
                  : 'Congratulations! Your payment has been received successfully. We are processing your delivery details.'
                }
              </p>

              {/* Order Processing info card */}
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.15rem',
                backgroundColor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textAlign: 'left',
                marginBottom: '1rem'
              }}>
                <Package size={20} color="#0a0a0a" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>Order Confirmed & Processing</div>
                </div>
              </div>

              {/* Free Gift celebratory notice if order includes free gift */}
              {placedOrderId && (() => {
                const currentOrders = JSON.parse(localStorage.getItem('vaugun_orders') || '[]');
                const placedOrd = currentOrders.find(o => o._id === placedOrderId);
                const hasGift = placedOrd?.itemsList?.some(i => i.isFreeGift || (i.price === 0 && (i.name?.toLowerCase().includes('gift') || i.productId?.includes('gift'))));
                if (!hasGift) return null;
                return (
                  <div style={{
                    border: '1.5px solid #86efac',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    textAlign: 'left',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.3rem' }}>
                      🎁
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '0.15rem' }}>
                        Free Gift Claimed Successfully!
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#15803d', lineHeight: 1.4 }}>
                        Congratulations! You completed your order before the countdown expired. Your complimentary gift is included in your parcel at ₹0!
                      </div>
                    </div>
                  </div>
                );
              })()}

              {!user && (
                <div style={{
                  border: '1px dashed #f59e0b',
                  borderRadius: '12px',
                  padding: '1rem',
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  textAlign: 'left',
                  fontSize: '0.8rem',
                  lineHeight: '1.5',
                  marginBottom: '2rem',
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                  <div>
                    <strong style={{ fontWeight: 800 }}>Important Notice:</strong> Clearing your browser history or site cache will prevent you from tracking this order as a guest. Please sign in or register an account using the same email address to link and track all your orders permanently.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  to="/products"
                  style={{
                    backgroundColor: '#0a0a0a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '100px',
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-block',
                    boxShadow: '0 10px 15px -3px rgba(10, 10, 10, 0.15)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                >
                  Continue Shopping
                </Link>

                <button
                  onClick={handleDownloadInvoice}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0a0a0a',
                    border: '2px solid #0a0a0a',
                    borderRadius: '100px',
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdfbf9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  <Download size={18} /> Download Invoice
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {alertModal.isOpen &&
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(15, 10, 30, 0.4)',
              backdropFilter: 'blur(4px)'
            }}
          />

          {/* Dialog Content Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(10, 10, 10, 0.15)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '400px',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(10, 10, 10, 0.12), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
              <div style={{
                backgroundColor: '#fdfbf9',
                borderRadius: '12px',
                padding: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #fdf8f5',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} color="#0a0a0a" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#111827',
                  margin: 0,
                  fontFamily: "'Poppins', sans-serif"
                }}>
                  {alertModal.title}
                </h4>
                <p style={{
                  fontSize: '0.82rem',
                  color: '#4b5563',
                  margin: 0,
                  lineHeight: '1.45',
                  fontWeight: 500
                }}>
                  {alertModal.message}
                </p>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.2rem' }}>
              <button
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  backgroundColor: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.55rem 1.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 10px rgba(10, 10, 10, 0.2)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      }

      <AnimatePresence>
        {stockAlertModal.isOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStockAlertModal({ isOpen: false, items: [] })}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 10, 30, 0.4)',
                backdropFilter: 'blur(4px)'
              }}
            />

            {/* Dialog Content Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(10, 10, 10, 0.15)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '460px',
                padding: '1.75rem',
                boxShadow: '0 25px 50px -12px rgba(10, 10, 10, 0.12), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '12px',
                  padding: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} color="#ef4444" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%' }}>
                  <h4 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#111827',
                    margin: 0,
                    fontFamily: "'Poppins', sans-serif"
                  }}>
                    Out of Stock Warning
                  </h4>
                  <p style={{
                    fontSize: '0.82rem',
                    color: '#4b5563',
                    margin: '0.25rem 0 0 0',
                    lineHeight: '1.45',
                    fontWeight: 500
                  }}>
                    The following items in your cart do not have sufficient stock:
                  </p>
                </div>
              </div>

              {/* Out of stock items list */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '0.5rem',
                backgroundColor: '#faf9f6',
                borderRadius: '8px',
                border: '1px solid #f3f0ea'
              }}>
                {stockAlertModal.items.map((item) => (
                  <div key={item.cartId || item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {item.selectedVariant && (
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          Option: {item.selectedVariant.name} {item.selectedColor ? `/ ${item.selectedColor.name}` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'block' }}>
                        Requested: {item.quantity}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#360910', fontWeight: 600, display: 'block' }}>
                        Available: {item.latestStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0, lineHeight: '1.4' }}>
                Would you like to remove the unavailable items and proceed checking out the remaining products in your shopping bag?
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.2rem' }}>
                <button
                  onClick={() => setStockAlertModal({ isOpen: false, items: [] })}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#4b5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#111827';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#4b5563';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveOutOfStockAndContinue}
                  style={{
                    backgroundColor: '#0a0a0a',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 10px rgba(10, 10, 10, 0.2)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f1f1f'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a0a0a'}
                >
                  Remove & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Customers log in with mobile number + password (sign-up verifies the number with one OTP);
// once logged in the checkout page continues on its own
const CheckoutAuthInterception = ({ onGuestCheckout }) => {
  const auth = useMobileAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const visualPanelRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (visualPanelRef.current) {
      const rect = visualPanelRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div className="checkout-auth-wrapper">
      <style>{`
          input::placeholder, textarea::placeholder {
            color: #9ca3af !important;
            opacity: 0.7 !important;
            font-weight: 400 !important;
          }

          .checkout-auth-wrapper {
            min-height: 100vh;
            width: 100%;
            background-color: #FAF8F5;
            font-family: 'Poppins', sans-serif;
            box-sizing: border-box;
            overflow-y: auto;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
          }

          .checkout-auth-card {
            display: flex;
            flex-direction: column;
            width: 480px;
            max-width: 100%;
            background-color: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(10, 10, 10, 0.1);
            border: 1px solid rgba(10, 10, 10, 0.05);
            position: relative;
            margin: auto;
          }

          .checkout-auth-form-panel {
            width: 100%;
            padding: 3rem 2.2rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
            background: #ffffff;
            box-sizing: border-box;
          }

          .checkout-auth-form-container {
            width: 100%;
            transition: opacity 0.25s, transform 0.25s;
          }

          .checkout-auth-back {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #6b7280;
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-decoration: none;
            margin-bottom: 1.5rem;
            transition: all 0.3s;
          }

          .checkout-auth-back:hover {
            color: #0a0a0a;
            transform: translateX(-4px);
          }

          .checkout-auth-header {
            margin-bottom: 2rem;
          }

          .checkout-auth-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: #0a0a0a;
            letter-spacing: -0.5px;
            margin: 0 0 0.4rem 0;
          }

          .checkout-auth-subtitle {
            font-size: 0.82rem;
            color: #6b7280;
            line-height: 1.45;
            margin: 0;
          }

          .checkout-auth-input-group {
            margin-bottom: 1.2rem;
            position: relative;
          }

          .checkout-auth-label {
            display: block;
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #0a0a0a;
            letter-spacing: 1.5px;
            margin-bottom: 0.4rem;
          }

          .checkout-auth-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }

          .checkout-auth-input-icon {
            position: absolute;
            left: 0;
            color: #0a0a0a;
            pointer-events: none;
          }

          .checkout-auth-input {
            width: 100%;
            background: transparent;
            border: none;
            border-bottom: 2px solid rgba(10, 10, 10, 0.08);
            border-radius: 0;
            padding: 0.65rem 2.2rem 0.65rem 1.5rem;
            color: #0a0a0a;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.3s;
            box-sizing: border-box;
          }

          .checkout-auth-input:focus {
            border-bottom-color: #0a0a0a;
          }

          .checkout-auth-password-toggle {
            position: absolute;
            right: 0;
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
          }

          .checkout-auth-password-toggle:hover {
            color: #0a0a0a;
          }

          .checkout-auth-submit {
            width: 100%;
            padding: 1rem;
            border-radius: 50px;
            background-color: #0a0a0a;
            color: #ffffff;
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 1.8rem;
            box-shadow: 0 8px 20px rgba(10, 10, 10, 0.15);
          }

          .checkout-auth-submit:hover {
            background-color: #1a1a1a;
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(10, 10, 10, 0.22);
          }

          .checkout-auth-submit:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          .checkout-auth-error {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.04);
            border: 1px solid rgba(239, 68, 68, 0.15);
            padding: 0.65rem 1rem;
            border-radius: 12px;
            font-size: 0.78rem;
            font-weight: 600;
            margin-bottom: 1.2rem;
            text-align: center;
          }

          .checkout-auth-toggle {
            text-align: center;
            margin-top: 1.8rem;
            font-size: 0.82rem;
            color: #6b7280;
          }

          .checkout-auth-toggle-btn {
            background: none;
            border: none;
            color: #0a0a0a;
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            font-size: 0.82rem;
            margin-left: 0.25rem;
            text-decoration: underline;
          }

          .checkout-auth-toggle-btn:hover {
            color: #333;
          }
       `}</style>

      <div className="checkout-auth-card">
        <div className="checkout-auth-form-panel">
          <div
            className="checkout-auth-form-container"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.2rem' }}>
              <Link to="/" className="checkout-auth-back" style={{ margin: 0 }}>
                <ArrowLeft size={12} /> Back to Site
              </Link>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                <img src="/logo.png" alt="Daivika Logo" style={{ height: '28px', width: 'auto' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.5px' }}>DAIVIKA</span>
              </Link>
            </div>

            <div className="checkout-auth-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 className="checkout-auth-title" style={{ fontSize: '1.7rem' }}>
                {auth.title}
              </h1>
              <p className="checkout-auth-subtitle">
                {auth.subtitle}
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }} />

            {auth.error && (
              <div className="checkout-auth-error">
                {auth.error}
              </div>
            )}

            <form onSubmit={auth.submit}>
              {[
                { show: true, label: 'Mobile Number', Icon: Phone, props: { type: 'tel', inputMode: 'numeric', autoComplete: 'tel', placeholder: '10-digit Mobile Number', value: auth.phone, onChange: (e) => auth.setPhone(e.target.value) } },
                { show: auth.otpSent, label: 'OTP', Icon: Lock, props: { type: 'text', inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 8, placeholder: 'Enter OTP', value: auth.otp, onChange: (e) => auth.setOtp(e.target.value) } },
                { show: auth.mode === 'signup' && auth.otpSent, label: 'Full Name', Icon: User, props: { type: 'text', autoComplete: 'name', placeholder: 'Your Full Name', value: auth.name, onChange: (e) => auth.setName(e.target.value) } },
                { show: auth.showPassword, label: auth.mode === 'login' ? 'Password' : 'Set Password', Icon: Lock, props: { type: 'password', autoComplete: auth.mode === 'login' ? 'current-password' : 'new-password', placeholder: '••••••••', value: auth.password, onChange: (e) => auth.setPassword(e.target.value) } },
                { show: auth.showConfirm, label: 'Confirm Password', Icon: Lock, props: { type: 'password', autoComplete: 'new-password', placeholder: '••••••••', value: auth.confirmPassword, onChange: (e) => auth.setConfirmPassword(e.target.value) } },
              ].filter(f => f.show).map(({ label, Icon, props }) => (
                <div key={label} className="checkout-auth-input-group">
                  <label className="checkout-auth-label">{label}</label>
                  <div className="checkout-auth-input-wrapper">
                    <Icon size={14} className="checkout-auth-input-icon" style={{ left: '0.2rem' }} />
                    <input required className="checkout-auth-input" {...props} />
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                <span>{auth.otpSent ? auth.info : ''}</span>
                {auth.otpSent ? (
                  <button type="button" onClick={auth.resend} disabled={auth.busy} className="checkout-auth-toggle-btn">Resend OTP</button>
                ) : auth.mode === 'login' ? (
                  <button type="button" onClick={() => auth.setMode('reset')} className="checkout-auth-toggle-btn">Forgot password?</button>
                ) : null}
              </div>

              <button type="submit" disabled={auth.busy} className="checkout-auth-submit">
                {auth.busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{auth.submitLabel}</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="checkout-auth-toggle">
              {auth.mode === 'login' ? 'New to Daivika? ' : 'Already have an account? '}
              <button type="button" onClick={() => auth.setMode(auth.mode === 'login' ? 'signup' : 'login')} className="checkout-auth-toggle-btn">
                {auth.mode === 'login' ? 'Create Account' : 'Log In'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.5rem 0 1rem 0'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(10, 10, 10, 0.08)' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(10, 10, 10, 0.08)' }}></div>
            </div>

            <button
              type="button"
              onClick={onGuestCheckout}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '50px',
                backgroundColor: 'transparent',
                color: '#0a0a0a',
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                border: '2px solid #0a0a0a',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0a0a0a'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0a0a0a'; }}
            >
              <span>Checkout as Guest</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;


