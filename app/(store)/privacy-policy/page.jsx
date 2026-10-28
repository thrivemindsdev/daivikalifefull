'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedTitle from '@/components/AnimatedTitle';
import SubPageHeader from '@/components/SubPageHeader';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';

const PrivacyPolicy = () => {
  const [privacySettings, setPrivacySettings] = useState({
    heroTitle: "Privacy Policy",
    heroSubtitle: "We respect your privacy and are committed to protecting your personal data.",
    section1Title: "1. Data Collection & Sourcing",
    section1Body: "We collect relevant personal information to deliver a customized shopping experience. This includes Identity Data (name, account preference), Contact Data (shipping address, verified mobile, email), and Transaction Data (purchase logs, payment token callbacks). We never store raw credit card details on our local databases.",
    section2Title: "2. Standard Payment Integrity",
    section2Body: "We collaborate with verified processors like Razorpay to manage secure, encrypted gateways. All transactional flows are executed under state-of-the-art PCI-DSS compliance frameworks.",
    section3Title: "3. Opt-In Communication",
    section3Body: "Your phone and email are exclusively utilized to transmit express shipment dispatches, digital receipts, and exclusive Daivika promotions. You may safely unsubscribe or opt-out at any time.",
    section4Title: "4. Digital Cookie Disclosures",
    section4Body: "We utilize standard performance cookies to cache products in your local cart, retain your premium session log, and analyze network speed to prevent load-time friction.",
    section5Title: "5. Comprehensive Safety Rights",
    section5Body: "Customers retain absolute legal rights to request complete data erasure, account deletion, profile audits, or corrections by contacting our support concierge team."
  });

  useDocumentSEO({
    title: 'Privacy Policy & Data Security',
    description: 'Understand how we protect your personal credentials, collect shipping parameters, coordinate with Razorpay payment networks, and support data erasure rights.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy - Daivika",
      "description": "Comprehensive disclosures on data collection, Razorpay SSL payment integrity, opt-in alerts, and comprehensive safety rights.",
      "publisher": {
        "@type": "Organization",
        "name": "Daivika",
        "url": typeof window !== 'undefined' ? window.location.origin : 'https://daivika.in'
      }
    }
  });

  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('vaugun_privacy_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setPrivacySettings(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadSettings();
    window.addEventListener('storage', loadSettings);
    window.addEventListener('vaugun_settings_updated', loadSettings);
    return () => {
      window.removeEventListener('storage', loadSettings);
      window.removeEventListener('vaugun_settings_updated', loadSettings);
    };
  }, []);

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <SubPageHeader title={privacySettings.heroTitle} subtitle="Legal Center" />

      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Breadcrumbs items={[{ name: 'Privacy Policy', url: '/privacy-policy' }]} />

            {/* Subtitle & Back Action */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '4rem' }}>
              <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', maxWidth: '650px', margin: '0' }}>
                {privacySettings.heroSubtitle}
              </p>
            </div>

            {/* Content sections */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem' }}
            >
              {privacySettings.section1Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {privacySettings.section1Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{privacySettings.section1Body}</p>
                </section>
              )}

              {privacySettings.section2Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {privacySettings.section2Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{privacySettings.section2Body}</p>
                </section>
              )}

              {privacySettings.section3Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {privacySettings.section3Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{privacySettings.section3Body}</p>
                </section>
              )}

              {privacySettings.section4Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {privacySettings.section4Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{privacySettings.section4Body}</p>
                </section>
              )}

              {privacySettings.section5Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {privacySettings.section5Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{privacySettings.section5Body}</p>
                </section>
              )}
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
