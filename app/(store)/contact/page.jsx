'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import AnimatedTitle from '@/components/AnimatedTitle';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import { useAlert } from '@/context/AlertContext';
import { API_BASE_URL } from '@/config';
import SubPageHeader from '@/components/SubPageHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import { refreshCompanyDetails } from '@/lib/company-details';

const Contact = () => {
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [contactSettings, setContactSettings] = useState({
    companyName: 'DAIVIKA Store',
    companyEmail: 'daivikaofficial77@gmail.com',
    companyPhone: '+91 75108 21228',
    companyStreet: 'Kuriyedam, Ayikkarapadi',
    companyCity: 'Malappuram',
    companyState: 'Kerala',
    companyPin: '673637',
    contactEmailSubtitle: 'Drop us a line and our executive concierge team will respond within 4 business hours.',
    contactPhoneSubtitle: 'Mon \u2013 Sat: 9:00 AM to 6:00 PM IST. Standard calling rates apply.',
    contactAddressSubtitle: 'Visit our design flagship experience store or send your return parcels to:'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dynamic Contact Us metadata and premium Google corporate address LocalBusiness schema markup
  useDocumentSEO({
    title: 'Contact Support & Corporate Inquiries | DAIVIKA',
    description: 'Get in touch with DAIVIKA support. Reach out via email, phone, or message for inquiries, bulk orders, and customer support.',
    schema: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "mainEntity": {
        "@type": "LocalBusiness",
        "name": contactSettings.companyName,
        "email": contactSettings.companyEmail,
        "telephone": contactSettings.companyPhone,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": contactSettings.companyStreet,
          "addressLocality": contactSettings.companyCity,
          "addressRegion": contactSettings.companyState,
          "postalCode": contactSettings.companyPin,
          "addressCountry": "IN"
        }
      }
    }
  });

  useEffect(() => {
    const loadContactSettings = () => {
      try {
        const saved = localStorage.getItem('vaugun_invoice_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setContactSettings({
            companyName: parsed.companyName || 'DAIVIKA Store',
            companyEmail: parsed.companyEmail || 'daivikaofficial77@gmail.com',
            companyPhone: parsed.companyPhone || '+91 75108 21228',
            companyStreet: parsed.companyStreet || 'Kuriyedam, Ayikkarapadi',
            companyCity: parsed.companyCity || 'Malappuram',
            companyState: parsed.companyState || 'Kerala',
            companyPin: parsed.companyPin || '673637',
            contactEmailSubtitle: parsed.contactEmailSubtitle || 'Drop us a line and our executive concierge team will respond within 4 business hours.',
            contactPhoneSubtitle: parsed.contactPhoneSubtitle || 'Mon \u2013 Sat: 9:00 AM to 6:00 PM IST. Standard calling rates apply.',
            contactAddressSubtitle: parsed.contactAddressSubtitle || 'Visit our design flagship experience store or send your return parcels to:'
          });
        } else {
          setContactSettings(prev => ({
            ...prev,
            companyName: 'DAIVIKA Store'
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadContactSettings();
    refreshCompanyDetails();
    window.addEventListener('storage', loadContactSettings);
    window.addEventListener('vaugun_settings_updated', loadContactSettings);
    window.addEventListener('vaugun_store_gender_changed', loadContactSettings);
    return () => {
      window.removeEventListener('storage', loadContactSettings);
      window.removeEventListener('vaugun_settings_updated', loadContactSettings);
      window.removeEventListener('vaugun_store_gender_changed', loadContactSettings);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setShowSuccessModal(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        showAlert(data.message || 'Failed to send message. Please try again.', 'Contact Support');
      }
    } catch (err) {
      console.error(err);
      showAlert('Network error. Failed to reach the server.', 'Connection Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <SubPageHeader title="Contact Us" subtitle="Contact Support" />

      <div className="contact-page-main" style={{ paddingTop: '1rem', paddingBottom: '8rem' }}>
        <div className="container">

          <div className="contact-grid" style={{
            gap: 'clamp(2.5rem, 6vw, 6rem)',
            alignItems: 'start',
            maxWidth: '1560px',
            margin: '2rem auto 0 auto'
          }}>

            {/* Left side: Luxury Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="contact-info-card"
                style={{
                  border: '1px solid rgba(27, 60, 44, 0.08)',
                  borderRadius: '24px',
                  padding: '2.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s ease-out'
                }}
                whileHover={{
                  borderColor: 'var(--color-primary)',
                  boxShadow: '0 12px 25px rgba(166, 124, 82, 0.05)',
                  y: -2
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{
                    backgroundColor: 'rgba(166, 124, 82, 0.1)',
                    borderRadius: '16px',
                    padding: '0.9rem',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={22} />
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.4rem', fontFamily: "'Poppins', sans-serif" }}>Email Support</h4>
                    <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: '1.5', margin: '0 0 1rem 0', fontWeight: 500 }}>
                      {contactSettings.contactEmailSubtitle}
                    </p>
                    <a
                      href={`mailto:${contactSettings.companyEmail}`}
                      style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', transition: 'opacity 0.2s', wordBreak: 'break-all' }}
                      onMouseEnter={(e) => e.target.style.opacity = 0.8}
                      onMouseLeave={(e) => e.target.style.opacity = 1}
                    >
                      {contactSettings.companyEmail}
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="contact-info-card"
                style={{
                  border: '1px solid rgba(27, 60, 44, 0.08)',
                  borderRadius: '24px',
                  padding: '2.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s ease-out'
                }}
                whileHover={{
                  borderColor: 'var(--color-primary)',
                  boxShadow: '0 12px 25px rgba(166, 124, 82, 0.05)',
                  y: -2
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{
                    backgroundColor: 'rgba(166, 124, 82, 0.1)',
                    borderRadius: '16px',
                    padding: '0.9rem',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Phone size={22} />
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.4rem', fontFamily: "'Poppins', sans-serif" }}>Phone Support</h4>
                    <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: '1.5', margin: '0 0 1rem 0', fontWeight: 500 }}>
                      {contactSettings.contactPhoneSubtitle}
                    </p>
                    {contactSettings.companyPhone.split(/[,/]+/).map((phone, idx) => {
                      const trimmed = phone.trim();
                      return (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span style={{ color: '#ccc', margin: '0 0.5rem' }}>|</span>}
                          <a
                            href={`tel:${trimmed.replace(/\s+/g, '')}`}
                            style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none', transition: 'opacity 0.2s', wordBreak: 'break-all' }}
                            onMouseEnter={(e) => e.target.style.opacity = 0.8}
                            onMouseLeave={(e) => e.target.style.opacity = 1}
                          >
                            {trimmed}
                          </a>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="contact-info-card"
                style={{
                  border: '1px solid rgba(27, 60, 44, 0.08)',
                  borderRadius: '24px',
                  padding: '2.5rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s ease-out'
                }}
                whileHover={{
                  borderColor: 'var(--color-primary)',
                  boxShadow: '0 12px 25px rgba(166, 124, 82, 0.05)',
                  y: -2
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{
                    backgroundColor: 'rgba(166, 124, 82, 0.1)',
                    borderRadius: '16px',
                    padding: '0.9rem',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MapPin size={22} />
                  </div>
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.4rem', fontFamily: "'Poppins', sans-serif" }}>Headquarters</h4>
                    <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: '1.5', margin: '0 0 1rem 0', fontWeight: 500 }}>
                      {contactSettings.contactAddressSubtitle}
                    </p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#111', margin: 0, lineHeight: '1.6' }}>
                      {contactSettings.companyStreet}<br />
                      {contactSettings.companyCity}, {contactSettings.companyState} – {contactSettings.companyPin}
                    </p>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* Right side: High-fidelity Contact Form - LUXURY VIOLET THEMED */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="contact-form-card"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '32px',
                padding: '3rem',
                border: '1px solid rgba(27, 60, 44, 0.08)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{
                  backgroundColor: 'rgba(166, 124, 82, 0.1)',
                  borderRadius: '50%',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={18} color="var(--color-primary)" />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', fontFamily: "'Poppins', sans-serif" }}>Drop Us A Message</h3>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. John Doe"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(166, 124, 82, 0.2)',
                      outline: 'none',
                      fontSize: '0.9rem',
                      color: '#111',
                      fontWeight: 500,
                      backgroundColor: '#fff',
                      transition: 'all 0.25s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(166, 124, 82, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(166, 124, 82, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="contact-form-fields-row" style={{ gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. john@example.com"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(166, 124, 82, 0.2)',
                        outline: 'none',
                        fontSize: '0.9rem',
                        color: '#111',
                        fontWeight: 500,
                        backgroundColor: '#fff',
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(166, 124, 82, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(166, 124, 82, 0.2)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Subject</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g. Order Tracking"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(166, 124, 82, 0.2)',
                        outline: 'none',
                        fontSize: '0.9rem',
                        color: '#111',
                        fontWeight: 500,
                        backgroundColor: '#fff',
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--color-primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(166, 124, 82, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(166, 124, 82, 0.2)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Your Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="How can we help you today?"
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(166, 124, 82, 0.2)',
                      outline: 'none',
                      fontSize: '0.9rem',
                      color: '#111',
                      fontWeight: 500,
                      backgroundColor: '#fff',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      lineHeight: '1.5',
                      boxSizing: 'border-box',
                      transition: 'all 0.25s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(166, 124, 82, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(166, 124, 82, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1.1rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    transition: 'all 0.2s ease',
                    opacity: isSubmitting ? 0.7 : 1,
                    boxShadow: '0 10px 20px rgba(166, 124, 82, 0.15)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
                >
                  {isSubmitting ? (
                    'Sending Message...'
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send size={16} />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Success Notification Modal overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)'
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                border: '1px solid #f0f0f0',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                zIndex: 1,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
              }}
            >
              <div style={{
                backgroundColor: 'rgba(166, 124, 82, 0.05)',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111', marginBottom: '0.5rem' }}>Message Dispatched</h4>
                <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.5', margin: 0, fontWeight: 500 }}>
                  Your inquiry has been successfully sent to the {contactSettings.companyName} curators. We will contact you back shortly.
                </p>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Contact;
