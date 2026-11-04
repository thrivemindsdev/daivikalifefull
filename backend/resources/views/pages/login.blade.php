@extends('layouts.bare')

@push('head')
  <link rel="stylesheet" href="/css/login.css">
@endpush

@section('content')
<div class="login-wrapper">
  <div class="login-split-container">
    <div class="login-visual-panel state-login">
      <div style="width:100%;height:100%;border-radius:28px;overflow:hidden;box-shadow:0 20px 50px rgba(0, 0, 0, 0.15);position:relative;border:1px solid rgba(197, 160, 89, 0.25)">
        <img src="/login-spiritual-hero.jpg" alt="Daivika Sacred Spiritual Collection" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;opacity:1">
      </div>
    </div>
    <div class="login-form-panel state-login">
      <div class="form-ambient-glow state-login"></div>
      <div class="login-form-container" data-login style="opacity:1;transform:translateY(0)">
        <div class="mobile-logo-wrapper">
          <a href="/" style="display:inline-block"><img src="/logo.png?v=daivika_v3" alt="Daivika Logo" class="mobile-logo-img"></a>
        </div>
        <a href="/" class="back-to-store-link"><x-icon name="arrow-left" size="14" /> Back to Store</a>
        <div class="form-header">
          <h1 class="form-title" data-login-title>Welcome Back</h1>
          <p class="form-subtitle" data-login-subtitle>Log in with your mobile number and password.</p>
        </div>
        <div class="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" class="auth-tab active" data-login-tab="login">Login</button>
          <button type="button" role="tab" aria-selected="false" class="auth-tab " data-login-tab="signup">Register</button>
        </div>
        <form data-login-form></form>
        <div class="toggle-text-minimal" data-login-toggle>New to Daivika? <button type="button" class="toggle-link-minimal" data-login-switch>Create Account</button></div>
      </div>
    </div>
  </div>
</div>

@php
    $loginIcons = [];
    foreach (['lock', 'user', 'phone', 'eye', 'eye-off', 'arrow-right'] as $n) {
        $loginIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, {!! json_encode($loginIcons, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!});</script>
@endsection

@push('scripts')
  <script src="/js/login.js"></script>
@endpush
