'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, TrendingUp, DollarSign, ShoppingBag, Target, Sparkles,
  CheckCircle2, AlertTriangle, RefreshCw, Send, Copy, Check, ExternalLink,
  Layers, Filter, Search, ChevronRight, Eye, ShieldCheck, Zap, BarChart3,
  Globe, Smartphone, ArrowUpRight, Lock, HelpCircle, Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MetaAdsDashboardPanel({ token, triggerToast, isMobile }) {
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'events' | 'settings' | 'url-builder'
  const [dateRange, setDateRange] = useState('30D'); // 'Today' | '7D' | '30D' | 'All'
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    pixelId: '',
    capiToken: '',
    testEventCode: '',
    isActive: true,
    autoTrackPageView: true,
    autoTrackViewContent: true,
    autoTrackAddToCart: true,
    autoTrackInitiateCheckout: true,
    autoTrackPurchase: true,
    autoTrackLead: true,
    autoTrackSearch: true,
    enableCapi: true,
    customScript: ''
  });
  const [rawSnippetInput, setRawSnippetInput] = useState('');
  const [extractedNotice, setExtractedNotice] = useState('');
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingEvent, setIsTestingEvent] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Helper to extract clean numeric Pixel ID from any raw script tag or snippet
  const extractPixelId = (input) => {
    if (!input) return '';
    const clean = input.trim();
    if (/^\d{10,25}$/.test(clean)) return clean;
    const match = clean.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i) ||
                  clean.match(/id=(\d+)/i) ||
                  clean.match(/['"]([0-9]{12,20})['"]/);
    return match ? match[1] : clean;
  };

  const handleSnippetPaste = (val) => {
    setRawSnippetInput(val);
    const extractedId = extractPixelId(val);
    if (extractedId && extractedId !== val) {
      setSettingsForm(prev => ({
        ...prev,
        pixelId: extractedId,
        customScript: val
      }));
      setExtractedNotice(`✓ Auto-detected & extracted Pixel ID: ${extractedId}`);
      setTimeout(() => setExtractedNotice(''), 5000);
    } else if (extractedId) {
      setSettingsForm(prev => ({
        ...prev,
        pixelId: extractedId
      }));
    }
  };

  // URL Builder state
  const [urlBuilder, setUrlBuilder] = useState({
    baseUrl: typeof window !== 'undefined' ? `${window.location.origin}/products` : 'https://daivika.in/products',
    campaign: 'summer_collection_2026',
    source: 'facebook',
    medium: 'paid_social',
    content: 'video_ad_1',
    term: ''
  });
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch Meta analytics and configuration from server
  const fetchMetaAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vaugun_token') || localStorage.getItem('token')) : '');
      const res = await fetch(`/api/meta-pixel/analytics?range=${dateRange}&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error fetching Meta analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, token]);

  // Fetch settings config
  const fetchMetaSettings = useCallback(async () => {
    try {
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vaugun_token') || localStorage.getItem('token')) : '');
      const res = await fetch(`/api/meta-pixel/config?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const resData = await res.json();
      const configData = resData?.data || resData?.settings || resData;
      if (configData && typeof configData === 'object') {
        setSettingsForm(prev => ({
          ...prev,
          ...configData
        }));
      }
    } catch (err) {
      console.error('Error fetching Meta Pixel settings:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchMetaAnalytics();
  }, [fetchMetaAnalytics]);

  useEffect(() => {
    fetchMetaSettings();
  }, [fetchMetaSettings]);

  // Handle Save Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSettings(true);
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vaugun_token') || localStorage.getItem('token')) : '');
      const res = await fetch('/api/meta-pixel/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(settingsForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Meta Pixel & CAPI settings saved successfully!', 'success');
        fetchMetaSettings();
        fetchMetaAnalytics();
      } else {
        triggerToast(data.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Server communication error', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Send Diagnostic Test Event
  const handleSendTestEvent = async () => {
    if (!settingsForm.pixelId) {
      triggerToast('Please enter your Meta Pixel ID first', 'error');
      return;
    }
    try {
      setIsTestingEvent(true);
      setTestResult(null);
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('vaugun_token') || localStorage.getItem('token')) : '');
      const res = await fetch('/api/meta-pixel/test-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Test event dispatched successfully! Check your Meta Events Manager test tab.',
          details: data.capiResponse
        });
        triggerToast('Test event sent successfully!', 'success');
        fetchMetaAnalytics();
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Failed to send test event'
        });
        triggerToast(data.message || 'Test event failed', 'error');
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Server communication error' });
      triggerToast('Server communication error', 'error');
    } finally {
      setIsTestingEvent(false);
    }
  };

  // Generate Ad URL
  const generatedTrackingUrl = (() => {
    try {
      const url = new URL(urlBuilder.baseUrl || 'https://daivika.in/products');
      if (urlBuilder.source) url.searchParams.set('utm_source', urlBuilder.source);
      if (urlBuilder.medium) url.searchParams.set('utm_medium', urlBuilder.medium);
      if (urlBuilder.campaign) url.searchParams.set('utm_campaign', urlBuilder.campaign);
      if (urlBuilder.content) url.searchParams.set('utm_content', urlBuilder.content);
      if (urlBuilder.term) url.searchParams.set('utm_term', urlBuilder.term);
      return url.toString();
    } catch {
      return `${urlBuilder.baseUrl}?utm_source=${urlBuilder.source}&utm_campaign=${urlBuilder.campaign}`;
    }
  })();

  const handleCopyUrl = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(generatedTrackingUrl);
      setCopiedUrl(true);
      triggerToast('Trackable Meta Ad URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const summary = analyticsData?.summary || {};
  const funnel = analyticsData?.funnel || {
    PageView: 0,
    ViewContent: 0,
    AddToCart: 0,
    InitiateCheckout: 0,
    Purchase: 0
  };
  const campaigns = analyticsData?.campaigns || [];
  const metaOrders = analyticsData?.metaOrders || [];
  const recentEvents = analyticsData?.recentEvents || [];

  const filteredCampaigns = campaigns.filter(c =>
    (c.campaign || '').toLowerCase().includes(campaignSearch.toLowerCase()) ||
    (c.source || '').toLowerCase().includes(campaignSearch.toLowerCase())
  );

  const filteredEvents = recentEvents.filter(e =>
    eventFilter === 'ALL' || e.eventName === eventFilter
  );

  const isPixelActive = Boolean(settingsForm.pixelId && settingsForm.isActive);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}
    >
      {/* Top Banner with Live Status & Sub-tab Navigation */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1877F2 0%, #0062E0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)'
          }}>
            <Target size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Meta Ads & Pixel Analytics
              </h2>
              {isPixelActive ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                  Pixel Active
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                  Pixel Not Configured
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
              Track conversions, Facebook & Instagram ad return, and customer journeys in real time.
            </p>
          </div>
        </div>

        {/* Sub-tabs pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          backgroundColor: '#f3f4f6',
          padding: '0.3rem',
          borderRadius: '10px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'analytics', label: 'Dashboard', icon: BarChart3 },
            { id: 'events', label: 'Live Events', icon: Zap },
            { id: 'settings', label: 'Pixel & CAPI Settings', icon: ShieldCheck },
            { id: 'url-builder', label: 'Ad URL Builder', icon: ExternalLink }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: active ? '#ffffff' : 'transparent',
                  color: active ? '#111827' : '#6b7280',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={14} color={active ? '#1877f2' : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 1: ANALYTICS & CAMPAIGNS DASHBOARD */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Date Filter:</span>
              <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', padding: '0.25rem', borderRadius: '8px' }}>
                {['Today', '7D', '30D', 'All'].map(range => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: dateRange === range ? '#000000' : 'transparent',
                      color: dateRange === range ? '#ffffff' : '#4b5563',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {range === 'All' ? 'All Time' : range}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchMetaAnalytics}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* KPI Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {/* Meta Ad Revenue */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Meta Ad Revenue
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
                ₹{(summary.totalMetaRevenue || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                {summary.metaRevenueShare || 0}% of total store revenue
              </div>
            </div>

            {/* Meta Ad Orders */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Meta Attributed Orders
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
                {summary.totalMetaOrdersCount || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                From Facebook & Instagram Campaigns
              </div>
            </div>

            {/* Blended ROAS */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Blended ROAS
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Sparkles size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
                {summary.blendedROAS || '0.00'}x
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                Return on Advertising Spend
              </div>
            </div>

            {/* Meta AOV */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Meta Avg Order Value
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
                ₹{(summary.metaAOV || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                Average ticket size from ad visitors
              </div>
            </div>

            {/* Conversion Rate */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                  Ad Conversion Rate
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <Zap size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827' }}>
                {summary.conversionRate || '0.00'}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                From Visitor to Paid Customer
              </div>
            </div>
          </div>

          {/* Full Funnel Conversion Visualization */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Meta Pixel Full Conversion Funnel
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  Complete visual journey from page impressions to completed checkout purchases.
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, 1fr)',
              gap: '0.75rem',
              alignItems: 'stretch'
            }}>
              {[
                { name: 'Page Views', key: 'PageView', count: funnel.PageView || 0, color: '#3b82f6', bg: '#eff6ff' },
                { name: 'Product Views', key: 'ViewContent', count: funnel.ViewContent || 0, color: '#8b5cf6', bg: '#f5f3ff' },
                { name: 'Add to Cart', key: 'AddToCart', count: funnel.AddToCart || 0, color: '#f59e0b', bg: '#fffbeb' },
                { name: 'Initiate Checkout', key: 'InitiateCheckout', count: funnel.InitiateCheckout || 0, color: '#06b6d4', bg: '#ecfeff' },
                { name: 'Purchases', key: 'Purchase', count: funnel.Purchase || 0, color: '#10b981', bg: '#ecfdf5' }
              ].map((step, idx, arr) => {
                const prevCount = idx > 0 ? arr[idx - 1].count : step.count;
                const conversionFromPrev = prevCount > 0 ? ((step.count / prevCount) * 100).toFixed(1) : 0;
                const totalPageView = arr[0].count || 1;
                const overallShare = ((step.count / totalPageView) * 100).toFixed(1);

                return (
                  <div
                    key={step.key}
                    style={{
                      backgroundColor: step.bg,
                      borderRadius: '12px',
                      padding: '1rem',
                      border: `1px solid ${step.color}25`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: step.color }}>
                        Stage {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600 }}>
                        {overallShare}% total
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                      {step.name}
                    </div>

                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>
                      {step.count.toLocaleString('en-IN')}
                    </div>

                    {idx > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: 600, marginTop: 'auto', paddingTop: '0.25rem', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                        {conversionFromPrev}% retained
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campaign Breakdown Table */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Meta Ads Campaign Performance
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  Attribution metrics grouped by UTM Campaign and Creative Ad Sets.
                </p>
              </div>

              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search campaign name..."
                  value={campaignSearch}
                  onChange={e => setCampaignSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                No active Meta Ad campaigns found in the selected date range. Run campaigns with UTM tags or use the Ad URL Builder.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Campaign Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Source</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Ad Creative / Content</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Attributed Orders</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Revenue</th>
                      <th style={{ padding: '0.75rem 1rem' }}>AOV</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Est. ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111827' }}>
                          {c.campaign}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#1877f2',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}>
                            {c.source}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#6b7280' }}>
                          {c.adContent}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                          {c.orders}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#059669' }}>
                          ₹{(c.revenue || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          ₹{c.orders > 0 ? Math.round(c.revenue / c.orders).toLocaleString('en-IN') : 0}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#d97706' }}>
                          {c.roas}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Meta Attributed Orders Explorer */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Meta Ad Driven Customer Orders
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  Recent purchase transactions linked to Facebook / Instagram ad clicks and pixel attribution.
                </p>
              </div>
            </div>

            {metaOrders.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                No Meta-attributed orders placed yet. Orders from ad traffic will appear here automatically.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Campaign</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Ad Source</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total (₹)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Payment</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metaOrders.map((o) => (
                      <tr key={o._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#111827' }}>
                          {o._id}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{o.user || 'Guest'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{o.phone || o.email}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                          {o.attribution?.campaign || 'Ad Campaign'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#1877f2',
                            fontWeight: 600,
                            fontSize: '0.72rem'
                          }}>
                            {o.attribution?.source || 'Facebook / IG'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#059669' }}>
                          ₹{(o.total || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: (o.paymentStatus === 'Paid' || o.paymentStatus === 'Partially Paid') ? '#ecfdf5' : '#fef3c7',
                            color: (o.paymentStatus === 'Paid' || o.paymentStatus === 'Partially Paid') ? '#059669' : '#d97706',
                            fontWeight: 600,
                            fontSize: '0.72rem'
                          }}>
                            {o.paymentStatus} ({o.paymentMethod})
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#6b7280', fontSize: '0.75rem' }}>
                          {o.date} {o.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 2: LIVE PIXEL EVENT STREAM */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeSubTab === 'events' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Real-Time Pixel Event Stream
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                Live feed of all client-side and server-side Conversions API events triggered on the site.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Event type filter */}
              <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
                {['ALL', 'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Lead'].map(evt => (
                  <button
                    key={evt}
                    onClick={() => setEventFilter(evt)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: eventFilter === evt ? '#000000' : 'transparent',
                      color: eventFilter === evt ? '#ffffff' : '#4b5563',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {evt}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchMetaAnalytics}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Event Stream List */}
          {filteredEvents.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
              No pixel events recorded for this filter. Browse products, add items to cart, or perform a test to see events appear live.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {filteredEvents.map((evt, idx) => {
                let badgeBg = '#eff6ff';
                let badgeColor = '#2563eb';
                if (evt.eventName === 'Purchase') {
                  badgeBg = '#ecfdf5';
                  badgeColor = '#059669';
                } else if (evt.eventName === 'AddToCart') {
                  badgeBg = '#fffbeb';
                  badgeColor = '#d97706';
                } else if (evt.eventName === 'ViewContent') {
                  badgeBg = '#f5f3ff';
                  badgeColor = '#7c3aed';
                } else if (evt.eventName === 'InitiateCheckout') {
                  badgeBg = '#ecfeff';
                  badgeColor = '#0891b2';
                } else if (evt.eventName === 'Lead') {
                  badgeBg = '#fdf2f8';
                  badgeColor = '#db2777';
                }

                const timeStr = new Date(evt.timestamp || Date.now()).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                });

                return (
                  <div
                    key={evt._id || idx}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}>
                        {evt.eventName}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>
                          {evt.eventData?.content_name || evt.userData?.path || evt.eventData?.note || 'Store Interaction'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          {evt.adAttribution?.utm_source ? `Source: ${evt.adAttribution.utm_source}` : 'Direct Visit'}
                          {evt.adAttribution?.utm_campaign ? ` • Campaign: ${evt.adAttribution.utm_campaign}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {evt.eventData?.value ? (
                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.82rem' }}>
                          ₹{evt.eventData.value.toLocaleString('en-IN')}
                        </div>
                      ) : null}
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500 }}>
                        {timeStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 3: PIXEL & CAPI CONFIGURATION SETTINGS */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeSubTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Credentials Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '1.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Meta Pixel & Conversions API Credentials
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  Configure your official Meta Pixel Dataset ID and Conversions API (CAPI) secret token from Meta Events Manager.
                </p>
              </div>

              {/* Code Snippet Fast Paste Box */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    📋 Paste Full Meta Pixel Code / Base Script (&lt;script&gt;...&lt;/script&gt;)
                  </label>
                  {extractedNotice && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      {extractedNotice}
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder={`Paste full code snippet copied from Facebook / Meta Business Suite here:\n<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)...\nfbq('init', '1234567890123456');\nfbq('track', 'PageView');\n</script>`}
                  value={rawSnippetInput || settingsForm.customScript || ''}
                  onChange={e => handleSnippetPaste(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'Consolas, monospace',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    resize: 'vertical'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  💡 Tip: You can paste the entire embed snippet copied from Meta Events Manager. The system will automatically detect and extract your numeric Pixel ID and configure tracking instantly!
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                {/* Meta Pixel ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Meta Pixel ID (Dataset ID) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567890123456"
                    value={settingsForm.pixelId}
                    onChange={e => setSettingsForm({ ...settingsForm, pixelId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                    Found in Meta Business Suite ➔ Events Manager ➔ Data Sources ➔ Settings.
                  </span>
                </div>

                {/* Test Event Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                    Meta Test Event Code (Optional for Live Testing)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TEST12345"
                    value={settingsForm.testEventCode}
                    onChange={e => setSettingsForm({ ...settingsForm, testEventCode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                    Found in Meta Events Manager ➔ Test Events tab (used to test real-time server payloads).
                  </span>
                </div>
              </div>

              {/* Meta Conversions API (CAPI) Token */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                  Meta Conversions API (CAPI) Access Token
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCapiToken ? "text" : "password"}
                    placeholder="EAAG... (Long-lived System User Access Token)"
                    value={settingsForm.capiToken}
                    onChange={e => setSettingsForm({ ...settingsForm, capiToken: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 3rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCapiToken(!showCapiToken)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {showCapiToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block', marginTop: '0.25rem' }}>
                  Allows server-side conversions tracking for iOS 14.5+ ad tracking protection bypass.
                </span>
              </div>
            </div>

            {/* Event Automation & Toggles Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '1.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Automated Event Tracking Toggles
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                  Enable or disable specific Meta Pixel and CAPI events on your storefront.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {[
                  { key: 'isActive', label: 'Master Pixel Tracking', desc: 'Enable global Meta Pixel tracking on DAIVIKA.' },
                  { key: 'enableCapi', label: 'Server-Side CAPI Dispatch', desc: 'Forward events directly to Meta Conversions API.' },
                  { key: 'autoTrackPageView', label: 'Track Page Views (PageView)', desc: 'Fires whenever any page is loaded or navigated.' },
                  { key: 'autoTrackViewContent', label: 'Track Product Views (ViewContent)', desc: 'Fires when customer opens a product details page.' },
                  { key: 'autoTrackAddToCart', label: 'Track Add to Cart (AddToCart)', desc: 'Fires when an item is added to the cart.' },
                  { key: 'autoTrackInitiateCheckout', label: 'Track Checkout (InitiateCheckout)', desc: 'Fires when customer reaches checkout.' },
                  { key: 'autoTrackPurchase', label: 'Track Purchases (Purchase)', desc: 'Fires with full order revenue and IDs upon order success.' },
                  { key: 'autoTrackLead', label: 'Track Leads (Lead)', desc: 'Fires on contact messages and newsletter subscriptions.' }
                ].map(toggle => (
                  <label
                    key={toggle.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #f3f4f6',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(settingsForm[toggle.key])}
                      onChange={e => setSettingsForm({ ...settingsForm, [toggle.key]: e.target.checked })}
                      style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                        {toggle.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.1rem' }}>
                        {toggle.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              padding: '1.25rem'
            }}>
              <button
                type="button"
                onClick={handleSendTestEvent}
                disabled={isTestingEvent || !settingsForm.pixelId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: (isTestingEvent || !settingsForm.pixelId) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={15} />
                <span>{isTestingEvent ? 'Sending Test Event...' : 'Send Test Diagnostic Event'}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingSettings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#1877f2',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(24, 119, 242, 0.3)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{isSavingSettings ? 'Saving Settings...' : 'Save Meta Configuration'}</span>
              </button>
            </div>

            {/* Diagnostic Test Result Box */}
            {testResult && (
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                color: testResult.success ? '#065f46' : '#991b1b',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                {testResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 4: META ADS UTM URL BUILDER */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeSubTab === 'url-builder' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
              Meta Ads Trackable URL Builder
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
              Generate trackable destination URLs for your Facebook and Instagram ads. When customers click these links, their orders and conversions are automatically attributed in this dashboard.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
            {/* Base Website URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Destination Landing Page URL
              </label>
              <input
                type="text"
                value={urlBuilder.baseUrl}
                onChange={e => setUrlBuilder({ ...urlBuilder, baseUrl: e.target.value })}
                placeholder="https://daivika.in/products"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Campaign Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Campaign Name (utm_campaign) *
              </label>
              <input
                type="text"
                value={urlBuilder.campaign}
                onChange={e => setUrlBuilder({ ...urlBuilder, campaign: e.target.value })}
                placeholder="e.g. smart_gadgets_launch_2026"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Ad Platform / Source */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Ad Platform (utm_source)
              </label>
              <select
                value={urlBuilder.source}
                onChange={e => setUrlBuilder({ ...urlBuilder, source: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="facebook">Facebook Ads (facebook)</option>
                <option value="instagram">Instagram Ads (instagram)</option>
                <option value="meta_ads">Meta Ads (meta_ads)</option>
                <option value="facebook_reels">Facebook Reels (facebook_reels)</option>
                <option value="instagram_stories">Instagram Stories (instagram_stories)</option>
              </select>
            </div>

            {/* Campaign Medium */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Campaign Medium (utm_medium)
              </label>
              <select
                value={urlBuilder.medium}
                onChange={e => setUrlBuilder({ ...urlBuilder, medium: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="paid_social">Paid Social (paid_social)</option>
                <option value="cpc">CPC Ad (cpc)</option>
                <option value="story">Story Ad (story)</option>
                <option value="reels">Reels Ad (reels)</option>
                <option value="carousel">Carousel Ad (carousel)</option>
              </select>
            </div>

            {/* Ad Content / Creative */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Ad Creative / Content (utm_content)
              </label>
              <input
                type="text"
                value={urlBuilder.content}
                onChange={e => setUrlBuilder({ ...urlBuilder, content: e.target.value })}
                placeholder="e.g. video_ad_version_1"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Keywords / Term */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                Keyword Term (utm_term - Optional)
              </label>
              <input
                type="text"
                value={urlBuilder.term}
                onChange={e => setUrlBuilder({ ...urlBuilder, term: e.target.value })}
                placeholder="e.g. daivika_offer"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Generated URL Box */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>
                Generated Trackable Destination URL:
              </span>
              <button
                type="button"
                onClick={handleCopyUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: copiedUrl ? '#10b981' : '#000000',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUrl ? 'Copied to Clipboard!' : 'Copy Ad URL'}</span>
              </button>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: '#1f2937',
              wordBreak: 'break-all',
              userSelect: 'all'
            }}>
              {generatedTrackingUrl}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
