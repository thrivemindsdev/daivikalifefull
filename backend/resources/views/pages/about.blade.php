@extends('layouts.store')

@section('title', 'About DAIVIKA — Authentic Spiritual Wearables & Consecrated Malas')
@section('description', 'Learn about Daivika by Zodimithra. We curate 100% authentic, energised Karungali malas, Himalayan Rudraksha, sacred Tulasi beads, Panchaloha, and pure pooja essentials.')

@push('head')
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'AboutPage',
      'name' => 'About DAIVIKA',
      'description' => 'Daivika by Zodimithra curates authentic, consecrated spiritual wearables and pooja essentials.',
      'publisher' => ['@type' => 'Organization', 'name' => 'DAIVIKA by Zodimithra', 'slogan' => 'Authentic Spiritual Wearables & Consecrated Malas'],
  ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
@endpush

@php
    $commitments = [
        ['100% Natural & Authentic Materials', 'Every Karungali (Ebony wood) bead, Himalayan Rudraksha, and sacred Tulasi is thoroughly verified for natural purity and authenticity.', 'sprout', '#360910', '#fce7eb'],
        ['Vedic Energisation & Consecration', 'Our sacred malas and wearables undergo authentic Vedic Prana Pratishtha rituals and mantra chanting to awaken their spiritual vibration.', 'flame', '#d97706', '#fef3c7'],
        ['Sacred Devotional Packaging', 'Each divine item is handled with deep sanctity and packed securely with protective devotional materials for an auspicious unboxing.', 'sparkles', '#360910', '#fce7eb'],
        ['Dedicated Devotee Care', 'We assist spiritual seekers with wearing guidelines, japa practices, and care instructions to help you receive maximum divine benefits.', 'heart-handshake', '#e11d48', '#ffe4e6'],
        ['Unwavering Trust & Purity', 'Fostering long-term spiritual trust through honest sourcing, certified gemstones, genuine Panchaloha, and transparent service.', 'shield-check', '#7c3aed', '#f3e8ff'],
    ];
    $card = 'background-color:#ffffff;border-radius:28px;box-shadow:0 10px 30px rgba(0, 0, 0, 0.04);border:1px solid #f1f5f9';
@endphp

@section('content')
<div style="background-color:#fafafa;min-height:100vh;padding-bottom:5rem;font-family:&quot;Poppins&quot;, sans-serif">
  @include('partials.sub-page-header', ['title' => 'About DAIVIKA', 'subtitle' => 'Authentic Spiritual Wearables & Sacred Consecrated Malas'])

  <div style="max-width:1560px;margin:0 auto;padding:0 1.25rem;box-sizing:border-box">
    @include('partials.breadcrumbs', ['items' => [['name' => 'About DAIVIKA', 'url' => '/about']]])

    <div data-enter='{"opacity":0,"y":20}' style="opacity:0;transform:translateY(20px);margin-top:2rem;margin-bottom:3rem;padding:2.5rem 2rem;border-radius:28px;background:linear-gradient(135deg, #360910 0%, #200408 100%);color:#ffffff;text-align:center;box-shadow:0 20px 40px rgba(54, 9, 16, 0.25);position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:180px;height:180px;border-radius: 50%;background-color:rgba(234, 179, 8, 0.15);filter:blur(30px);pointer-events:none"></div>
      <span style="display:inline-flex;align-items:center;gap:0.3rem;background-color:rgba(234, 179, 8, 0.15);color:#facc15;font-size:0.68rem;font-weight:800;padding:0.22rem 0.75rem;border-radius:100px;text-transform:uppercase;letter-spacing:1px;margin-bottom:1rem;border:1px solid rgba(234, 179, 8, 0.3)"><x-icon name="sparkles" size="12" /> Sacred Devotional Sanctuary</span>
      <h1 style="font-size:clamp(1.8rem, 4vw, 2.75rem);font-weight:900;line-height:1.2;margin:0 0 0.75rem 0;color:#ffffff;letter-spacing:-0.5px">DAIVIKA by Zodimithra</h1>
      <p style="font-size:clamp(1.05rem, 2.5vw, 1.35rem);font-weight:700;color:#facc15;margin:0 auto 1.25rem auto;max-width:680px;letter-spacing:0.5px">Authentic Spiritual Wearables &amp; Consecrated Malas</p>
      <div style="width:60px;height:3px;background-color:rgba(255, 255, 255, 0.2);margin:0 auto 1.5rem auto;border-radius:2px"></div>
      <p style="font-size:clamp(0.95rem, 2vw, 1.1rem);color:rgba(255, 255, 255, 0.9);max-width:780px;margin:0 auto;line-height:1.7;font-weight:500">“Bridging ancient Vedic traditions and authentic spiritual energies with seekers worldwide.”</p>
    </div>

    <div data-enter='{"opacity":0,"y":20}' data-enter-delay="0.1" style="opacity:0;transform:translateY(20px);{{ $card }};padding:clamp(1.75rem, 4vw, 3rem);margin-bottom:3rem">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem">
        <div style="width:42px;height:42px;border-radius:12px;background-color:#fce7eb;color:#360910;display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon name="compass" size="22" /></div>
        <h2 style="font-size:clamp(1.4rem, 3vw, 1.85rem);font-weight:800;color:#0f172a;margin:0">Our Sacred Heritage</h2>
      </div>
      <p style="font-size:1.05rem;line-height:1.8;color:#334155;margin-bottom:1.25rem;font-weight:500"><strong>DAIVIKA by Zodimithra</strong> was founded with a profound devotion to bringing authentic, energized spiritual artifacts and divine wearables directly into the lives and homes of seekers.</p>
      <p style="font-size:0.98rem;line-height:1.8;color:#475569;margin-bottom:1.25rem">In a market filled with imitation beads and synthetic stones, Daivika stands as a trusted sanctuary of purity. From genuine Karungali (Ebony wood) malas known for warding off negativity to certified 1 to 14 Mukhi Himalayan Rudrakshas, sacred Tulasi japa malas, and consecrated Panchaloha rings, every item in our store is ethically sourced and ritually sanctified.</p>
      <p style="font-size:0.98rem;line-height:1.8;color:#475569;margin-bottom:1.25rem">Each sacred wearable is consecrated through authentic Vedic rituals and Prana Pratishtha by knowledgeable priests, awakening the dormant natural energies of the sacred wood and seed before it is shipped with devotional reverence.</p>
      <p style="font-size:0.98rem;line-height:1.8;color:#475569;margin-bottom:1.75rem">Whether you are embarking on daily japa meditation, seeking divine protection, or creating a sanctified altar at home, Daivika is here to empower your spiritual path.</p>
      <div style="padding:1.25rem 1.5rem;border-radius:20px;background-color:#fdf2f4;border-left:4px solid #360910;font-size:1.05rem;font-weight:700;color:#360910;line-height:1.6">Every bead holds a prayer. Every sacred wearable carries divine blessings.</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:2rem;margin-bottom:3rem">
      <div data-enter='{"opacity":0,"x":-20}' data-enter-delay="0.2" style="opacity:0;transform:translateX(-20px);{{ $card }};padding:2rem;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem">
          <div style="width:44px;height:44px;border-radius:14px;background-color:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon name="eye" size="22" /></div>
          <h2 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0">Our Vision</h2>
        </div>
        <p style="font-size:0.98rem;line-height:1.8;color:#334155;margin-bottom:1rem;font-weight:500">To be the world’s most trusted sanctuary for authentic Vedic wearables, energised malas, and pooja essentials, inspiring inner peace, protection, and spiritual elevation in every household.</p>
        <p style="font-size:0.95rem;line-height:1.7;color:#64748b;margin:0">We envision a world where ancient spiritual wisdom and sacred natural items remain accessible, authentic, and uncompromised for generations to come.</p>
      </div>

      <div data-enter='{"opacity":0,"x":20}' data-enter-delay="0.3" style="opacity:0;transform:translateX(20px);{{ $card }};padding:2rem;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem">
          <div style="width:44px;height:44px;border-radius:14px;background-color:#fce7eb;color:#360910;display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon name="flame" size="22" /></div>
          <h2 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0">Our Mission</h2>
        </div>
        <p style="font-size:0.98rem;line-height:1.8;color:#334155;margin:0;font-weight:500">To provide devotees and spiritual seekers with 100% natural, lab-certified, and ritually energized Karungali, Rudraksha, Tulasi, and pooja essentials, accompanied by honest guidance and devoted service.</p>
      </div>
    </div>

    <div data-enter='{"opacity":0,"y":20}' data-enter-delay="0.4" style="opacity:0;transform:translateY(20px);{{ $card }};padding:clamp(1.75rem, 4vw, 3rem);margin-bottom:3rem">
      <div style="text-align:center;margin-bottom:2.5rem">
        <span style="font-size:0.78rem;font-weight:800;color:#360910;text-transform:uppercase;letter-spacing:1.5px">Our Devotional Promise</span>
        <h2 style="font-size:clamp(1.5rem, 3.5vw, 2.1rem);font-weight:800;color:#0f172a;margin:0.3rem 0 0 0">We Are Committed To</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1.25rem">
        @foreach ($commitments as [$title, $desc, $icon, $color, $bg])
          <div style="padding:1.5rem;border-radius:20px;background-color:#fafafa;border:1px solid #f1f5f9;display:flex;flex-direction:column;gap:0.85rem">
            <div style="width:42px;height:42px;border-radius:12px;background-color:{{ $bg }};color:{{ $color }};display:flex;align-items:center;justify-content:center;flex-shrink:0"><x-icon :name="$icon" size="20" /></div>
            <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0;line-height:1.3">{{ $title }}</h3>
            <p style="font-size:0.88rem;color:#64748b;margin:0;line-height:1.6">{{ $desc }}</p>
          </div>
        @endforeach
      </div>
    </div>

    <div data-enter='{"opacity":0,"scale":0.96}' data-enter-delay="0.5" style="opacity:0;transform:scale(0.96);border-radius:28px;background-color:#360910;background-image:radial-gradient(circle at top right, #56101c 0%, #24050a 100%);padding:clamp(2rem, 5vw, 3.5rem);color:#ffffff;text-align:center;box-shadow:0 20px 40px rgba(54, 9, 16, 0.25)">
      <div style="width:54px;height:54px;border-radius: 50%;background-color:rgba(234, 179, 8, 0.15);color:#facc15;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem auto"><x-icon name="flame" size="28" /></div>
      <p style="font-size:1.1rem;color:rgba(255, 255, 255, 0.8);margin:0 0 0.5rem 0;font-weight:600">Every bead holds a prayer.</p>
      <h2 style="font-size:clamp(1.6rem, 4vw, 2.4rem);font-weight:900;color:#ffffff;margin:0 0 2rem 0;line-height:1.3">Connect to Divine Energy &amp; Inner Peace</h2>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <a href="/products" style="padding:0.9rem 2rem;border-radius:100px;background-color:#facc15;color:#360910;font-size:0.92rem;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;box-shadow:0 8px 20px rgba(250, 204, 21, 0.25);transition:all 0.25s ease">Explore Sacred Malas &amp; Wearables <x-icon name="arrow-right" size="16" /></a>
        <a href="/contact" style="padding:0.9rem 2rem;border-radius:100px;background-color:rgba(255, 255, 255, 0.1);color:#ffffff;border:1px solid rgba(255, 255, 255, 0.2);font-size:0.92rem;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;transition:all 0.25s ease">Contact Devotee Support</a>
      </div>
    </div>
  </div>
</div>
@endsection

@push('scripts')
  <script src="/js/enter.js"></script>
@endpush
