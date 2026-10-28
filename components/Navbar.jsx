import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from '@/hooks/useRouterShim';
import {
  ShoppingBag, Search, Menu, User, Heart, X, ChevronRight, Home, Phone,
  Shield, LogOut, LogIn, ChevronDown, Camera, QrCode, Sparkles,
  Cookie, Wheat, Sprout, Store, GlassWater, Truck, ShieldCheck,
  RefreshCw, Award, ShoppingCart, Volume2, Maximize, Scan, CameraOff, Zap,
  Headphones, Gift, Percent, Clock, Star, Bell, MessageSquare, ArrowRight,
  Send, Check, CheckCheck, Package, Tag, Flame
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/config';
const defaultLogo = '/logo-light.png?v=daivika_v3';

const tickerIconMap = {
  Zap,
  Truck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Headphones,
  Gift,
  ShoppingBag,
  Percent,
  Clock,
  Star,
  Heart,
  Tag,
  Flame,
  Award,
  Package,
  Check,
  Shield
};

const renderTickerIcon = (iconName, size = 13, color = "#ffffff") => {
  const IconComponent = tickerIconMap[iconName] || Sparkles;
  return <IconComponent size={size} color={color} />;
};

const formatTickerText = (text) => {
  if (!text) return "";
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <span key={index} style={{ color: '#ffffff', fontWeight: 800 }}>{part}</span>;
    }
    return <span key={index}>{part}</span>;
  });
};

const announcements = [
  { text: "FREE EXPRESS SHIPPING ON ALL ORDERS ABOVE ₹500", icon: Truck },
  { text: "100% PREMIUM QUALITY — CRAFTED TO LAST", icon: ShieldCheck },
  { text: "EASY 7-DAY HASSLE-FREE RETURN POLICY", icon: RefreshCw }
];

// Categories are static — no dynamic tabs

const HamburgerButton = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        gap: '4px',
        position: 'relative',
        zIndex: 10002,
        transition: 'all 0.2s ease',
        outline: 'none',
        padding: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0a0a0a';
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      }}
    >
      <motion.span
        animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 6 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '18px',
          height: '2px',
          backgroundColor: '#0a0a0a',
          borderRadius: '2px',
          display: 'block'
        }}
      />
      <motion.span
        animate={{ opacity: isOpen ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '18px',
          height: '2px',
          backgroundColor: '#0a0a0a',
          borderRadius: '2px',
          display: 'block'
        }}
      />
      <motion.span
        animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -6 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '18px',
          height: '2px',
          backgroundColor: '#0a0a0a',
          borderRadius: '2px',
          display: 'block'
        }}
      />
    </button>
  );
};

// Traditional Header Lotus Motif
const HeaderLotusBorder = () => (
  <div style={{ width: '100%', height: '8px', lineHeight: 0, overflow: 'hidden', background: '#260509', borderBottom: '1px solid rgba(197, 131, 26, 0.45)' }}>
    <svg width="100%" height="8" viewBox="0 0 400 8" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '8px' }}>
      <defs>
        <pattern id="hdrLotus" x="0" y="0" width="32" height="8" patternUnits="userSpaceOnUse">
          <path d="M16 1 Q8 5 0 1 Q8 8 16 5.5 Q24 8 32 1 Q24 5 16 1Z" fill="rgba(212,175,55,0.75)" />
          <circle cx="16" cy="5" r="1.1" fill="rgba(252,211,77,0.95)" />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill="url(#hdrLotus)" />
    </svg>
  </div>
);

// Robot avatar SVG for support agent
const AgentAvatarSVG = () => (
  <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
    <circle cx="50" cy="50" r="48" fill="#f0fdf4" />
    <path d="M25 80c0-10 8-15 25-15s25 5 25 15v5H25v-5z" fill="#0f172a" />
    <rect x="43" y="58" width="14" height="10" fill="#64748b" />
    <rect x="30" y="26" width="40" height="32" rx="12" fill="#334155" />
    <rect x="35" y="32" width="30" height="20" rx="6" fill="#0f172a" />
    <circle cx="44" cy="42" r="3" fill="#25d366" />
    <circle cx="56" cy="42" r="3" fill="#25d366" />
    <path d="M47 47c1.5 2 4.5 2 6 0" stroke="#25d366" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <rect x="48.5" y="16" width="3" height="10" fill="#64748b" />
    <circle cx="50" cy="14" r="4.5" fill="#25d366" />
    <rect x="25" y="36" width="5" height="12" rx="2" fill="#64748b" />
    <rect x="70" y="36" width="5" height="12" rx="2" fill="#64748b" />
  </svg>
);

const WhatsAppIconSVG = ({ size = 13, style }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    style={{ ...style, display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.967C16.58 1.973 14.107.95 11.49.95c-5.438 0-9.863 4.37-9.866 9.8-.001 2.028.533 4.019 1.545 5.793l-1.016 3.71 3.818-1.002zm11.378-5.328c-.287-.144-1.7-.84-1.962-.935-.264-.096-.456-.144-.648.144-.192.288-.744.935-.912 1.127-.168.193-.336.216-.624.072-1.354-.68-2.317-1.2-3.23-2.766-.24-.413.24-.383.687-1.27.072-.144.036-.271-.018-.379-.054-.108-.456-1.104-.624-1.512-.163-.393-.328-.34-.456-.346-.117-.006-.252-.007-.387-.007s-.354.05-.539.252c-.186.202-.708.693-.708 1.693s.729 1.97 1.83 2.115c.11.015 2.13 3.253 5.16 4.561.72.311 1.282.497 1.721.637.724.23 1.383.197 1.904.12.58-.087 1.7-.695 1.939-1.367.239-.672.239-1.248.168-1.367-.072-.12-.264-.216-.551-.36z" />
  </svg>
);

const getFormattedTime = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WHATSAPP_NUMBER = '917510821228';

const SUGGESTIONS = [
  { 
    label: '🛍️ Order Status & Tracking', 
    text: 'Hi! I would like to get tracking information for my Daivika order.', 
    response: 'I can certainly help you track your order! Let me connect you directly with our order dispatch and tracking desk.' 
  },
  { 
    label: '📦 Product Specification & Details Help', 
    text: 'Hi! I need assistance regarding product specifications or details for Daivika items.', 
    response: 'We want to make sure you get the exact product details! Let me assist you right away.' 
  },
  { 
    label: '🔄 Returns & Exchanges', 
    text: 'Hello! I would like to initiate a return or exchange for my purchase.', 
    response: 'No worries! We offer hassle-free returns. Let me route you to our returns support team to guide you through.' 
  },
  { 
    label: '🤝 Bulk / Custom Orders', 
    text: 'Hi, I would like to discuss wholesale supply or custom bulk product orders.', 
    response: 'We would love to collaborate on bulk orders! I will connect you directly with our B2B partnership team.' 
  }
];

const WhatsAppAssistant = ({ isOpen, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi there! 👋 Welcome to Daivika Support. How can we assist you with your fashion search or order queries today?',
      time: getFormattedTime()
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 1) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  useEffect(() => {
    if (isOpen) {
      setTyping(true);
      const timer = setTimeout(() => {
        setTyping(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSuggestionClick = (sug) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: sug.label,
      time: getFormattedTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setShowSuggestions(false);
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: sug.response,
        time: getFormattedTime(),
        ctaLink: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(sug.text)}`,
        ctaLabel: 'Send Inquiry on WhatsApp 💬'
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1200);
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const typedText = inputValue.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: typedText,
      time: getFormattedTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setShowSuggestions(false);
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'I have compiled your message. Click below to instantly launch WhatsApp and send your query to our support agent.',
        time: getFormattedTime(),
        ctaLink: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(typedText)}`,
        ctaLabel: 'Send Message via WhatsApp 💬'
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1200);
  };

  const handleResetSuggestions = () => {
    setShowSuggestions(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="wa-chat-window"
          initial={{ opacity: 0, x: -30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="wa-chat-header">
            <div className="wa-chat-header-profile">
              <div className="wa-chat-avatar-wrapper">
                <div className="wa-chat-avatar">
                  <AgentAvatarSVG />
                </div>
                <span className="wa-chat-avatar-status"></span>
              </div>
              <div className="wa-chat-info">
                <span className="wa-chat-name">Daivika Assistant</span>
                <span className="wa-chat-status">
                  <span className="wa-chat-status-dot" />
                  Active / Online
                </span>
              </div>
            </div>
            <button 
              className="wa-chat-close-btn" 
              onClick={onClose}
              aria-label="Close Chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="wa-chat-body">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`wa-chat-msg-wrapper ${msg.sender}`}
              >
                <div className={`wa-chat-msg ${msg.sender}`}>
                  <div>{msg.text}</div>
                  
                  {msg.ctaLink && (
                    <a 
                      href={msg.ctaLink}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="wa-chat-cta-btn"
                    >
                      <WhatsAppIconSVG size={13} style={{ marginRight: '4px' }} />
                      {msg.ctaLabel}
                    </a>
                  )}
                </div>
                <span className="wa-chat-msg-time">{msg.time}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {typing && (
              <div className="wa-chat-msg-wrapper bot">
                <div className="wa-chat-msg bot">
                  <div className="wa-typing-indicator">
                    <span className="wa-typing-dot"></span>
                    <span className="wa-typing-dot"></span>
                    <span className="wa-typing-dot"></span>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Suggestions List */}
            {showSuggestions && !typing && (
              <div className="wa-suggestions-container">
                <span className="wa-suggestion-title">Select a query topic:</span>
                {SUGGESTIONS.map((sug, index) => (
                  <button 
                    key={index} 
                    className="wa-suggestion-chip"
                    onClick={() => handleSuggestionClick(sug)}
                  >
                    <span>{sug.label}</span>
                    <ChevronRight size={13} style={{ display: 'inline-block', opacity: 1, transform: 'none' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Reset Suggestions Option */}
            {!showSuggestions && !typing && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                <button 
                  type="button"
                  className="wa-suggestion-chip" 
                  onClick={handleResetSuggestions}
                  style={{ 
                    width: 'auto', 
                    fontSize: '11px', 
                    borderStyle: 'dashed',
                    padding: '6px 12px',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  🔄 View Topic Options
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <div className="wa-chat-footer">
            <form onSubmit={handleSendMessage} className="wa-input-form">
              <input 
                type="text" 
                className="wa-input"
                placeholder="Type a custom message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={typing}
              />
              <button 
                type="submit" 
                className="wa-send-btn" 
                disabled={!inputValue.trim() || typing}
                style={{ 
                  backgroundColor: inputValue.trim() ? '#128c7e' : '#e2e8f0',
                  cursor: inputValue.trim() ? 'pointer' : 'default'
                }}
                aria-label="Send message"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



const isJewelsCategory = () => false;
const isJewelsProduct = () => false;

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getCartCount, isCartOpen, setIsCartOpen, latestProductsMap } = useCart();
  const { getWishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState('/logo-light.png?v=daivika_v3');
  const [brandName, setBrandName] = useState('Daivika');
  const [liveAnnouncements, setLiveAnnouncements] = useState([]);
  const [liveHeaderTicker, setLiveHeaderTicker] = useState([
    { text: "Order now & get it within **2-3 days!**", icon: "Zap" },
    { text: "Free express delivery above **₹500!**", icon: "Truck" },
    { text: "100% Certified **Pure Quality!**", icon: "ShieldCheck" }
  ]);

  const [mounted, setMounted] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [productsFetchLoading, setProductsFetchLoading] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Logo & Announcements loading logic from local storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMounted(true);
    const updateBranding = () => {
      try {
        const savedSettingsStr = localStorage.getItem('vaugun_invoice_settings');
        if (savedSettingsStr) {
          const settings = JSON.parse(savedSettingsStr);
          if (settings.companyLogo && !settings.companyLogo.includes('slaro') && !settings.companyLogo.includes('api/images')) {
            setLogoUrl(settings.companyLogo);
          } else {
            setLogoUrl('/logo-light.png?v=daivika_v3');
          }
          if (settings.companyName) {
            setBrandName(settings.companyName);
          } else {
            setBrandName('Daivika');
          }
          return;
        }
      } catch (e) {
        console.error('Error loading branding settings from local storage:', e);
      }
      setLogoUrl('/logo-light.png?v=daivika_v3');
      setBrandName('Daivika');
    };

    const updateAnnouncements = () => {
      let threshold = 500;
      try {
        const savedTh = localStorage.getItem('vaugun_free_shipping_threshold');
        if (savedTh) threshold = parseInt(savedTh) || 500;
      } catch (e) { }

      try {
        const saved = localStorage.getItem('vaugun_announcements');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveAnnouncements(parsed.map(ann => ({
              ...ann,
              text: ann.text.replace(/₹500/g, `₹${threshold}`).replace(/₹\d+/g, `₹${threshold}`)
            })));
            return;
          }
        }
      } catch (e) {
        console.error('Error loading announcements:', e);
      }
      setLiveAnnouncements([
        { text: `FREE EXPRESS SHIPPING ON ALL ORDERS ABOVE ₹${threshold}`, icon: "Truck" },
        { text: "100% Certified & LAB-TESTED FOR PURITY", icon: "ShieldCheck" },
        { text: "EASY 7-DAY HASSLE-FREE RETURN POLICY", icon: "RefreshCw" }
      ]);
    };

    const updateHeaderTicker = () => {
      let threshold = 500;
      try {
        const savedTh = localStorage.getItem('vaugun_free_shipping_threshold');
        if (savedTh) threshold = parseInt(savedTh) || 500;
      } catch (e) { }

      try {
        const saved = localStorage.getItem('vaugun_header_ticker');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLiveHeaderTicker(parsed.map(tick => ({
              ...tick,
              text: tick.text.replace(/₹500/g, `₹${threshold}`).replace(/₹\d+!/g, `₹${threshold}!`).replace(/₹\d+/g, `₹${threshold}`)
            })));
            return;
          }
        }
      } catch (e) {
        console.error('Error loading header ticker:', e);
      }
      setLiveHeaderTicker([
        { text: "Order now & get it within **2-3 days!**", icon: "Zap" },
        { text: `Free express delivery above **₹${threshold}!**`, icon: "Truck" },
        { text: "100% Certified **Pure Quality!**", icon: "ShieldCheck" }
      ]);
    };

    const loadSettingsFromDB = async () => {
      if (typeof window === 'undefined') return;
      try {
        const res = await fetch(`${API_BASE_URL}/public/settings?t=${Date.now()}`);
        if (res.ok) {
          const resJson = await res.json();
          const data = resJson.data || resJson;
          if (data?.free_shipping_threshold !== undefined) {
            localStorage.setItem('vaugun_free_shipping_threshold', data.free_shipping_threshold);
          }
          if (data?.announcements) {
            localStorage.setItem('vaugun_announcements', JSON.stringify(data.announcements));
          }
          if (data?.header_ticker) {
            localStorage.setItem('vaugun_header_ticker', JSON.stringify(data.header_ticker));
          }
          if (data?.invoice_settings) {
            localStorage.setItem('vaugun_invoice_settings', JSON.stringify(data.invoice_settings));
          }
          if (data?.coupons !== undefined) {
            localStorage.setItem('vaugun_coupons', JSON.stringify(data.coupons));
          }
          if (data?.coupons_enabled !== undefined) {
            localStorage.setItem('vaugun_coupons_enabled', JSON.stringify(data.coupons_enabled));
          }
          if (data?.shipping_policy_settings) {
            localStorage.setItem('vaugun_shipping_policy_settings', JSON.stringify(data.shipping_policy_settings));
          }
          if (data?.returns_settings) {
            localStorage.setItem('vaugun_returns_settings', JSON.stringify(data.returns_settings));
          }
          if (data?.privacy_settings) {
            localStorage.setItem('vaugun_privacy_settings', JSON.stringify(data.privacy_settings));
          }
          if (data?.refund_settings) {
            localStorage.setItem('vaugun_refund_settings', JSON.stringify(data.refund_settings));
          }
          if (data?.terms_settings) {
            localStorage.setItem('vaugun_terms_settings', JSON.stringify(data.terms_settings));
          }

          // Trigger updates on this client
          updateBranding();
          updateAnnouncements();
          updateHeaderTicker();

          window.dispatchEvent(new Event('vaugun_settings_updated'));
        }
      } catch (e) {
        console.warn('Could not load public settings from DB:', e);
      } finally {
        setDataLoading(false);
      }
    };

    updateBranding();
    updateAnnouncements();
    updateHeaderTicker();
    loadSettingsFromDB();

    window.addEventListener('storage', updateBranding);
    window.addEventListener('storage', updateAnnouncements);
    window.addEventListener('storage', updateHeaderTicker);
    window.addEventListener('logo_updated', updateBranding);
    window.addEventListener('vaugun_settings_updated', updateBranding);
    window.addEventListener('vaugun_settings_updated', updateAnnouncements);
    window.addEventListener('vaugun_settings_updated', updateHeaderTicker);

    return () => {
      window.removeEventListener('storage', updateBranding);
      window.removeEventListener('storage', updateAnnouncements);
      window.removeEventListener('storage', updateHeaderTicker);
      window.removeEventListener('logo_updated', updateBranding);
      window.removeEventListener('vaugun_settings_updated', updateBranding);
      window.removeEventListener('vaugun_settings_updated', updateAnnouncements);
      window.removeEventListener('vaugun_settings_updated', updateHeaderTicker);
    };
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarUserMenuOpen, setIsSidebarUserMenuOpen] = useState(false);
  const sidebarUserMenuRef = useRef(null);
  const mobileUserMenuRef = useRef(null);
  const desktopUserMenuRef = useRef(null);

  // Notification system states
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const notificationRef = useRef(null);
  const mobileNotificationRef = useRef(null);
  const desktopNotificationRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const date = new Date(dateStr);
    const diffInSec = Math.floor((now - date) / 1000);
    if (diffInSec < 60) return 'Just now';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
    if (diffInSec < 604800) return `${Math.floor(diffInSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isMobileOutside = !mobileNotificationRef.current || !mobileNotificationRef.current.contains(event.target);
      const isDesktopOutside = !desktopNotificationRef.current || !desktopNotificationRef.current.contains(event.target);
      if (isNotificationOpen && isMobileOutside && isDesktopOutside) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const renderNotificationPopover = (isMobileView = false) => (
    <AnimatePresence>
      {isNotificationOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: isMobileView ? 'fixed' : 'absolute',
            top: isMobileView ? '60px' : 'calc(100% + 12px)',
            left: isMobileView ? '16px' : 'auto',
            right: isMobileView ? '16px' : '-10px',
            margin: isMobileView ? '0 auto' : '0',
            width: isMobileView ? 'calc(100vw - 32px)' : '370px',
            maxWidth: isMobileView ? '390px' : '370px',
            maxHeight: isMobileView ? 'calc(100vh - 120px)' : '480px',
            background: 'linear-gradient(180deg, #fffdf8 0%, #faf3e2 100%)',
            borderRadius: '20px',
            boxShadow: '0 25px 65px rgba(40, 6, 11, 0.35), 0 0 25px rgba(212, 175, 55, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            border: '1.5px solid rgba(212, 175, 55, 0.55)',
            zIndex: 999999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Poppins", sans-serif'
          }}
        >
          {/* Top Temple Gold Accent Strip */}
          <div style={{
            height: '4px',
            background: 'linear-gradient(90deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
            boxShadow: '0 1px 4px rgba(252, 211, 77, 0.4)'
          }} />

          {/* Header */}
          <div style={{
            padding: '0.95rem 1.25rem',
            borderBottom: '1.5px solid rgba(212, 175, 55, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #2b060b 0%, #3d0b10 50%, #200407 100%)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(61, 11, 16, 0.8) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
              }}>
                <Bell size={15} color="#fcd34d" />
              </div>
              <div>
                <div style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#fde68a',
                  letterSpacing: '0.6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>Notifications</span>
                  <span style={{ color: '#c5831a', fontSize: '0.75rem' }}>✦</span>
                </div>
              </div>
              {unreadCount > 0 && (
                <span style={{
                  background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 100%)',
                  color: '#28060b',
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fde68a',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <CheckCheck size={13} color="#fcd34d" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.4rem 0' }}>
            {isNotificationLoading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#92400e', fontSize: '0.85rem' }}>
                <Sparkles size={20} color="#c5831a" style={{ display: 'inline-block', marginBottom: '0.4rem', animation: 'spin 3s linear infinite' }} />
                <div>Seeking sacred updates...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                {/* Traditional Halo Bell Motif */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 0.85rem',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(61, 11, 16, 0.06) 70%, transparent 100%)',
                  border: '1.5px solid rgba(212, 175, 55, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(197, 131, 26, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}>
                  <Bell size={28} color="#c5831a" />
                </div>
                <div style={{
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  color: '#2a0508',
                  letterSpacing: '0.2px',
                  fontFamily: '"Poppins", sans-serif'
                }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: '0.77rem', color: '#78350f', marginTop: '4px', fontWeight: 500 }}>
                  You&apos;re completely up to date with divine grace!
                </div>
                <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '24px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(197, 131, 26, 0.4))' }} />
                  <span style={{ color: '#c5831a', fontSize: '0.7rem' }}>✦ ॐ ✦</span>
                  <span style={{ width: '24px', height: '1px', background: 'linear-gradient(to left, transparent, rgba(197, 131, 26, 0.4))' }} />
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read;
                return (
                  <div
                    key={notif._id || notif.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(notif._id);
                      if (notif.link) {
                        setIsNotificationOpen(false);
                        navigate(notif.link);
                      }
                    }}
                    style={{
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      backgroundColor: isUnread ? 'rgba(212, 175, 55, 0.09)' : 'transparent',
                      borderLeft: isUnread ? '3.5px solid #c5831a' : '3.5px solid transparent',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(212, 175, 55, 0.16)' : 'rgba(212, 175, 55, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(212, 175, 55, 0.09)' : 'transparent'}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: notif.type === 'welcome'
                        ? 'radial-gradient(circle, #3d0b10 0%, #1f0407 100%)'
                        : notif.type === 'promotion'
                        ? 'radial-gradient(circle, #4a0d14 0%, #2b060b 100%)'
                        : 'radial-gradient(circle, #2d1808 0%, #170d04 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                    }}>
                      {notif.type === 'welcome' ? <Sparkles size={17} color="#fcd34d" /> :
                       notif.type === 'promotion' ? <Tag size={17} color="#fcd34d" /> :
                       notif.type === 'order_status' ? <Package size={17} color="#fcd34d" /> :
                       <Bell size={17} color="#fcd34d" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <h5 style={{
                          margin: 0,
                          fontSize: '0.84rem',
                          fontWeight: isUnread ? 800 : 600,
                          color: '#2a0508',
                          lineHeight: 1.3
                        }}>
                          {notif.title}
                        </h5>
                        <span style={{ fontSize: '0.67rem', color: '#92400e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {getRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        margin: '3px 0 0 0',
                        fontSize: '0.77rem',
                        color: '#652a0e',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notif.message}
                      </p>
                    </div>

                    {isUnread && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#c5831a',
                        boxShadow: '0 0 6px #fcd34d',
                        flexShrink: 0,
                        marginTop: '6px'
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.75rem 1.15rem',
            borderTop: '1px solid rgba(212, 175, 55, 0.3)',
            background: 'linear-gradient(180deg, #f7efe1 0%, #ede1cc 100%)',
            textAlign: 'center'
          }}>
            <button
              onClick={() => {
                setIsNotificationOpen(false);
                setShowNotificationModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(61, 11, 16, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                borderRadius: '8px',
                padding: '0.45rem 1.1rem',
                color: '#2b060b',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2b060b';
                e.currentTarget.style.color = '#fcd34d';
                e.currentTarget.style.borderColor = '#c5831a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#2b060b';
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
              }}
            >
              <Bell size={13} color="currentColor" />
              <span>Notification Settings & Push Alerts</span>
              <span style={{ fontSize: '0.65rem', color: '#c5831a' }}>✦</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Animated Search Bar Typewriter Placeholder Effect
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('Search for |');

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isMobileOutside = !mobileUserMenuRef.current || !mobileUserMenuRef.current.contains(event.target);
      const isDesktopOutside = !desktopUserMenuRef.current || !desktopUserMenuRef.current.contains(event.target);
      if (isUserMenuOpen && isMobileOutside && isDesktopOutside) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarUserMenuRef.current && !sidebarUserMenuRef.current.contains(event.target)) {
        setIsSidebarUserMenuOpen(false);
      }
    };
    if (isSidebarUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarUserMenuOpen]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);



  const [placeholderText, setPlaceholderText] = useState('Search products...');

  // Static search placeholder
  useEffect(() => {
    const terms = ['Karungali', 'Rudraksha', 'pooja essentials', 'crystals', 'bracelets', 'pendants', 'malas'];
    let currentIndex = 0;
    if (terms.length > 0) {
      setPlaceholderText(`Search for ${terms[0]}...`);
    }
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % terms.length;
      setPlaceholderText(`Search for ${terms[currentIndex]}...`);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const [navCategories, setNavCategories] = useState([]);

  useEffect(() => {
    const fetchNavCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setNavCategories(data);
        } else if (data && data.data && Array.isArray(data.data)) {
          setNavCategories(data.data);
        } else {
          setNavCategories([]);
        }
      } catch (e) {
        console.error('Navbar category fetch error:', e);
        setNavCategories([]);
      }
    };
    fetchNavCategories();
  }, []);

  // Interactive Scanner Modals States
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [visualSearchScanning, setVisualSearchScanning] = useState(false);
  const [visualSearchResult, setVisualSearchResult] = useState(null);

  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrResult, setQrResult] = useState(null);

  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const searchInputRef = React.useRef(null);

  const registerPushNotificationsSilent = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vaugun_token')}`
        },
        body: JSON.stringify({ subscription })
      });
      console.log('Successfully registered push notifications on server silently.');
    } catch (err) {
      console.error('Failed to register push notifications silently:', err);
    }
  };

  const requestAndRegisterPushNotifications = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notifications permission not granted');
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not found in env configuration');
        return;
      }

      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      }

      await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vaugun_token')}`
        },
        body: JSON.stringify({ subscription })
      });
      console.log('Successfully registered push notifications on server.');
    } catch (err) {
      console.error('Failed to register push notifications:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vaugun_token')}`
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotifications(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleAllowNotifications = async () => {
    setShowNotificationModal(false);
    localStorage.removeItem('show_notification_prompt');
    await requestAndRegisterPushNotifications();
  };

  const handleDeclineNotifications = () => {
    setShowNotificationModal(false);
    localStorage.removeItem('show_notification_prompt');
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) {
      setNotifications([]);
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        if (user) registerPushNotificationsSilent();
      } else if (Notification.permission === 'default') {
        const hasPrompt = localStorage.getItem('show_notification_prompt') === 'true';
        // Show for logged-in users with prompt flag (1.5s), or for any visitor after 10s
        if (hasPrompt || !user) {
          const delay = user ? 1500 : 10000;
          const timer = setTimeout(() => {
            setShowNotificationModal(true);
          }, delay);
          return () => clearTimeout(timer);
        }
      }
    }

    if (user) {
      // Every minute, and only while the tab is visible
      const interval = setInterval(() => { if (document.visibilityState === 'visible') fetchNotifications(); }, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vaugun_token')}`
        },
        body: JSON.stringify({ notificationId })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vaugun_token')}`
        },
        body: JSON.stringify({ markAllRead: true })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const { theme, setTheme, isJewels } = useTheme();

  // Animated Search Bar Typewriter Placeholder Effect
  useEffect(() => {
    let terms = [];

    if (allProducts && allProducts.length > 0) {
      // Filter valid products and shuffle them randomly
      const productNames = allProducts
        .filter(p => p && p.name)
        .map(p => `'${p.name.slice(0, 24).trim()}'`);
      
      // Fisher-Yates random shuffle algorithm
      const shuffled = [...productNames];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      terms = shuffled.slice(0, 15); // Take up to 15 randomly shuffled real product names
    }

    // Fallback if products haven't loaded yet
    if (terms.length === 0) {
      terms = [
        '"1 Mukhi Rudraksha"',
        '"Original Karungali Mala"',
        '"Sacred Tulasi Japa Mala"',
        '"Panchaloha Bangle"',
        '"Brass Pooja Diya"',
        '"Red Sandalwood Mala"',
        '"Energised Gemstones"',
        '"Pure Dhoop & Incense"'
      ];
    }

    let termIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer;

    const typeChar = () => {
      const currentTerm = terms[termIndex % terms.length];
      const typedText = currentTerm.substring(0, charIndex);

      setAnimatedPlaceholder(`Search ${typedText}|`);

      let speed = isDeleting ? 35 : 65;

      if (!isDeleting && charIndex === currentTerm.length) {
        speed = 1800; // Pause at completed keyword with cursor
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        termIndex++;
        speed = 400; // Pause before typing next keyword
      } else if (isDeleting) {
        charIndex--;
      } else {
        charIndex++;
      }

      timer = setTimeout(typeChar, speed);
    };

    timer = setTimeout(typeChar, 300);

    return () => clearTimeout(timer);
  }, [allProducts]);
  const [isCollectionsToggleOpen, setIsCollectionsToggleOpen] = useState(false);
  const [activeSegmentTabState, setActiveSegmentTabState] = useState('daivika');
  const activeSegmentTab = theme;
  const setActiveSegmentTab = (val) => {
    setActiveSegmentTabState(val);
    setTheme(val);
  };
  const [isCategoryAccordionOpen, setIsCategoryAccordionOpen] = useState(false);
  const collectionsToggleRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (collectionsToggleRef.current && !collectionsToggleRef.current.contains(event.target)) {
        setIsCollectionsToggleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sliding delivery ticker state
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    if (liveHeaderTicker.length === 0) return;
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveHeaderTicker.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [liveHeaderTicker]);

  // Sync active categories from URL
  const queryParams = new URLSearchParams(location.search);
  const currentCategory = queryParams.get('category') || 'all';

  useEffect(() => {
    if (latestProductsMap && Object.keys(latestProductsMap).length > 0) {
      setAllProducts(Object.values(latestProductsMap).map(p => ({ ...p, id: p._id || p.id })));
    }
  }, [latestProductsMap]);

  // Lazy load products for search autocomplete if latestProductsMap is empty
  useEffect(() => {
    if ((isSearchFocused || isSearchExpanded) && allProducts.length === 0 && !productsFetchLoading) {
      const fetchLiveProducts = async () => {
        setProductsFetchLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/products`);
          const result = await response.json();
          if (response.ok && result.success) {
            setAllProducts(result.data.map(p => ({ ...p, id: p._id })));
          }
        } catch (err) {
          console.error('Failed to fetch live products for navbar search:', err);
        } finally {
          setProductsFetchLoading(false);
        }
      };
      fetchLiveProducts();
    }
  }, [isSearchFocused, isSearchExpanded, allProducts.length, productsFetchLoading]);

  // Sync search results when lazy-loaded products arrive and user has typed something
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && allProducts.length > 0) {
      const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, isMobile ? 8 : 5);
      setSearchResults(filtered);
    }
  }, [allProducts, searchQuery, isMobile]);

// Categories are fully static — no DB fetch

  useEffect(() => {
    setIsMobile(window.innerWidth <= 1024);
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Threshold for scrolled state
          if (currentScrollY > 50) {
            setIsScrolled(true);
          } else {
            setIsScrolled(false);
          }

          // Always show header at top of page
          if (currentScrollY <= 20) {
            setShowHeader(true);
          } else {
            const diff = currentScrollY - lastScrollY;
            // Only toggle if user scrolled more than 8px to prevent touch jitter/jerking
            if (Math.abs(diff) > 8) {
              if (diff > 0) {
                // Scrolling down: hide header smoothly
                setShowHeader(false);
              } else {
                // Scrolling up: show header smoothly
                setShowHeader(true);
              }
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-focus search input when suggestions open
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  // Close search panel and drop down menus on route change, sync activeSegmentTab
  useEffect(() => {
    setIsSearchFocused(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsMenuOpen(false);
    setIsLeftMenuOpen(false);
    setIsCategoryAccordionOpen(false);
    setIsSearchExpanded(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults([]);
      setIsSearchFocused(false);
    }
  };

  const handleCategoryClick = (tab) => {
    if (tab.dbName === 'all') {
      navigate('/products');
    } else {
      navigate(`/products?category=${encodeURIComponent(tab.dbName)}`);
    }
  };

  // Visual Search Simulation
  const triggerVisualSearch = () => {
    setShowVisualSearch(true);
    setVisualSearchScanning(true);
    setVisualSearchResult(null);

    setTimeout(() => {
      setVisualSearchScanning(false);
      // Mock result: Raw premium streetwear Jar
      setVisualSearchResult({
        id: '60c72b2f9b1d8a0015f8b003',
        name: 'Raw premium streetwear Jar',
        price: 450,
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
        category: 'Daivika Smart Products'
      });
    }, 2500);
  };

  // QR Code Scanner Simulation
  const triggerQrScanner = () => {
    setShowQrScanner(true);
    setQrScanning(true);
    setQrResult(null);

    setTimeout(() => {
      setQrScanning(false);
      // Mock result: Creamy premium fashion wear
      setQrResult({
        id: '60c72b2f9b1d8a0015f8b001',
        name: 'Creamy premium fashion wear',
        price: 299,
        image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
        category: 'Daivika Smart Products'
      });
    }, 2500);
  };

  return (
    <>
      {/* Dynamic Keyframes for seamless scrolling marquee */}
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-scroll-nav {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-lightning {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.18); }
          100% { opacity: 0.7; transform: scale(1); }
        }
        .nav-drawer-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.1rem 0.5rem;
          text-decoration: none;
          transition: all 0.15s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }
        .nav-drawer-link:hover {
          color: #0a0a0a !important;
        }
        .search-bar-input::placeholder {
          color: rgba(255, 255, 255, 0.75) !important;
        }
        .marquee-content-nav {
          display: flex;
          width: max-content;
          animation: marquee-scroll-nav 35s linear infinite;
        }
        .marquee-text-nav {
          padding: 0 1.5rem;
          font-size: 0.68rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 1px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          white-space: nowrap;
        }
        .hide-nav-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-nav-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .category-tab-active {
          background-color: rgba(0, 0, 0, 0.16) !important;
          opacity: 1 !important;
        }
        .category-tab-active::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background-color: #ffffff;
          border-radius: 4px;
        }
        @keyframes pulse-glow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(166, 124, 82, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(166, 124, 82, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(166, 124, 82, 0); }
        }
        @keyframes wiggle-bell {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(-10deg); }
          30% { transform: rotate(10deg); }
          45% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          75% { transform: rotate(-2deg); }
          90% { transform: rotate(2deg); }
        }
        .animate-wiggle {
          animation: wiggle-bell 2.5s infinite;
        }
        @keyframes gold-shimmer-sweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* TOP UNPINNED ANNOUNCEMENT MARQUEE BAR - TRADITIONAL VEDIC STRIP */}
      <div style={{
        background: 'linear-gradient(90deg, #180306 0%, #2b060b 50%, #180306 100%)',
        color: '#ffffff',
        height: '36px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
        fontFamily: "'Poppins', sans-serif",
        userSelect: 'none',
        width: '100%',
        position: 'relative',
        zIndex: 1001,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'marquee-scroll 28s linear infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', paddingRight: '2.5rem' }}>
            {(liveHeaderTicker && liveHeaderTicker.length > 0 ? liveHeaderTicker : [
              { text: "100% ORIGINAL & ENERGISED KARUNGALI & RUDRAKSHA", icon: "Sparkles" },
              { text: "PRANA PRATISHTHA BY VEDIC RITUALS", icon: "Shield" },
              { text: "SACRED DEVOTIONAL PACKAGING ON ALL ORDERS", icon: "Truck" },
              { text: "CERTIFIED NATURAL WOODS, GEMSTONES & PANCHALOHA", icon: "Money" },
              { text: "WORLDWIDE SHIPPING • TRUSTED DEVOTEE CONCIERGE", icon: "Headphones" }
            ]).map((item, idx) => (
              <React.Fragment key={idx}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fde8b8' }}>
                  {renderTickerIcon(item.icon, 13, "#fcd34d")} {item.text.replace(/\*\*/g, '')}
                </span>
                <span style={{ color: '#c5831a', fontSize: '0.75rem', opacity: 0.85 }}>✦</span>
              </React.Fragment>
            ))}
          </div>
          <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', paddingRight: '2.5rem' }}>
            {(liveHeaderTicker && liveHeaderTicker.length > 0 ? liveHeaderTicker : [
              { text: "100% ORIGINAL & ENERGISED KARUNGALI & RUDRAKSHA", icon: "Sparkles" },
              { text: "PRANA PRATISHTHA BY VEDIC RITUALS", icon: "Shield" },
              { text: "SACRED DEVOTIONAL PACKAGING ON ALL ORDERS", icon: "Truck" },
              { text: "CERTIFIED NATURAL WOODS, GEMSTONES & PANCHALOHA", icon: "Money" },
              { text: "WORLDWIDE SHIPPING • TRUSTED DEVOTEE CONCIERGE", icon: "Headphones" }
            ]).map((item, idx) => (
              <React.Fragment key={`dup-${idx}`}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fde8b8' }}>
                  {renderTickerIcon(item.icon, 13, "#fcd34d")} {item.text.replace(/\*\*/g, '')}
                </span>
                <span style={{ color: '#c5831a', fontSize: '0.75rem', opacity: 0.85 }}>✦</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>



      {/* STICKY PINNED HEADER: LOGO ROW + SEARCH BAR ROW */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          fontFamily: '"Poppins", sans-serif',
          background: 'transparent',
          padding: '0',
          transform: 'none'
        }}
      >
        {/* SECTION 3: Main E-Commerce Header - Mobile & Desktop Responsive Structure */}
        {isMobile ? (
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #260509 0%, #3d0b10 40%, #4a0d15 70%, #260509 100%)',
              borderBottom: '1.5px solid rgba(212, 175, 55, 0.45)',
              boxShadow: '0 4px 20px rgba(197, 131, 26, 0.18), 0 8px 25px rgba(36, 6, 11, 0.6)',
              overflow: 'visible'
            }}
          >
            {/* Main Mobile Header Bar (Logo Row) - Pinned */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isScrolled ? '0.4rem 1rem' : '0.5rem 1rem',
              backgroundColor: 'transparent',
              borderBottom: 'none',
              transition: 'padding 0.3s ease'
            }}>
              {/* Left: Hamburger menu toggle */}
              <button
                onClick={() => setIsMenuOpen(true)}
                style={{
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  backgroundColor: 'rgba(212, 175, 55, 0.12)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fde8b8'
                }}
              >
                <Menu size={20} strokeWidth={2.2} color="#fcd34d" />
              </button>

              {/* Center Logo */}
              <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                <img
                  src={logoUrl || defaultLogo}
                  alt={brandName || 'Daivika'}
                  style={{
                    height: isScrolled ? '32px' : '38px',
                    width: 'auto',
                    objectFit: 'contain',
                    transition: 'height 0.3s ease',
                    filter: 'drop-shadow(0 2px 8px rgba(252, 211, 77, 0.25))'
                  }}
                />
              </Link>

              {/* Right Icons: Notification, Profile (User), Cart */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>

                {/* Mobile Notification Bell Button */}
                <div style={{ position: 'relative' }} ref={mobileNotificationRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isScrolled ? '34px' : '36px',
                      height: isScrolled ? '34px' : '36px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      color: '#fde8b8',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      outline: 'none',
                      position: 'relative'
                    }}
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell size={isScrolled ? 16 : 18} strokeWidth={2} color="#fde8b8" />
                    {mounted && unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #ffffff'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {renderNotificationPopover(true)}
                </div>

                {/* Mobile Profile Account Button */}
                <div style={{ position: 'relative' }} ref={mobileUserMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: isScrolled ? '34px' : '36px',
                      height: isScrolled ? '34px' : '36px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      color: '#fde8b8',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    title="Account Menu"
                  >
                    <User size={isScrolled ? 16 : 18} strokeWidth={2} color="#fde8b8" />
                  </button>

                  {/* Account Dropdown Menu on Mobile */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 10px)',
                          right: '-40px',
                          width: '260px',
                          backgroundColor: '#ffffff',
                          borderRadius: '18px',
                          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          zIndex: 999999,
                          overflow: 'hidden',
                          padding: '0.65rem'
                        }}
                      >
                        {user ? (
                          <>
                            {/* Logged in User Card */}
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              marginBottom: '0.4rem',
                              background: 'linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 100%)',
                              borderRadius: '14px'
                            }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Welcome Back</div>
                              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                {user.name || 'Valued Member'}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email || user.phone}
                              </div>
                            </div>

                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <User size={18} color="#360910" />
                              <span>My Profile</span>
                            </button>


                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/wishlist'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Heart size={18} color="#dc2626" />
                              <span>My Wishlist</span>
                            </button>

                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.4rem 0' }} />

                            <button
                              onClick={() => { setIsUserMenuOpen(false); if (logout) logout(); navigate('/'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', fontWeight: 800, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <LogOut size={18} color="#ef4444" />
                              <span>Logout</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Guest Card */}
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              marginBottom: '0.5rem',
                              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                              borderRadius: '14px'
                            }}>
                              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                                Welcome, Guest 👋
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                Login for faster checkout & tracking
                              </div>
                            </div>

                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/login'); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%',
                                padding: '0.7rem',
                                border: 'none',
                                backgroundColor: '#360910',
                                color: '#ffffff',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                boxShadow: '0 4px 14px rgba(54, 9, 16, 0.3)',
                                marginBottom: '0.4rem',
                                transition: 'all 0.2s'
                              }}
                            >
                              <LogIn size={16} color="#ffffff" />
                              <span>Login / Register</span>
                            </button>


                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/wishlist'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Heart size={18} color="#dc2626" />
                              <span>My Wishlist</span>
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsCartOpen(true)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isScrolled ? '34px' : '36px',
                    height: isScrolled ? '34px' : '36px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(212, 175, 55, 0.14)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    color: '#fde8b8',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ShoppingBag size={isScrolled ? 16 : 18} strokeWidth={2} color="#fde8b8" />
                  {getCartCount() > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      backgroundColor: '#991b1b',
                      color: '#fef3c7',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1.5px solid #fcd34d'
                    }}>
                      {getCartCount()}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Full-Width Search Bar - Pinned inside Sticky Header */}
            <div 
              style={{
                padding: '0.4rem 1rem 0.65rem 1rem',
                backgroundColor: 'transparent',
                position: 'relative',
                overflow: 'visible'
              }}
            >
              <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder={animatedPlaceholder || placeholderText || 'Search "1 Mukhi Rudraksha"'}
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim().length >= 2) {
                      const filtered = allProducts.filter(p =>
                        p.name.toLowerCase().includes(val.toLowerCase()) ||
                        p.category.toLowerCase().includes(val.toLowerCase()) ||
                        (p.code && p.code.toLowerCase().includes(val.toLowerCase()))
                      ).slice(0, 5);
                      setSearchResults(filtered);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#fdfbf7',
                    border: '1.5px solid rgba(197, 131, 26, 0.55)',
                    padding: '0 2.5rem 0 2.8rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#2a0508',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15), inset 0 1px 3px rgba(197, 131, 26, 0.08)',
                    fontFamily: '"Plus Jakarta Sans", sans-serif'
                  }}
                />
                <Search
                  size={17}
                  color="#c5831a"
                  style={{
                    position: 'absolute',
                    left: '1.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
              </form>

              {/* Autocomplete Suggestions */}
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '1rem',
                      right: '1rem',
                      marginTop: '0.4rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.25)',
                      border: '1px solid #cbd5e1',
                      zIndex: 99999,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.85rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {searchQuery.trim().length < 1 ? 'Popular Products' : 'Top Matches'}
                      </span>
                    </div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      {(() => {
                        const displayItems = searchQuery.trim().length < 1
                          ? allProducts.slice(0, 5)
                          : (searchResults.length > 0 ? searchResults : allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5));
                        if (displayItems.length > 0) {
                          return displayItems.map((product) => (
                            <div
                              key={product._id || product.id}
                              onClick={() => {
                                navigate(`/product/${product._id || product.id}`);
                                setSearchQuery('');
                                setIsSearchFocused(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.65rem 0.95rem',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                                <img src={typeof product.image === 'string' ? product.image : (product.image?.url || defaultLogo)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h5>
                                <p style={{ margin: 0, fontSize: '0.68rem', color: '#6b7280' }}>₹{product.price}</p>
                              </div>
                            </div>
                          ));
                        }
                        return (
                          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                            No products found matching "{searchQuery}"
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Desktop Header View - Edge-to-Edge Full Width (No Margins/Gaps) */
          <div
            style={{
              height: '74px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: '0 2rem',
              background: isScrolled
                ? 'linear-gradient(135deg, rgba(38, 5, 9, 0.98) 0%, rgba(61, 11, 16, 0.98) 40%, rgba(74, 13, 21, 0.98) 70%, rgba(38, 5, 9, 0.98) 100%)'
                : 'linear-gradient(135deg, #260509 0%, #3d0b10 40%, #4a0d15 70%, #260509 100%)',
              backdropFilter: isScrolled ? 'blur(16px) saturate(180%)' : 'blur(8px)',
              WebkitBackdropFilter: isScrolled ? 'blur(16px) saturate(180%)' : 'blur(8px)',
              borderRadius: '0px',
              borderBottom: '1.5px solid rgba(212, 175, 55, 0.45)',
              boxShadow: isScrolled
                ? '0 6px 25px rgba(197, 131, 26, 0.22), 0 12px 35px rgba(0, 0, 0, 0.55)'
                : '0 4px 20px rgba(197, 131, 26, 0.18), 0 8px 25px rgba(36, 6, 11, 0.5)',
              transition: 'background 0.35s ease, backdrop-filter 0.35s ease, box-shadow 0.35s ease',
              overflow: 'visible'
            }}
          >
            <div style={{
              width: '100%',
              maxWidth: '1560px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem'
            }}>
              {/* Left element: Logo + Navigation links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>

                <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                  <img
                    src={logoUrl || defaultLogo}
                    alt={brandName || 'Daivika'}
                    style={{
                      height: '42px',
                      width: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 8px rgba(252, 211, 77, 0.3))'
                    }}
                  />
                </Link>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <Link
                    to="/products"
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#fde8b8',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      letterSpacing: '0.3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.textShadow = '0 0 10px rgba(252, 211, 77, 0.6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#fde8b8'; e.currentTarget.style.textShadow = 'none'; }}
                  >
                    <span style={{ color: '#fcd34d', fontSize: '0.75rem' }}>✧</span> Products
                  </Link>





                </nav>
              </div>

              {/* Desktop Search Bar */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: '580px', margin: '0 2rem', position: 'relative' }}>
                <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%' }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-bar-input"
                    placeholder={animatedPlaceholder || placeholderText || 'Search "1 Mukhi Rudraksha"'}
                    value={searchQuery}
                    onFocus={(e) => {
                      setIsSearchFocused(true);
                      e.currentTarget.style.backgroundColor = '#fdfbf7';
                      e.currentTarget.style.color = '#2a0508';
                      e.currentTarget.style.borderColor = '#c5831a';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(197, 131, 26, 0.25), 0 8px 24px rgba(0, 0, 0, 0.2)';
                    }}
                    onBlur={(e) => {
                      setTimeout(() => setIsSearchFocused(false), 250);
                      e.currentTarget.style.backgroundColor = 'rgba(253, 246, 232, 0.14)';
                      e.currentTarget.style.color = '#fdf4dc';
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val.trim().length >= 2) {
                        const filtered = allProducts.filter(p =>
                          p.name.toLowerCase().includes(val.toLowerCase()) ||
                          p.category.toLowerCase().includes(val.toLowerCase()) ||
                          (p.code && p.code.toLowerCase().includes(val.toLowerCase()))
                        ).slice(0, 5);
                        setSearchResults(filtered);
                      } else {
                        setSearchResults([]);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '100px',
                      backgroundColor: 'rgba(253, 246, 232, 0.14)',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      padding: '0 2.8rem 0 1.35rem',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#fdf4dc',
                      outline: 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      fontFamily: '"Plus Jakarta Sans", sans-serif'
                    }}
                  />
                  <Search
                    size={16}
                    color="#fcd34d"
                    style={{
                      position: 'absolute',
                      right: '1.2rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.95
                    }}
                  />
                </form>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {isSearchFocused && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 26
                      }}
                      style={{
                        position: 'absolute',
                        top: '120%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'max(100%, 380px)',
                        minWidth: '360px',
                        backgroundColor: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '20px',
                        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.16)',
                        zIndex: 99999,
                        maxHeight: '420px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div
                        style={{
                          padding: '0.75rem 1.25rem',
                          borderBottom: '1px solid #f3f4f6',
                          backgroundColor: '#fafafa',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          whiteSpace: 'nowrap'
                        }}>
                          {searchQuery.trim().length < 1 ? 'Popular Products' : 'Top Matches'}
                        </span>
                      </div>

                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {(() => {
                          const displayItems = searchQuery.trim().length < 1
                            ? allProducts.slice(0, 5)
                            : allProducts.filter(p =>
                              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()))
                            ).slice(0, 5);

                          if (displayItems.length > 0) {
                            return displayItems.map((product) => (
                              <div
                                key={product._id || product.id}
                                onClick={() => {
                                  navigate(`/product/${product._id || product.id}`);
                                  setSearchQuery('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '1rem',
                                  padding: '0.75rem 1.25rem',
                                  borderBottom: '1px solid #f3f4f6',
                                  cursor: 'pointer',
                                  backgroundColor: 'transparent',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <div style={{ width: '42px', height: '42px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f9fafb', border: '1px solid #f1f5f9' }}>
                                  <img
                                    src={typeof product.image === 'string' ? product.image : (product.image?.url || defaultLogo)}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {product.name}
                                  </h4>
                                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>
                                    {product.category}
                                  </p>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  ₹{product.price}
                                </div>
                              </div>
                            ));
                          } else {
                            return (
                              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                                No matches found for "{searchQuery}"
                              </div>
                            );
                          }
                        })()}
                      </div>

                      <Link
                        to={searchQuery ? `/products?search=${encodeURIComponent(searchQuery)}` : '/products'}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          borderTop: '1px solid #f3f4f6',
                          backgroundColor: '#fafafa',
                          display: 'block',
                          textDecoration: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#360910'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                      >
                        View All Results <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop Right Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <Link to="/products" className="premium-header-btn" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: 'linear-gradient(135deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                  backgroundSize: '200% auto',
                  border: '1.5px solid rgba(254, 243, 199, 0.85)',
                  padding: '0.42rem 0.45rem 0.42rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#2a0508',
                  textDecoration: 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  marginLeft: '0.25rem',
                  boxShadow: '0 4px 16px rgba(197, 131, 26, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderRadius = '6px';
                  e.currentTarget.style.boxShadow = '0 6px 22px rgba(252, 211, 77, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderRadius = '6px';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(197, 131, 26, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>🪔</span> Shop Now
                  </span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#2a0508',
                    color: '#fcd34d',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                  }}>
                    <ArrowRight className="arrow-icon-flow" size={13} strokeWidth={2.5} style={{ transform: 'rotate(-45deg)' }} />
                  </span>
                </Link>

                {/* Desktop Cart Button */}
                <button 
                  onClick={() => setIsCartOpen(true)} 
                  style={{
                    position: 'relative',
                    color: '#fde8b8',
                    width: '38px',
                    height: '38px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(212, 175, 55, 0.14)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginLeft: '0.4rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.28)';
                    e.currentTarget.style.borderColor = '#fcd34d';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderRadius = '6px';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.14)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                    e.currentTarget.style.color = '#fde8b8';
                    e.currentTarget.style.borderRadius = '6px';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title="Cart"
                  aria-label="Cart"
                >
                  <ShoppingCart size={16} strokeWidth={2.3} />
                  {mounted && getCartCount() > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#991b1b',
                      color: '#fef3c7',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                      border: '1.5px solid #fcd34d'
                    }}>
                      {getCartCount()}
                    </span>
                  )}
                </button>

                {/* Desktop Notification Bell Button */}
                <div style={{ position: 'relative' }} ref={desktopNotificationRef}>
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    style={{
                      position: 'relative',
                      color: '#fde8b8',
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      marginLeft: '0.3rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.28)';
                      e.currentTarget.style.borderColor = '#fcd34d';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderRadius = '6px';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.14)';
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                      e.currentTarget.style.color = '#fde8b8';
                      e.currentTarget.style.borderRadius = '6px';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell size={16} strokeWidth={2.3} />
                    {mounted && unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)',
                        border: '1.5px solid #ffffff'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {renderNotificationPopover(false)}
                </div>

                {/* Profile Icon Button on Desktop Top Header */}
                <div style={{ position: 'relative' }} ref={desktopUserMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    style={{
                      position: 'relative',
                      color: '#fde8b8',
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      marginLeft: '0.3rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.28)';
                      e.currentTarget.style.borderColor = '#fcd34d';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderRadius = '6px';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.14)';
                      e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                      e.currentTarget.style.color = '#fde8b8';
                      e.currentTarget.style.borderRadius = '6px';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="Account Menu"
                  >
                    <User size={16} strokeWidth={2.3} />
                  </button>

                  {/* Kinzo-Style Account Dropdown Menu */}
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 12px)',
                          right: 0,
                          width: '270px',
                          backgroundColor: '#ffffff',
                          borderRadius: '18px',
                          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          zIndex: 999999,
                          overflow: 'hidden',
                          padding: '0.65rem'
                        }}
                      >
                        {user ? (
                          <>
                            {/* Logged in User Card */}
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              marginBottom: '0.4rem',
                              background: 'linear-gradient(135deg, #FDF2F4 0%, #F9E5E9 100%)',
                              borderRadius: '14px'
                            }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Welcome Back</div>
                              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                {user.name || 'Valued Member'}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email || user.phone}
                              </div>
                            </div>

                            {/* Admin Dashboard Option for Admins */}
                            {(user?.role === 'admin' || user?.role === 'vendor') && (
                              <button
                                onClick={() => { setIsUserMenuOpen(false); navigate(user.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard'); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  width: '100%',
                                  padding: '0.65rem 0.85rem',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  color: '#92400e',
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  textAlign: 'left',
                                  marginBottom: '0.4rem',
                                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                              >
                                <Shield size={18} color="#d97706" />
                                <span>{user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <User size={18} color="#360910" />
                              <span>My Profile</span>
                            </button>


                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/wishlist'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Heart size={18} color="#dc2626" />
                              <span>My Wishlist</span>
                            </button>

                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.4rem 0' }} />

                            <button
                              onClick={() => { setIsUserMenuOpen(false); if (logout) logout(); navigate('/'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', fontSize: '0.85rem', fontWeight: 800, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <LogOut size={18} color="#ef4444" />
                              <span>Logout</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Kinzo-Style Guest Card */}
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              marginBottom: '0.5rem',
                              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                              borderRadius: '14px'
                            }}>
                              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                                Welcome, Guest 👋
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                Login for faster checkout & tracking
                              </div>
                            </div>

                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/login'); }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%',
                                padding: '0.7rem',
                                border: 'none',
                                backgroundColor: '#360910',
                                color: '#ffffff',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                boxShadow: '0 4px 14px rgba(54, 9, 16, 0.3)',
                                marginBottom: '0.4rem',
                                transition: 'all 0.2s'
                              }}
                            >
                              <LogIn size={16} color="#ffffff" />
                              <span>Login / Register</span>
                            </button>


                            <button
                              onClick={() => { setIsUserMenuOpen(false); navigate('/wishlist'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.65rem 0.85rem', border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Heart size={18} color="#dc2626" />
                              <span>My Wishlist</span>
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Menu Button — Right End of Header */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  style={{
                    height: '38px',
                    boxSizing: 'border-box',
                    border: '1.5px solid rgba(212, 175, 55, 0.45)',
                    background: 'rgba(212, 175, 55, 0.14)',
                    cursor: 'pointer',
                    padding: '0 0.95rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    color: '#fde8b8',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    marginLeft: '0.3rem',
                    flexShrink: 0,
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.28)';
                    e.currentTarget.style.borderColor = '#fcd34d';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderRadius = '6px';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.14)';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.45)';
                    e.currentTarget.style.color = '#fde8b8';
                    e.currentTarget.style.borderRadius = '6px';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  title="Open Navigation Menu"
                  aria-label="Open Navigation Menu"
                >
                  <Menu size={16} strokeWidth={2.3} color="#fcd34d" />
                  <span>Menu</span>
                </button>
              </div>
            </div>
          </div>
        )}
        <HeaderLotusBorder />
      </header>

      {/* CATEGORY SUB-BAR: Circular Category Swiper Carousel for Mobile & Desktop */}
      {!location.pathname?.startsWith('/product') && (
        <div style={{
          width: '100%',
          backgroundColor: isJewels ? '#FFF0F5' : '#EDE8D0',
          borderBottom: isJewels ? '1px solid rgba(244, 114, 182, 0.35)' : '1px solid rgba(210, 200, 175, 0.6)',
          borderTop: isJewels ? '1px solid rgba(244, 114, 182, 0.35)' : '1px solid rgba(210, 200, 175, 0.6)',
          position: 'relative',
          zIndex: 900,
          overflow: 'visible'
        }}>
          {/* Circular Category Swiper Carousel */}
          {(() => {
            const displayCategories = navCategories || [];
            if (displayCategories.length === 0) return null;
            return (
              <div 
                className="hide-nav-scrollbar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'flex-start' : 'safe center',
                  gap: isMobile ? '1rem' : '1.75rem',
                  padding: isMobile ? '0.55rem 1rem 0.35rem 1rem' : '0.75rem 1.5rem 0.55rem 1.5rem',
                  overflowX: 'auto',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                  background: isJewels ? 'linear-gradient(180deg, #FFF0F5 0%, #FFE4EC 100%)' : '#EDE8D0',
                  maxWidth: '1440px',
                  margin: '0 auto'
                }}
              >
                {displayCategories.map((cat) => (
                  <div
                    key={cat._id || cat.name}
                    onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flexShrink: 0,
                      width: isMobile ? '74px' : '88px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <div style={{
                      width: isMobile ? '62px' : '68px',
                      height: isMobile ? '62px' : '68px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2.5px solid #ffffff',
                      boxShadow: '0 4px 14px rgba(54, 9, 16, 0.2)',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <img
                        src={cat.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text fill="%2394a3b8" font-family="sans-serif" font-size="12" font-weight="bold" x="50%" y="54%" text-anchor="middle">DAIVIKA</text></svg>'}
                        alt={cat.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text fill="%2394a3b8" font-family="sans-serif" font-size="12" font-weight="bold" x="50%" y="54%" text-anchor="middle">DAIVIKA</text></svg>';
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: isMobile ? '0.74rem' : '0.80rem',
                      fontWeight: 700,
                      color: isJewels ? '#831843' : '#1e293b',
                      marginTop: '0.45rem',
                      textAlign: 'center',
                      width: '100%',
                      whiteSpace: 'normal',
                      wordBreak: 'normal',
                      overflowWrap: 'break-word',
                      lineHeight: '1.2',
                      minHeight: isMobile ? '2.4em' : '2.4em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textTransform: 'capitalize',
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                      letterSpacing: '-0.2px'
                    }}>
                      {(cat.name || '').trim()}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Sticky header is in normal document flow - no spacer needed */}

      {/* MOBILE NAVIGATION DRAWER MENU (Matching reference screenshot items) */}
      <AnimatePresence>
        {(isLeftMenuOpen || isMenuOpen) && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLeftMenuOpen(false);
                setIsMenuOpen(false);
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 10000
              }}
            />

            {/* Side Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '320px',
                maxWidth: '85vw',
                backgroundColor: '#ffffff',
                boxShadow: '20px 0 60px rgba(0, 0, 0, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10001,
                boxSizing: 'border-box',
                overflowY: 'auto'
              }}
            >
              {/* Top Header Card (Matching screenshot: Avatar + Hi, Guest / Log in + Close button X) */}
              <div
                className="newsletter-animated-bg"
                style={{
                  padding: '1.25rem 1.25rem 1.25rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#1e293b',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <User size={22} color="#ffffff" />
                    <span style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '1px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#360910',
                      border: '2px solid #0f172a'
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      Hi, {user ? (user.name || 'Member') : 'Guest'}
                    </div>
                    <button
                      onClick={() => {
                        setIsLeftMenuOpen(false);
                        setIsMenuOpen(false);
                        navigate(user ? '/profile' : '/login');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#eab308',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {user ? 'My Profile' : 'Log in'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                  }}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.1)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation List Items (Matching all green-ticked items from screenshot) */}
              <div style={{ flex: 1, padding: '0.5rem 0' }}>


                {/* Item 2: Best Sellers */}
                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    navigate('/products');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Award size={18} color="#b45309" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>Best Sellers</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>

                {/* Item 3: New Launches */}
                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    navigate('/products');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Zap size={18} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>New Launches</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>


                {/* Item 5: My Account */}

                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    navigate(user ? '/profile' : '/login');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <User size={18} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>My Account</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>

                {/* Item 6: Chat with us */}
                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    setIsSupportOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MessageSquare size={18} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>Chat with us</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>

                {/* Item 7: Careers */}
                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    navigate('/contact');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Store size={18} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>Careers</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>

                {/* Item 8: About us */}
                <div
                  onClick={() => {
                    setIsLeftMenuOpen(false);
                    setIsMenuOpen(false);
                    navigate('/about');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <ShieldCheck size={18} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b' }}>About us</span>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>

                {/* Admin Dashboard Link — visible only for admin users */}
                {(user?.role === 'admin' || user?.role === 'vendor') && (
                  <div
                    onClick={() => {
                      setIsLeftMenuOpen(false);
                      setIsMenuOpen(false);
                      navigate(user.role === 'vendor' ? '/vendor/dashboard' : '/admin/dashboard');
                    }}
                    style={{
                      margin: '1rem 1.25rem 0.5rem 1.25rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Shield size={18} color="#eab308" />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>{user.role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Manage Products & Orders</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#eab308" />
                  </div>
                )}
              </div>

              {/* Footer / Brand Signature */}
              <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', opacity: 0.4, fontSize: '0.68rem', color: '#64748b', letterSpacing: '1px' }}>
                DAIVIKA — CRAFTED WITH ELEGANCE
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* ========================================================================= */}
      {/* MOCK MODAL: VISUAL SEARCH (CAMERA ICON CLICKED) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showVisualSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(20px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#ffffff',
                borderRadius: '28px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                padding: '2rem',
                position: 'relative',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              <button
                onClick={() => setShowVisualSearch(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  border: 'none',
                  background: 'rgba(0,0,0,0.05)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto'
              }}>
                <Camera size={30} strokeWidth={2} />
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                AI Visual Search
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
                Point your camera or upload a photo to identify products instantly.
              </p>

              {visualSearchScanning ? (
                <div>
                  {/* Viewfinder Container */}
                  <div style={{
                    width: '100%',
                    height: '240px',
                    borderRadius: '20px',
                    backgroundColor: '#0f172a',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Viewfinder brackets */}
                    <div style={{ position: 'absolute', top: 20, left: 20, width: 24, height: 24, borderTop: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', top: 20, right: 20, width: 24, height: 24, borderTop: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', bottom: 20, left: 20, width: 24, height: 24, borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', bottom: 20, right: 20, width: 24, height: 24, borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />

                    {/* Scanning Laser Line */}
                    <motion.div
                      animate={{ top: ['5%', '90%', '5%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        left: '5%',
                        right: '5%',
                        height: '3px',
                        background: 'linear-gradient(to right, transparent, #38bdf8, transparent)',
                        boxShadow: '0 0 12px #38bdf8',
                        zIndex: 2
                      }}
                    />

                    {/* Pulsing indicator */}
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        border: '1px dashed #38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Scan size={30} color="#38bdf8" />
                    </motion.div>
                  </div>

                  <div style={{
                    marginTop: '1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <RefreshCw className="animate-spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Analyzing image for certified premium matches...
                  </div>
                </div>
              ) : (
                visualSearchResult && (
                  <div>
                    {/* Visual search matches results layout */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        border: '1px solid rgba(var(--color-primary-rgb), 0.12)',
                        borderRadius: '20px',
                        padding: '1rem',
                        backgroundColor: 'rgba(var(--color-primary-rgb), 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        textAlign: 'left',
                        marginBottom: '1.5rem'
                      }}
                    >
                      <img
                        src={visualSearchResult.image}
                        alt={visualSearchResult.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '14px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: 'var(--color-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: '2px'
                        }}>
                          100% Match Found!
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                          {visualSearchResult.name}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'capitalize' }}>
                          Category: {visualSearchResult.category.split(' & ')[0]}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-primary)', marginTop: '4px' }}>
                          ₹{visualSearchResult.price}
                        </div>
                      </div>
                    </motion.div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={triggerVisualSearch}
                        style={{
                          flex: 1,
                          padding: '0.85rem',
                          backgroundColor: '#f1f5f9',
                          border: 'none',
                          color: '#475569',
                          borderRadius: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Retake Photo
                      </button>
                      <button
                        onClick={() => {
                          setShowVisualSearch(false);
                          navigate(`/product/${visualSearchResult.id}`);
                        }}
                        style={{
                          flex: 1.5,
                          padding: '0.85rem',
                          backgroundColor: 'var(--color-primary)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.2)'
                        }}
                      >
                        View Details <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MOCK MODAL: QR CODE SCANNER (QR ICON CLICKED) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showQrScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(20px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#ffffff',
                borderRadius: '28px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                padding: '2rem',
                position: 'relative',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              <button
                onClick={() => setShowQrScanner(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  border: 'none',
                  background: 'rgba(0,0,0,0.05)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto'
              }}>
                <QrCode size={30} strokeWidth={2} />
              </div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                QR Code Scanner
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
                Hold the camera over a product QR code to read details and checkout instantly.
              </p>

              {qrScanning ? (
                <div>
                  {/* QR Viewfinder Container */}
                  <div style={{
                    width: '100%',
                    height: '240px',
                    borderRadius: '20px',
                    backgroundColor: '#020617',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Viewfinder Target box corners */}
                    <div style={{ position: 'absolute', top: 50, left: 90, width: 20, height: 20, borderTop: '3px solid #360910', borderLeft: '3px solid #360910' }} />
                    <div style={{ position: 'absolute', top: 50, right: 90, width: 20, height: 20, borderTop: '3px solid #360910', borderRight: '3px solid #360910' }} />
                    <div style={{ position: 'absolute', bottom: 50, left: 90, width: 20, height: 20, borderBottom: '3px solid #360910', borderLeft: '3px solid #360910' }} />
                    <div style={{ position: 'absolute', bottom: 50, right: 90, width: 20, height: 20, borderBottom: '3px solid #360910', borderRight: '3px solid #360910' }} />

                    {/* Scanning Red Laser Line */}
                    <motion.div
                      animate={{ top: ['20%', '80%', '20%'] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                      style={{
                        position: 'absolute',
                        left: '25%',
                        right: '25%',
                        height: '2px',
                        backgroundColor: '#ef4444',
                        boxShadow: '0 0 8px #ef4444',
                        zIndex: 2
                      }}
                    />

                    {/* Mock QR Code Pattern */}
                    <div style={{
                      width: '100px',
                      height: '100px',
                      opacity: 0.35,
                      backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)',
                      backgroundSize: '10px 10px',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} />
                  </div>

                  <div style={{
                    marginTop: '1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#360910',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <RefreshCw className="animate-spin" size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Scanning database registry code...
                  </div>
                </div>
              ) : (
                qrResult && (
                  <div>
                    {/* QR scanning result match details */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        border: '1px solid #bbf7d0',
                        borderRadius: '20px',
                        padding: '1rem',
                        backgroundColor: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        textAlign: 'left',
                        marginBottom: '1.5rem'
                      }}
                    >
                      <img
                        src={qrResult.image}
                        alt={qrResult.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '14px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#360910',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: '2px'
                        }}>
                          QR Detected successfully
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                          {qrResult.name}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'capitalize' }}>
                          Category: {qrResult.category.split(' & ')[0]}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-primary)', marginTop: '4px' }}>
                          ₹{qrResult.price}
                        </div>
                      </div>
                    </motion.div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={triggerQrScanner}
                        style={{
                          flex: 1,
                          padding: '0.85rem',
                          backgroundColor: '#f1f5f9',
                          border: 'none',
                          color: '#475569',
                          borderRadius: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Rescan QR
                      </button>
                      <button
                        onClick={() => {
                          setShowQrScanner(false);
                          navigate(`/product/${qrResult.id}`);
                        }}
                        style={{
                          flex: 1.5,
                          padding: '0.85rem',
                          backgroundColor: 'var(--color-primary)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.2)'
                        }}
                      >
                        View product <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Mobile Search Overlay Modal */}
      <AnimatePresence>
        {isMobile && isSearchExpanded && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#041c17', // premium deep premium green background
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              boxSizing: 'border-box'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  autoFocus
                  type="text"
                  placeholder={placeholderText}
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim().length >= 2) {
                      const filtered = allProducts.filter(p =>
                        p.name.toLowerCase().includes(val.toLowerCase()) ||
                        p.category.toLowerCase().includes(val.toLowerCase()) ||
                        (p.code && p.code.toLowerCase().includes(val.toLowerCase()))
                      ).slice(0, 8);
                      setSearchResults(filtered);
                    } else {
                      setSearchResults([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit(e);
                      setIsSearchExpanded(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '24px',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(189, 155, 59, 0.3)',
                    padding: '0 3rem 0 1.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#0a0a0a',
                    outline: 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    fontFamily: '"Poppins", sans-serif',
                    boxSizing: 'border-box'
                  }}
                />
                <Search
                  size={18}
                  color="#0a0a0a"
                  style={{
                    position: 'absolute',
                    right: '1.25rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.8
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setIsSearchExpanded(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  outline: 'none',
                  flexShrink: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Results / Recommendations Section */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }} className="hide-scrollbar">
              {searchQuery.trim().length < 2 ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  Type to search for products...
                </div>
              ) : (

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0a0a0a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {searchResults.map((product) => (
                        <div
                          key={product._id || product.id}
                          onClick={() => {
                            setIsSearchExpanded(false);
                            navigate(`/product/${product._id || product.id}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          <img
                            src={product.image || defaultLogo}
                            alt={product.name}
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.name}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: '#0a0a0a', textTransform: 'capitalize' }}>
                              {product.category}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
                            ₹{product.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                      No matches found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Premium Notification Modal */}
      <AnimatePresence>
        {showNotificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                width: '100%',
                maxWidth: '420px',
                background: 'linear-gradient(180deg, #fffdf8 0%, #faf3e2 100%)',
                border: '1.5px solid rgba(212, 175, 55, 0.55)',
                borderRadius: '24px',
                padding: '2.5rem 2.25rem',
                boxShadow: '0 25px 65px rgba(40, 6, 11, 0.35), 0 0 30px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                color: '#2a0508',
                fontFamily: '"Poppins", sans-serif',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Temple Gold Accent Strip */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #c5831a 0%, #fcd34d 50%, #c5831a 100%)',
                boxShadow: '0 1px 4px rgba(252, 211, 77, 0.4)'
              }} />

              {/* Auspicious corner star ornaments */}
              <span style={{ position: 'absolute', top: '12px', left: '14px', color: 'rgba(197, 131, 26, 0.45)', fontSize: '0.8rem', pointerEvents: 'none' }}>✦</span>
              <span style={{ position: 'absolute', top: '12px', right: '14px', color: 'rgba(197, 131, 26, 0.45)', fontSize: '0.8rem', pointerEvents: 'none' }}>✦</span>

              {/* Decorative Subtle Glowing Background Mesh */}
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '240px',
                  height: '240px',
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(61, 11, 16, 0) 70%)',
                  pointerEvents: 'none',
                  zIndex: 0
                }}
              />

              {/* Pulsing Bell Icon Section */}
              <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '1.4rem', zIndex: 1 }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #3d0b10 0%, #1f0407 100%)',
                    border: '1.5px solid rgba(212, 175, 55, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fcd34d',
                    position: 'relative',
                    boxShadow: '0 4px 18px rgba(197, 131, 26, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <Bell size={28} color="#fcd34d" className="animate-wiggle" />
                </div>
                {/* Micro-dot pulse */}
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#c5831a',
                    border: '2px solid #fffdf8',
                    boxShadow: '0 0 8px rgba(252, 211, 77, 0.8)'
                  }}
                />
              </div>

              {/* Title & Description */}
              <div style={{ position: 'relative', zIndex: 1, marginBottom: '1.75rem' }}>
                <h3
                  style={{
                    margin: '0 0 0.6rem 0',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    letterSpacing: '-0.2px',
                    color: '#2a0508',
                    fontFamily: '"Poppins", sans-serif'
                  }}
                >
                  Receive Sacred Updates
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    color: '#78350f',
                    fontWeight: 400
                  }}
                >
                  Never miss an auspicious update. Receive instant notifications about your energized orders, shipment dispatch, and divine collection alerts.
                </p>
                <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '28px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(197, 131, 26, 0.4))' }} />
                  <span style={{ color: '#c5831a', fontSize: '0.7rem' }}>✦ ॐ ✦</span>
                  <span style={{ width: '28px', height: '1px', background: 'linear-gradient(to left, transparent, rgba(197, 131, 26, 0.4))' }} />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <button
                  onClick={handleAllowNotifications}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #2b060b 0%, #3d0b10 50%, #200407 100%)',
                    color: '#fde68a',
                    border: '1px solid rgba(212, 175, 55, 0.45)',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 6px 18px rgba(40, 6, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(40, 6, 11, 0.35), 0 0 14px rgba(252, 211, 77, 0.4)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(40, 6, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#fde68a';
                  }}
                >
                  <Bell size={15} color="#fcd34d" />
                  <span>Enable Sacred Alerts</span>
                  <span style={{ fontSize: '0.7rem', color: '#c5831a' }}>✦</span>
                </button>
                <button
                  onClick={handleDeclineNotifications}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(212, 175, 55, 0.08)',
                    color: '#78350f',
                    border: '1px solid rgba(212, 175, 55, 0.35)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.18)';
                    e.currentTarget.style.color = '#2a0508';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.08)';
                    e.currentTarget.style.color = '#78350f';
                  }}
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsAppAssistant isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* ADVANCED THEMED MOBILE FLOATING BOTTOM NAVIGATION BAR */}
      {isMobile && location.pathname !== '/checkout' && (
        <AnimatePresence>
          {true && (
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{
                position: 'fixed',
                bottom: '16px',
                left: 0,
                right: 0,
                marginLeft: 'auto',
                marginRight: 'auto',
                width: 'calc(100% - 32px)',
                maxWidth: '420px',
                zIndex: 99999,
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 8px',
                  borderRadius: '100px',
                  backgroundColor: 'rgba(54, 9, 16, 0.92)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 12px 35px rgba(54, 9, 16, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {[
                  {
                    id: 'home',
                    label: 'Home',
                    icon: Home,
                    isActive: location.pathname === '/',
                    action: () => navigate('/')
                  },
                  {
                    id: 'shop',
                    label: 'Shop',
                    icon: Store,
                    isActive: location.pathname.startsWith('/products'),
                    action: () => navigate('/products')
                  },
                  {
                    id: 'cart',
                    label: 'Cart',
                    icon: ShoppingCart,
                    badge: getCartCount(),
                    isActive: isCartOpen || location.pathname === '/cart',
                    action: () => setIsCartOpen(true)
                  },
                  {
                    id: 'profile',
                    label: 'Profile',
                    icon: User,
                    isActive: location.pathname.startsWith('/profile') || location.pathname === '/login',
                    action: () => {
                      if (user) {
                        navigate('/profile');
                      } else {
                        navigate('/login');
                      }
                    }
                  }
                ].map((item) => {
                  const IconComp = item.icon;
                  const active = item.isActive;
                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.88 }}
                      onClick={item.action}
                      style={{
                        width: '72px',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 0',
                        borderRadius: '100px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                        cursor: 'pointer',
                        outline: 'none',
                        zIndex: 2,
                        transition: 'color 0.2s ease',
                        gap: '2px'
                      }}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeBottomNavPill"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '100px',
                            background: 'linear-gradient(135deg, #360910 0%, #54111c 100%)',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
                            zIndex: -1
                          }}
                        />
                      )}

                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComp size={20} strokeWidth={active ? 2.5 : 2} color={active ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'} />
                        {item.badge !== undefined && item.badge > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-8px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 900,
                            borderRadius: '100px',
                            minWidth: '16px',
                            height: '16px',
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid #ffffff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: active ? 800 : 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        letterSpacing: '-0.1px',
                        lineHeight: 1
                      }}>
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default Navbar;


