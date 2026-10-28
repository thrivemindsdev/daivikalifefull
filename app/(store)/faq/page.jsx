'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, MessageSquare, Mail, Phone } from 'lucide-react';
import AnimatedTitle from '@/components/AnimatedTitle';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import SubPageHeader from '@/components/SubPageHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import { refreshCompanyDetails } from '@/lib/company-details';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <div style={{
      marginBottom: '1rem',
      borderRadius: '24px',
      border: '1px solid #f0f0f0',
      backgroundColor: isOpen ? '#fafafa' : '#fff',
      overflow: 'hidden',
      transition: 'all 0.4s ease',
      maxWidth: '800px',
      margin: '0 auto 1rem auto'
    }}>
      <button
        onClick={onClick}
        style={{
          width: '100%',
          padding: 'clamp(1.25rem, 5vw, 2.5rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          gap: '1.5rem'
        }}
      >
        <h3 style={{
          fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
          fontWeight: 700,
          color: isOpen ? 'var(--color-primary)' : '#111',
          transition: 'color 0.3s ease',
          lineHeight: 1.4
        }}>
          {question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          style={{
            color: isOpen ? 'var(--color-primary)' : '#999',
            backgroundColor: isOpen ? '#fff' : 'transparent',
            width: 'clamp(36px, 10vw, 44px)',
            height: 'clamp(36px, 10vw, 44px)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isOpen ? '1px solid #eee' : '1px solid #eee',
            flexShrink: 0
          }}
        >
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <div style={{
              padding: '0 clamp(1.25rem, 5vw, 2.5rem) clamp(1.25rem, 5vw, 2.5rem) clamp(1.25rem, 5vw, 2.5rem)',
              color: '#666',
              lineHeight: 1.8,
              fontSize: 'clamp(0.9rem, 3vw, 1.05rem)',
              maxWidth: '100%'
            }}>
              <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--color-primary)', marginBottom: '1.25rem', opacity: 0.3 }} />
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const defaultFaqs = [
  {
    category: "Orders",
    question: "How long does shipping take?",
    answer: "Our standard express shipping takes 3-5 business days across India. Every order is packed with devotional care and protective sanctified packaging."
  },
  {
    category: "Orders",
    question: "How can I track my sacred order?",
    answer: "Once your order is consecrated and dispatched, you will receive an SMS and email with a live tracking number to follow your package directly."
  },
  {
    category: "Returns & Exchanges",
    question: "What is your return and exchange policy?",
    answer: "Due to the sacred and energised nature of our spiritual wearables and pooja items, we maintain a strict policy. If an item arrives damaged, we provide immediate assistance and replacements."
  },
  {
    category: "Returns & Exchanges",
    question: "What if I receive a damaged or incorrect item?",
    answer: "Every order undergoes strict sanctity and quality inspection before dispatch. If you receive a transit-damaged item, please contact us on WhatsApp at +91 75108 21228 within 24 hours with photos, and we will immediately send a blessed replacement."
  },
  {
    category: "Product",
    question: "Are the Karungali wood and Rudrakshas 100% authentic and natural?",
    answer: "Yes, 100%. All our Karungali (Ebony wood) malas, Himalayan Rudrakshas, and sacred Tulasi beads are 100% natural, pure, and authentic. They are ethically harvested without artificial dyes or harmful chemicals."
  },
  {
    category: "Product",
    question: "Are your spiritual malas and wearables energised (Prana Pratishtha)?",
    answer: "Yes. Every sacred mala, yantra, and spiritual wearable undergoes authentic Vedic Prana Pratishtha rituals and mantra chanting by qualified Vedic priests to invoke divine blessings before reaching you."
  }
];

const FAQ = () => {
  const [faqData, setFaqData] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState(0);
  const [contactSettings, setContactSettings] = useState({
    companyEmail: 'support@daivika.in',
    companyPhone: '+91 75108 21228'
  });

  useDocumentSEO({
    title: 'Help & FAQs | DAIVIKA by Zodimithra - Authentic Spiritual Wearables',
    description: 'Find answers to common questions about Daivika by Zodimithra Karungali malas, Rudraksha energisation, shipping, tracking, and devotee support.',
    schema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    }
  });

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedFaqs = localStorage.getItem('vaugun_faqs');
        if (savedFaqs) {
          setFaqData(JSON.parse(savedFaqs));
        } else {
          setFaqData(defaultFaqs);
        }

        const savedInvoice = localStorage.getItem('vaugun_invoice_settings');
        if (savedInvoice) {
          const parsed = JSON.parse(savedInvoice);
          setContactSettings({
            companyEmail: parsed.companyEmail || 'support@daivika.in',
            companyPhone: parsed.companyPhone || '+91 75108 21228'
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadSettings();
    refreshCompanyDetails();
    window.addEventListener('storage', loadSettings);
    window.addEventListener('vaugun_settings_updated', loadSettings);
    return () => {
      window.removeEventListener('storage', loadSettings);
      window.removeEventListener('vaugun_settings_updated', loadSettings);
    };
  }, []);

  const categories = ['All', ...Array.from(new Set(faqData.map(faq => faq.category).filter(Boolean)))];

  const filteredFaqs = activeCategory === 'All'
    ? faqData
    : faqData.filter(faq => faq.category === activeCategory);

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <SubPageHeader title="FAQ" subtitle="Frequently Asked Questions" />
      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <Breadcrumbs items={[{ name: 'FAQ & Help', url: '/faq' }]} />

          {/* Centered Header Categories */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}
            >
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setOpenIndex(0);
                  }}
                  style={{
                    padding: '0.8rem 2rem',
                    borderRadius: '100px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    backgroundColor: activeCategory === cat ? 'var(--color-primary)' : 'transparent',
                    color: activeCategory === cat ? '#fff' : '#666',
                    border: activeCategory === cat ? 'none' : '1px solid #eee',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Centered FAQ Items */}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {filteredFaqs.map((faq, index) => (
                  <FAQItem
                    key={index}
                    {...faq}
                    isOpen={openIndex === index}
                    onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Final Help Section - Restored Dark Card Style */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              marginTop: 'clamp(5rem, 15vw, 10rem)',
              padding: 'clamp(3rem, 10vw, 6rem) clamp(1.25rem, 5vw, 3rem)',
              backgroundColor: '#0a0a0a',
              borderRadius: '40px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              color: '#fff',
              border: '1px solid rgba(189, 155, 59, 0.15)',
              boxShadow: '0 20px 40px rgba(10, 10, 10, 0.15)'
            }}
          >
            {/* Large Ghost Icon */}
            <MessageSquare
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(8)',
                opacity: 0.04,
                zIndex: 0
              }}
            />

            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-1px' }}>Still have questions?</h2>
              <p style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.15rem)', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
                Our concierge team is available to assist you with a bespoke shopping experience. We are here 24/7.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 6vw, 4rem)', flexWrap: 'wrap', width: '100%' }}>
                <a href={`mailto:${contactSettings.companyEmail}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: 'clamp(0.9rem, 3.2vw, 1.15rem)', fontWeight: 600, color: '#fff', transition: 'all 0.3s', wordBreak: 'break-all' }}>
                  <div style={{ width: 'clamp(44px, 12vw, 60px)', height: 'clamp(44px, 12vw, 60px)', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={20} />
                  </div>
                  {contactSettings.companyEmail}
                </a>
                {contactSettings.companyPhone.split(/[,/]+/).map((phone, idx) => {
                  const trimmed = phone.trim();
                  return (
                    <a key={idx} href={`tel:${trimmed.replace(/\s+/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: 'clamp(0.9rem, 3.2vw, 1.15rem)', fontWeight: 600, color: '#fff', transition: 'all 0.3s', whiteSpace: 'nowrap' }}>
                      <div style={{ width: 'clamp(44px, 12vw, 60px)', height: 'clamp(44px, 12vw, 60px)', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Phone size={20} />
                      </div>
                      {trimmed}
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default FAQ;
