'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, RotateCcw, ShieldCheck, Mail } from 'lucide-react';
import SubPageHeader from '@/components/SubPageHeader';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';

const ReturnsExchanges = () => {
  const [returnsSettings, setReturnsSettings] = useState({
    heroTitle: "Returns & Exchanges Policy",
    heroSubtitle: "At Daivika, we strive to deliver products of the highest quality standards. To maintain quality control and customer satisfaction, please review our guidelines.",
    policyTitle: "Quality Guaranteed Policy",
    policyBody: "Every item undergoes rigorous quality checking before leaving our warehouse. All products are backed by our dedicated customer support team.",
    processTitle: "Order Inspection & Inquiries",
    processBody: "Every item undergoes rigorous quality checking before leaving our warehouse. In the rare event that you receive a damaged or incorrect item, please email us at daivikaofficial77@gmail.com within 24 hours of delivery with photographic proof. Our support desk will review the claim and assist with a replacement or store credit.",
    exchangeTitle: "Exchange & Replacement Desk",
    exchangeBody: "If you receive a defective or incorrect item, our team will promptly assist you with a replacement. Please inspect your items upon delivery and contact support for any guidance."
  });

  useDocumentSEO({
    title: 'Returns & Exchanges Policy - Daivika',
    description: 'Daivika enforces a strict No Returns & No Exchanges policy to maintain exclusivity and hygiene standards. Learn about our quality assurance and inquiries.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Returns & Exchanges Policy - Daivika",
      "description": "Returns and exchanges policy details for Daivika products.",
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
        const saved = localStorage.getItem('vaugun_returns_settings');
        if (saved) {
          setReturnsSettings(JSON.parse(saved));
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
      <SubPageHeader title={returnsSettings.heroTitle} subtitle="Returns & Exchanges" />

      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Breadcrumbs items={[{ name: 'Returns & Exchanges', url: '/returns-exchanges' }]} />

            {/* Subtitle description */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', maxWidth: '650px', margin: '0 auto' }}>
                {returnsSettings.heroSubtitle}
              </p>
            </div>

            {/* Structured Content Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}
            >
              {/* Section 1 */}
              <section style={{
                display: 'flex',
                gap: '2rem',
                backgroundColor: '#fafafa',
                borderRadius: '20px',
                padding: '2.5rem',
                border: '1px solid #f0f0f0',
                flexWrap: 'wrap'
              }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid rgba(10, 10, 10, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RotateCcw size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {returnsSettings.policyTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {returnsSettings.policyBody}
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section style={{
                display: 'flex',
                gap: '2rem',
                backgroundColor: '#fafafa',
                borderRadius: '20px',
                padding: '2.5rem',
                border: '1px solid #f0f0f0',
                flexWrap: 'wrap'
              }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid rgba(10, 10, 10, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {returnsSettings.processTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {returnsSettings.processBody}
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section style={{
                display: 'flex',
                gap: '2rem',
                backgroundColor: '#fafafa',
                borderRadius: '20px',
                padding: '2.5rem',
                border: '1px solid #f0f0f0',
                flexWrap: 'wrap'
              }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid rgba(10, 10, 10, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RefreshCw size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {returnsSettings.exchangeTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {returnsSettings.exchangeBody}
                  </p>
                </div>
              </section>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ReturnsExchanges;
