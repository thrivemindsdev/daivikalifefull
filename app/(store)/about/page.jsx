'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, Eye, Sparkles, CheckCircle2, ShieldCheck, HeartHandshake, 
  ArrowRight, Compass, Award, Sprout
} from 'lucide-react';
import { Link } from '@/hooks/useRouterShim';
import useDocumentSEO from '@/hooks/useDocumentSEO';
import SubPageHeader from '@/components/SubPageHeader';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function AboutPage() {
  useDocumentSEO({
    title: 'About DAIVIKA — Authentic Spiritual Wearables & Consecrated Malas',
    description: 'Learn about Daivika by Zodimithra. We curate 100% authentic, energised Karungali malas, Himalayan Rudraksha, sacred Tulasi beads, Panchaloha, and pure pooja essentials.',
    schema: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About DAIVIKA",
      "description": "Daivika by Zodimithra curates authentic, consecrated spiritual wearables and pooja essentials.",
      "publisher": {
        "@type": "Organization",
        "name": "DAIVIKA by Zodimithra",
        "slogan": "Authentic Spiritual Wearables & Consecrated Malas"
      }
    }
  });

  const commitments = [
    {
      title: "100% Natural & Authentic Materials",
      desc: "Every Karungali (Ebony wood) bead, Himalayan Rudraksha, and sacred Tulasi is thoroughly verified for natural purity and authenticity.",
      icon: Sprout,
      color: "#360910",
      bgColor: "#fce7eb"
    },
    {
      title: "Vedic Energisation & Consecration",
      desc: "Our sacred malas and wearables undergo authentic Vedic Prana Pratishtha rituals and mantra chanting to awaken their spiritual vibration.",
      icon: Flame,
      color: "#d97706",
      bgColor: "#fef3c7"
    },
    {
      title: "Sacred Devotional Packaging",
      desc: "Each divine item is handled with deep sanctity and packed securely with protective devotional materials for an auspicious unboxing.",
      icon: Sparkles,
      color: "#360910",
      bgColor: "#fce7eb"
    },
    {
      title: "Dedicated Devotee Care",
      desc: "We assist spiritual seekers with wearing guidelines, japa practices, and care instructions to help you receive maximum divine benefits.",
      icon: HeartHandshake,
      color: "#e11d48",
      bgColor: "#ffe4e6"
    },
    {
      title: "Unwavering Trust & Purity",
      desc: "Fostering long-term spiritual trust through honest sourcing, certified gemstones, genuine Panchaloha, and transparent service.",
      icon: ShieldCheck,
      color: "#7c3aed",
      bgColor: "#f3e8ff"
    }
  ];

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', paddingBottom: '5rem', fontFamily: '"Poppins", sans-serif' }}>
      {/* SubPage Header */}
      <SubPageHeader 
        title="About DAIVIKA" 
        subtitle="Authentic Spiritual Wearables & Sacred Consecrated Malas" 
      />

      <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '0 1.25rem', boxSizing: 'border-box' }}>
        <Breadcrumbs items={[{ name: 'About DAIVIKA', url: '/about' }]} />
        
        {/* Brand Slogan Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            marginTop: '2rem',
            marginBottom: '3rem',
            padding: '2.5rem 2rem',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #360910 0%, #200408 100%)',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(54, 9, 16, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            filter: 'blur(30px)',
            pointerEvents: 'none'
          }} />

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: '#facc15',
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '0.22rem 0.75rem',
            borderRadius: '100px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '1rem',
            border: '1px solid rgba(234, 179, 8, 0.3)'
          }}>
            <Sparkles size={12} /> Sacred Devotional Sanctuary
          </span>

          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
            fontWeight: 900,
            lineHeight: 1.2,
            margin: '0 0 0.75rem 0',
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            DAIVIKA by Zodimithra
          </h1>

          <p style={{
            fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)',
            fontWeight: 700,
            color: '#facc15',
            margin: '0 auto 1.25rem auto',
            maxWidth: '680px',
            letterSpacing: '0.5px'
          }}>
            Authentic Spiritual Wearables & Consecrated Malas
          </p>

          <div style={{
            width: '60px',
            height: '3px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            margin: '0 auto 1.5rem auto',
            borderRadius: '2px'
          }} />

          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '780px',
            margin: '0 auto',
            lineHeight: 1.7,
            fontWeight: 500
          }}>
            “Bridging ancient Vedic traditions and authentic spiritual energies with seekers worldwide.”
          </p>
        </motion.div>

        {/* Section 1: About DAIVIKA Narrative */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: 'clamp(1.75rem, 4vw, 3rem)',
            marginBottom: '3rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#fce7eb',
              color: '#360910',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Compass size={22} />
            </div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Our Sacred Heritage
            </h2>
          </div>

          <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#334155', marginBottom: '1.25rem', fontWeight: 500 }}>
            <strong>DAIVIKA by Zodimithra</strong> was founded with a profound devotion to bringing authentic, energized spiritual artifacts and divine wearables directly into the lives and homes of seekers.
          </p>

          <p style={{ fontSize: '0.98rem', lineHeight: 1.8, color: '#475569', marginBottom: '1.25rem' }}>
            In a market filled with imitation beads and synthetic stones, Daivika stands as a trusted sanctuary of purity. From genuine Karungali (Ebony wood) malas known for warding off negativity to certified 1 to 14 Mukhi Himalayan Rudrakshas, sacred Tulasi japa malas, and consecrated Panchaloha rings, every item in our store is ethically sourced and ritually sanctified.
          </p>

          <p style={{ fontSize: '0.98rem', lineHeight: 1.8, color: '#475569', marginBottom: '1.25rem' }}>
            Each sacred wearable is consecrated through authentic Vedic rituals and Prana Pratishtha by knowledgeable priests, awakening the dormant natural energies of the sacred wood and seed before it is shipped with devotional reverence.
          </p>

          <p style={{ fontSize: '0.98rem', lineHeight: 1.8, color: '#475569', marginBottom: '1.75rem' }}>
            Whether you are embarking on daily japa meditation, seeking divine protection, or creating a sanctified altar at home, Daivika is here to empower your spiritual path.
          </p>

          {/* Highlight Callout Box */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '20px',
            backgroundColor: '#fdf2f4',
            borderLeft: '4px solid #360910',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#360910',
            lineHeight: 1.6
          }}>
            Every bead holds a prayer. Every sacred wearable carries divine blessings.
          </div>
        </motion.div>

        {/* Section 2 & 3: Vision & Mission Dual Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Vision Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Eye size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Our Vision
              </h2>
            </div>

            <p style={{ fontSize: '0.98rem', lineHeight: 1.8, color: '#334155', marginBottom: '1rem', fontWeight: 500 }}>
              To be the world’s most trusted sanctuary for authentic Vedic wearables, energised malas, and pooja essentials, inspiring inner peace, protection, and spiritual elevation in every household.
            </p>

            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#64748b', margin: 0 }}>
              We envision a world where ancient spiritual wisdom and sacred natural items remain accessible, authentic, and uncompromised for generations to come.
            </p>
          </motion.div>

          {/* Mission Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '28px',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: '#fce7eb',
                color: '#360910',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Flame size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Our Mission
              </h2>
            </div>

            <p style={{ fontSize: '0.98rem', lineHeight: 1.8, color: '#334155', margin: 0, fontWeight: 500 }}>
              To provide devotees and spiritual seekers with 100% natural, lab-certified, and ritually energized Karungali, Rudraksha, Tulasi, and pooja essentials, accompanied by honest guidance and devoted service.
            </p>
          </motion.div>
        </div>

        {/* Section 4: Our Core Commitments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: 'clamp(1.75rem, 4vw, 3rem)',
            marginBottom: '3rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#360910', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Our Devotional Promise
            </span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', fontWeight: 800, color: '#0f172a', margin: '0.3rem 0 0 0' }}>
              We Are Committed To
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem'
          }}>
            {commitments.map((item, index) => {
              const IconComp = item.icon;
              return (
                <div
                  key={index}
                  style={{
                    padding: '1.5rem',
                    borderRadius: '20px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: item.bgColor,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComp size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Section 5: Core Question / Philosophy Callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            borderRadius: '28px',
            backgroundColor: '#360910',
            backgroundImage: 'radial-gradient(circle at top right, #56101c 0%, #24050a 100%)',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(54, 9, 16, 0.25)'
          }}
        >
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: '#facc15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Flame size={28} />
          </div>

          <p style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            Every bead holds a prayer.
          </p>

          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#ffffff', margin: '0 0 2rem 0', lineHeight: 1.3 }}>
            Connect to Divine Energy & Inner Peace
          </h2>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/products"
              style={{
                padding: '0.9rem 2rem',
                borderRadius: '100px',
                backgroundColor: '#facc15',
                color: '#360910',
                fontSize: '0.92rem',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 8px 20px rgba(250, 204, 21, 0.25)',
                transition: 'all 0.25s ease'
              }}
            >
              Explore Sacred Malas & Wearables <ArrowRight size={16} />
            </Link>
            <Link
              to="/contact"
              style={{
                padding: '0.9rem 2rem',
                borderRadius: '100px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.25s ease'
              }}
            >
              Contact Devotee Support
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
