@extends('layouts.store')

@section('title', 'Contact Support & Corporate Inquiries | DAIVIKA')
@section('description', 'Get in touch with DAIVIKA support. Reach out via email, phone, or message for inquiries, bulk orders, and customer support.')

@push('head')
  <script type="application/ld+json">{!! json_encode([
      '@context' => 'https://schema.org',
      '@type' => 'ContactPage',
      'mainEntity' => [
          '@type' => 'LocalBusiness',
          'name' => $c['companyName'],
          'email' => $c['companyEmail'],
          'telephone' => $c['companyPhone'],
          'address' => ['@type' => 'PostalAddress', 'streetAddress' => $c['companyStreet'], 'addressLocality' => $c['companyCity'], 'addressRegion' => $c['companyState'], 'postalCode' => $c['companyPin'], 'addressCountry' => 'IN'],
      ],
  ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) !!}</script>
@endpush

@php
    $ease = '[0.16,1,0.3,1]';
    $card = 'opacity:0;transform:translateY(30px);border-radius:24px;padding:2.5rem;background-color:#ffffff;transition:all 0.3s ease-out';
    $iconBox = 'background-color:rgba(166, 124, 82, 0.1);border-radius:16px;padding:0.9rem;color:var(--color-primary);display:flex;align-items:center;justify-content:center';
    $title = 'font-size:1.15rem;font-weight:800;color:var(--color-primary);margin-bottom:0.4rem;font-family:\'Poppins\', sans-serif';
    $sub = 'font-size:0.88rem;color:#666;line-height:1.5;margin:0 0 1rem 0;font-weight:500';
    $link = 'font-size:1rem;font-weight:700;color:var(--color-primary);text-decoration:none;transition:opacity 0.2s;word-break:break-all';
    $label = 'display:block;font-size:0.75rem;font-weight:800;text-transform:uppercase;color:var(--color-primary);margin-bottom:0.5rem;letter-spacing:0.5px';
    $input = 'width:100%;padding:1rem 1.25rem;border-radius:12px;outline:none;font-size:0.9rem;color:#111;font-weight:500;background-color:#fff;transition:all 0.25s ease;box-sizing:border-box';
    $phones = array_map('trim', preg_split('/[,\/]+/', $c['companyPhone']));
@endphp

@section('content')
<div style="background-color:#fff;min-height:100vh">
  @include('partials.sub-page-header', ['title' => 'Contact Us', 'subtitle' => 'Contact Support'])

  <div class="contact-page-main" style="padding-top:1rem;padding-bottom:8rem">
    <div class="container">
      <div class="contact-grid" style="gap:clamp(2.5rem, 6vw, 6rem);align-items:start;max-width:1560px;margin:2rem auto 0 auto">
        <div style="display:flex;flex-direction:column;gap:2rem">
          <div class="contact-info-card dv-contact-card" data-enter='{"opacity":0,"y":30}' data-enter-duration="0.8" data-enter-ease="{{ $ease }}" style="{{ $card }}">
            <div style="display:flex;gap:1.5rem;align-items:flex-start">
              <div style="{{ $iconBox }}"><x-icon name="mail" size="22" /></div>
              <div style="min-width:0;width:100%">
                <h4 style="{{ $title }}">Email Support</h4>
                <p style="{{ $sub }}">{{ $c['contactEmailSubtitle'] }}</p>
                <a href="mailto:{{ $c['companyEmail'] }}" class="dv-contact-link" style="{{ $link }}">{{ $c['companyEmail'] }}</a>
              </div>
            </div>
          </div>

          <div class="contact-info-card dv-contact-card" data-enter='{"opacity":0,"y":30}' data-enter-duration="0.8" data-enter-delay="0.1" data-enter-ease="{{ $ease }}" style="{{ $card }}">
            <div style="display:flex;gap:1.5rem;align-items:flex-start">
              <div style="{{ $iconBox }}"><x-icon name="phone" size="22" /></div>
              <div style="min-width:0;width:100%">
                <h4 style="{{ $title }}">Phone Support</h4>
                <p style="{{ $sub }}">{{ $c['contactPhoneSubtitle'] }}</p>
                @foreach ($phones as $i => $phone)@if ($i > 0)<span style="color:#ccc;margin:0 0.5rem">|</span>@endif<a href="tel:{{ preg_replace('/\s+/', '', $phone) }}" class="dv-contact-link" style="{{ $link }}">{{ $phone }}</a>@endforeach
              </div>
            </div>
          </div>

          <div class="contact-info-card dv-contact-card" data-enter='{"opacity":0,"y":30}' data-enter-duration="0.8" data-enter-delay="0.2" data-enter-ease="{{ $ease }}" style="{{ $card }}">
            <div style="display:flex;gap:1.5rem;align-items:flex-start">
              <div style="{{ $iconBox }}"><x-icon name="map-pin" size="22" /></div>
              <div style="min-width:0;width:100%">
                <h4 style="{{ $title }}">Headquarters</h4>
                <p style="{{ $sub }}">{{ $c['contactAddressSubtitle'] }}</p>
                <p style="font-size:1rem;font-weight:700;color:#111;margin:0;line-height:1.6">{{ $c['companyStreet'] }}<br>{{ $c['companyCity'] }}, {{ $c['companyState'] }} – {{ $c['companyPin'] }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="contact-form-card" data-enter='{"opacity":0,"x":40}' data-enter-duration="0.85" data-enter-ease="{{ $ease }}" style="opacity:0;transform:translateX(40px);background-color:#ffffff;border-radius:32px;padding:3rem;border:1px solid rgba(27, 60, 44, 0.08);box-shadow:0 10px 30px rgba(0, 0, 0, 0.03)">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem">
            <div style="background-color:rgba(166, 124, 82, 0.1);border-radius: 50%;padding:0.5rem;display:flex;align-items:center;justify-content:center"><x-icon name="message-square" size="18" color="var(--color-primary)" /></div>
            <h3 style="font-size:1.4rem;font-weight:800;color:#111;font-family:'Poppins', sans-serif">Drop Us A Message</h3>
          </div>

          <form data-contact-form style="display:flex;flex-direction:column;gap:1.5rem">
            <div>
              <label style="{{ $label }}">Your Name</label>
              <input type="text" name="name" required placeholder="e.g. John Doe" class="dv-contact-input" style="{{ $input }}">
            </div>
            <div class="contact-form-fields-row" style="gap:1rem">
              <div>
                <label style="{{ $label }}">Email Address</label>
                <input type="email" name="email" required placeholder="e.g. john@example.com" class="dv-contact-input" style="{{ $input }}">
              </div>
              <div>
                <label style="{{ $label }}">Subject</label>
                <input type="text" name="subject" placeholder="e.g. Order Tracking" class="dv-contact-input" style="{{ $input }}">
              </div>
            </div>
            <div>
              <label style="{{ $label }}">Your Message</label>
              <textarea name="message" required rows="5" placeholder="How can we help you today?" class="dv-contact-input" style="{{ $input }};font-family:inherit;resize:vertical;line-height:1.5"></textarea>
            </div>
            <button type="submit" data-contact-send class="dv-contact-send" style="color:#fff;border:none;border-radius:12px;padding:1.1rem;font-size:0.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:1rem;transition:all 0.2s ease;opacity:1;box-shadow:0 10px 20px rgba(166, 124, 82, 0.15)">
              <span data-contact-idle style="display:contents"><span>Send Message</span><x-icon name="send" size="16" /></span>
              <span data-contact-busy hidden>Sending Message...</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div data-contact-success hidden style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1.5rem">
    <div data-contact-success-backdrop style="position:absolute;inset:0;background-color:rgba(0,0,0,0.3);backdrop-filter:blur(4px)"></div>
    <div data-contact-success-card style="position:relative;background-color:#ffffff;border:1px solid #f0f0f0;border-radius:24px;width:100%;max-width:420px;padding:2.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.1);z-index:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1.5rem">
      <div style="background-color:rgba(166, 124, 82, 0.05);border-radius: 50%;width:64px;height:64px;display:flex;align-items:center;justify-content:center;color:var(--color-primary)"><x-icon name="check-circle-2" size="32" /></div>
      <div>
        <h4 style="font-size:1.35rem;font-weight:800;color:#111;margin-bottom:0.5rem">Message Dispatched</h4>
        <p style="font-size:0.9rem;color:#666;line-height:1.5;margin:0;font-weight:500">Your inquiry has been successfully sent to the {{ $c['companyName'] }} curators. We will contact you back shortly.</p>
      </div>
      <button type="button" data-contact-done style="width:100%;padding:0.9rem;background-color:var(--color-primary);color:#fff;border:none;border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer">Done</button>
    </div>
  </div>
</div>
@endsection

@push('scripts')
  <script src="/js/enter.js"></script>
  <script src="/js/contact.js"></script>
@endpush
