'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedTitle from '@/components/AnimatedTitle';
import { RefreshCw, RotateCcw, ShieldCheck, Mail } from 'lucide-react';
import SubPageHeader from '@/components/SubPageHeader';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';

const RefundPolicy = () => {
  const [refundSettings, setRefundSettings] = useState({
    heroTitle: "Refund Policy",
    heroSubtitle: "Safe, secure payments and transparent transaction terms at Daivika.",
    policyTitle: "No Refunds Policy",
    policyBody: "Because we enforce a strict no-returns policy, all payments made on Daivika are final and non-refundable. Under no circumstances will refunds be issued for change of mind, size mismatches, or order cancellations after shipment.\n\nIn rare cases of confirmed damages or shipment errors verified by our support desk, a replacement or store credit will be issued instead of a direct cash refund.",
    paymentTitle: "Secure Payments & Razorpay",
    paymentBody: "We partner with Razorpay to support secure checkouts. All major Credit/Debit cards, Net Banking, UPI, and popular Wallets are supported. Transactions are encrypted using bank-grade SSL security.",
    contactTitle: "Refund Assistance Support",
    contactBody: "For any queries regarding transactions, payments, or orders, please contact our support desk at daivikaofficial77@gmail.com. We are happy to assist you."
  });

  useDocumentSEO({
    title: 'Refund, Returns & Payment Policy',
    description: 'Understand refund timelines, transaction processing with Razorpay integration, secure payment modes, and custom care resolution assistance.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Refund & Payment Policy - Daivika",
      "description": "Information about Razorpay SSL transactions, refund processing timeframes, and customer support channels.",
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
        const saved = localStorage.getItem('vaugun_refund_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRefundSettings(parsed);
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
      <SubPageHeader title={refundSettings.heroTitle} subtitle="Refund Policy" />

      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Breadcrumbs items={[{ name: 'Refund Policy', url: '/refund-policy' }]} />

            {/* Subtitle description */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', maxWidth: '650px', margin: '0 auto' }}>
                {refundSettings.heroSubtitle}
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
                    {refundSettings.policyTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {refundSettings.policyBody}
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
                  <ShieldCheck size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {refundSettings.paymentTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {refundSettings.paymentBody}
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
                  <Mail size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {refundSettings.contactTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {refundSettings.contactBody}
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

export default RefundPolicy;

