import React, { useState, useEffect } from 'react';
import { Link } from '@/hooks/useRouterShim';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAlert } from '@/context/AlertContext';
import { useTheme } from '@/context/ThemeContext';

import { API_BASE_URL } from '@/config';
const defaultLogo = '/logo-light.png?v=daivika_v3';

const Footer = () => {
  const { showAlert } = useAlert();
  const [categories, setCategories] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/logo-light.png?v=daivika_v3');
  const [brandName, setBrandName] = useState('Daivika');

  useEffect(() => {
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
        console.error('Error loading branding settings in footer:', e);
      }
      setLogoUrl('');
      setBrandName('Daivika');
    };

    updateBranding();

    window.addEventListener('storage', updateBranding);
    window.addEventListener('logo_updated', updateBranding);
    window.addEventListener('vaugun_settings_updated', updateBranding);

    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('storage', updateBranding);
      window.removeEventListener('logo_updated', updateBranding);
      window.removeEventListener('vaugun_settings_updated', updateBranding);
    };
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setSubmittingNewsletter(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      const data = await res.json();
      if (data.success) {
        showAlert(data.message || 'Successfully subscribed! ✉️', 'Newsletter');
        setNewsletterEmail('');
      } else {
        showAlert(data.message || 'Subscription failed.', 'Newsletter Error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Subscription failed. Connection issue.', 'Network Error');
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  const dynamicCategoryLinks = React.useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.slice(0, 5).map(cat => ({
        label: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
        to: `/products?category=${encodeURIComponent(cat.name)}`
      }));
    }
    return [];
  }, [categories]);

const FooterLotusBorder = () => (
  <svg width="100%" height="14" viewBox="0 0 400 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <defs>
      <pattern id="footerLotusPattern" x="0" y="0" width="40" height="14" patternUnits="userSpaceOnUse">
        <path d="M20 13 Q10 7 0 13 Q10 1 20 4 Q30 1 40 13 Q30 7 20 13Z" fill="rgba(212,175,55,0.55)" />
        <circle cx="20" cy="5" r="2" fill="rgba(252,211,77,0.75)" />
      </pattern>
    </defs>
    <rect width="100%" height="14" fill="url(#footerLotusPattern)" />
  </svg>
);

  return (
    <footer className="footer-root newsletter-animated-bg" style={{
      color: '#ffffff',
      background: 'linear-gradient(180deg, #28060b 0%, #1a0306 45%, #100204 100%)',
      paddingTop: '0',
      paddingBottom: '2.5rem',
      position: 'relative',
      fontFamily: '"Poppins", sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Traditional Lotus Top Border Strip */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg, rgba(61, 11, 16, 0.95) 0%, rgba(40, 6, 11, 0.98) 100%)',
        borderTop: '2px solid rgba(212, 175, 55, 0.55)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
        lineHeight: 0
      }}>
        <FooterLotusBorder />
      </div>

      <div className="container" style={{ maxWidth: '1560px', margin: '0 auto', boxSizing: 'border-box', paddingTop: '4rem' }}>
        
        {/* Main 4-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1.2fr 1fr',
          gap: 'clamp(2rem, 3.5vw, 4rem)',
          paddingBottom: '3rem',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          
          {/* Column 1: Brand Info with Logo, Divine Eye Badge, Bio & Brass Social Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: '440px' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
              <img 
                src={logoUrl || defaultLogo} 
                alt={`${brandName} Logo`} 
                style={{ 
                  height: '46px', 
                  width: 'auto', 
                  objectFit: 'contain', 
                  display: 'block',
                  filter: 'drop-shadow(0 2px 10px rgba(252, 211, 77, 0.32))'
                }}
              />
            </Link>

            <p style={{
              fontSize: '0.92rem',
              color: 'rgba(253, 244, 220, 0.82)',
              lineHeight: 1.7,
              margin: 0,
              fontWeight: 400
            }}>
              A little touch of divinity, woven into the essence of everyday life. Inspired by the eternal wisdom of sacred traditions, we bring the grace of the divine closer to you, celebrating the beauty of faith, the warmth of devotion, and the timeless presence of the sacred in life’s every moment.
            </p>
            
            {/* Brass-Ringed Social Links */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {[
                {
                  name: 'Instagram',
                  icon: <i className="fa-brands fa-instagram" style={{ fontSize: '18px' }}></i>,
                  href: 'https://www.instagram.com/zodimithra/'
                },
                {
                  name: 'Facebook',
                  icon: <i className="fa-brands fa-facebook-f" style={{ fontSize: '16px' }}></i>,
                  href: 'https://www.facebook.com/profile.php?id=61585091964229&mibextid=ZbWKwL'
                },
                {
                  name: 'WhatsApp',
                  icon: <i className="fa-brands fa-whatsapp" style={{ fontSize: '18px' }}></i>,
                  href: 'https://wa.me/917510821228'
                }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  aria-label={`Follow DAIVIKA on ${social.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.12)',
                    border: '1px solid rgba(212, 175, 55, 0.42)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fcd34d',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fcd34d';
                    e.currentTarget.style.color = '#28060b';
                    e.currentTarget.style.borderColor = '#fde68a';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(252, 211, 77, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.12)';
                    e.currentTarget.style.color = '#fcd34d';
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.42)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Collections */}
          <div>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.8px',
              color: '#fde68a',
              marginBottom: '1.4rem',
              marginTop: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <span style={{ color: '#c5831a', fontSize: '0.75rem' }}>✦</span>
              Shop Now
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dynamicCategoryLinks.map((link, i) => (
                <li key={i} style={{ marginBottom: '0.85rem' }}>
                  <Link to={link.to} style={{
                    color: 'rgba(253, 244, 220, 0.85)',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    transition: 'all 0.25s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fcd34d';
                    e.currentTarget.style.textShadow = '0 0 10px rgba(252, 211, 77, 0.45)';
                    e.currentTarget.style.transform = 'translateX(6px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(253, 244, 220, 0.85)';
                    e.currentTarget.style.textShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Care / Support */}
          <div>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.8px',
              color: '#fde68a',
              marginBottom: '1.4rem',
              marginTop: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <span style={{ color: '#c5831a', fontSize: '0.75rem' }}>✦</span>
              Support
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'About DAIVIKA', to: '/about' },
                { label: 'Contact Us', to: '/contact' },
                { label: 'Help & FAQs', to: '/faq' },
                { label: 'Shipping Policy', to: '/shipping-policy' },
                { label: 'Returns & Exchanges', to: '/returns-exchanges' }
              ].map((link, i) => (
                <li key={i} style={{ marginBottom: '0.85rem' }}>
                  <Link to={link.to} style={{
                    color: 'rgba(253, 244, 220, 0.85)',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    transition: 'all 0.25s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fcd34d';
                    e.currentTarget.style.textShadow = '0 0 10px rgba(252, 211, 77, 0.45)';
                    e.currentTarget.style.transform = 'translateX(6px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(253, 244, 220, 0.85)';
                    e.currentTarget.style.textShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal / Policies */}
          <div>
            <h4 style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.8px',
              color: '#fde68a',
              marginBottom: '1.4rem',
              marginTop: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <span style={{ color: '#c5831a', fontSize: '0.75rem' }}>✦</span>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'Privacy Policy', to: '/privacy-policy' },
                { label: 'Terms of Service', to: '/terms-of-service' },
                { label: 'Refund Policy', to: '/refund-policy' }
              ].map((link, i) => (
                <li key={i} style={{ marginBottom: '0.85rem' }}>
                  <Link to={link.to} style={{
                    color: 'rgba(253, 244, 220, 0.85)',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    transition: 'all 0.25s ease',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fcd34d';
                    e.currentTarget.style.textShadow = '0 0 10px rgba(252, 211, 77, 0.45)';
                    e.currentTarget.style.transform = 'translateX(6px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(253, 244, 220, 0.85)';
                    e.currentTarget.style.textShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(212, 175, 55, 0.16)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          fontSize: '0.85rem',
          color: 'rgba(253, 244, 220, 0.75)'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'rgba(253, 244, 220, 0.75)', letterSpacing: '0.6px', fontWeight: 500 }}>
            &copy; 2026 Daivika | Powered by <a href="https://www.zodimithra.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fcd34d', fontWeight: 700, textDecoration: 'none' }}>ZodiMithra</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#fde68a', fontWeight: 700, marginRight: '0.25rem' }}>Secure Payments:</span>
            
            {/* Razorpay Badge */}
            <div style={{ padding: '0.25rem 0.6rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.35rem', height: '22px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fde68a', letterSpacing: '0.5px' }}>Razorpay</span>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0284c7' }}></div>
            </div>

            {/* UPI Badge */}
            <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fde68a', letterSpacing: '0.5px', fontStyle: 'italic' }}>UPI</span>
            </div>

            {/* Visa Badge */}
            <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#1a1f71', backgroundColor: '#ffffff', padding: '0px 4px', borderRadius: '3px' }}>VISA</span>
            </div>

            {/* Mastercard Badge */}
            <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', height: '22px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eb001b' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f00', marginLeft: '-4px' }}></div>
              <span style={{ fontSize: '0.6rem', color: '#fde68a', fontWeight: 700 }}>mc</span>
            </div>

            {/* RuPay Badge */}
            <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fde68a', letterSpacing: '0.5px' }}>RuPay</span>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
          .footer-root {
            text-align: center !important;
            padding-top: 4rem !important;
            padding-bottom: 100px !important;
          }
          .footer-root ul {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .footer-root div {
            justify-content: center !important;
          }
          .footer-root > .container > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 3rem !important;
          }
          .footer-root > .container > div:first-child > div:first-child {
            align-items: center !important;
          }
          .footer-root form {
            max-width: 320px;
            margin: 0 auto;
          }
          .footer-root > .container > div:last-child {
            flex-direction: column !important;
            text-align: center !important;
            gap: 1.25rem !important;
          }
        }
      `}} />
    </footer>
  );
};

export default Footer;

