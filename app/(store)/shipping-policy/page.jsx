'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedTitle from '@/components/AnimatedTitle';
import { Truck, ShieldCheck, Clock, MapPin } from 'lucide-react';
import SubPageHeader from '@/components/SubPageHeader';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import Breadcrumbs from '@/components/Breadcrumbs';

const ShippingPolicy = () => {
  const [shippingPolicySettings, setShippingPolicySettings] = useState({
    heroTitle: "Shipping & Delivery Policy",
    heroSubtitle: "Fast, reliable, and transparent shipping engineered for safety and prompt delivery.",
    ratesTitle: "Shipping Rates & Delivery",
    ratesBody: "We offer fast and reliable shipping across India with trusted courier partners. Full tracking details are provided for every shipment.",
    carrierTitle: "Courier & Delivery Partners",
    carrierBody: "All packages are dispatched using safe and reliable express networks. Online tracking is updated as soon as your order leaves our warehouse.",
    timeframesTitle: "Dispatch & Delivery Timelines",
    timeframesBody: "South India: 2-3 business days. Rest of India: 3-5 business days."
  });

  useDocumentSEO({
    title: 'Shipping & Delivery Policy | DAIVIKA',
    description: 'Learn about our shipping rates, delivery partners, order tracking details, and estimated delivery timelines.',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Shipping Policy - Daivika",
      "description": "Learn about our shipping rates, carrier partnerships, and South/Rest of India transit timelines.",
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
        const saved = localStorage.getItem('vaugun_shipping_policy_settings');
        if (saved) {
          setShippingPolicySettings(JSON.parse(saved));
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
      <SubPageHeader title={shippingPolicySettings.heroTitle} subtitle="Logistics & Delivery" />

      <main style={{ paddingTop: '1rem', paddingBottom: '10rem' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Breadcrumbs items={[{ name: 'Shipping Policy', url: '/shipping-policy' }]} />

            {/* Subtitle description */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', maxWidth: '650px', margin: '0 auto' }}>
                {shippingPolicySettings.heroSubtitle}
              </p>
            </div>

            {/* Structured Sections */}
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
                  <Truck size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {shippingPolicySettings.ratesTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {shippingPolicySettings.ratesBody}
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
                    {shippingPolicySettings.carrierTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {shippingPolicySettings.carrierBody}
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
                  <Clock size={24} color="#0a0a0a" />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111', marginBottom: '1rem', marginTop: '0.2rem' }}>
                    {shippingPolicySettings.timeframesTitle}
                  </h2>
                  <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem', margin: 0, whiteSpace: 'pre-line' }}>
                    {shippingPolicySettings.timeframesBody}
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

export default ShippingPolicy;
