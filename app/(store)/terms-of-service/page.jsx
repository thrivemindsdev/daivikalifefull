'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedTitle from '@/components/AnimatedTitle';
import SubPageHeader from '@/components/SubPageHeader';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';

const TermsOfService = () => {
  const [termsSettings, setTermsSettings] = useState({
    heroTitle: "Terms of Service",
    heroSubtitle: "Please review our terms of use, license, disclaimer, and policies carefully.",
    section1Title: "1. Scope of Service & Eligibility",
    section1Body: "By accessing Daivika's digital channels, Home, or retail interfaces, you are declaring that you are at least 18 years of age or accessing under the supervision of a parent/guardian. We reserve the absolute right to limit sales, refuse service, or terminate premium memberships at our sole discretion.",
    section2Title: "2. Quality Assurance & Product Terms",
    section2Body: "All products available on Daivika are selected under strict quality control standards. We encourage customers to verify all product specifications and details listed on each product page before placing an order. Our support desk is always available to answer any product inquiries.",
    section3Title: "3. Account Security & Verification",
    section3Body: "Users are solely responsible for maintaining the strict confidentiality of their account credentials. You agree to accept full responsibility for all activities, carts, or checkout purchases occurring under your registered session.",
    section4Title: "4. Intellectual Property & License",
    section4Body: "All content included on Daivika, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the exclusive property of Daivika and protected by Indian and international copyright laws.",
    section5Title: "5. Limitation of Liability",
    section5Body: "Daivika shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services, products, or unauthorized access to user transmissions."
  });

  useDocumentSEO({
    title: 'Terms of Service & User Conditions',
    description: 'Read the terms of service, premium quality guarantees, delivery estimates, digital notifications, and account security details for Daivika.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Terms of Service - Daivika",
      "description": "User conditions, eligibility rules, and premium quality guarantee disclosures.",
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
        const saved = localStorage.getItem('vaugun_terms_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setTermsSettings(parsed);
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
      <SubPageHeader title={termsSettings.heroTitle} subtitle="Legal Center" />

      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Subtitle & Back Action */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '4rem' }}>
              <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', maxWidth: '650px', margin: '0' }}>
                {termsSettings.heroSubtitle}
              </p>
            </div>

            {/* Content sections */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem' }}
            >
              {termsSettings.section1Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {termsSettings.section1Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{termsSettings.section1Body}</p>
                </section>
              )}

              {termsSettings.section2Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {termsSettings.section2Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{termsSettings.section2Body}</p>
                </section>
              )}

              {termsSettings.section3Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {termsSettings.section3Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{termsSettings.section3Body}</p>
                </section>
              )}

              {termsSettings.section4Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {termsSettings.section4Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{termsSettings.section4Body}</p>
                </section>
              )}

              {termsSettings.section5Title && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '1.5rem' }}>
                    {termsSettings.section5Title}
                  </h2>
                  <p style={{ whiteSpace: 'pre-line' }}>{termsSettings.section5Body}</p>
                </section>
              )}
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
