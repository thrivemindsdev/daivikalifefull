@php
    $isCheckout = request()->is('checkout');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
  @include('partials.head')
</head>
<body style="margin:0;padding:0">
  <div class="app-container">
    @include('partials.toasts')
    @include('partials.alert-dialog')
    @unless ($isCheckout)
      @include('partials.navbar')
      @include('partials.cart-drawer')
      @include('partials.floating-cart')
      @include('partials.welcome-popup')
    @endunless
    <main class="main-content {{ request()->is('/') ? 'home-page' : '' }} {{ request()->is('product/*') ? 'product-page' : '' }}">
      @yield('content')
      @unless ($isCheckout)
        @include('partials.footer')
      @endunless
    </main>
  </div>
  <script>window.DaivikaConfig = @json(['vapidPublicKey' => config('daivika.vapid.public_key')]);</script>
  <script src="/js/motion.js"></script>
  <script src="/js/daivika.js"></script>
  <script src="/js/toasts.js"></script>
  <script src="/js/alert.js"></script>
  @unless ($isCheckout)
    <script src="/js/navbar.js"></script>
    <script src="/js/cart-drawer.js"></script>
    <script src="/js/floating-cart.js"></script>
    <script src="/js/welcome-popup.js"></script>
  @endunless
  @stack('scripts')
</body>
</html>
