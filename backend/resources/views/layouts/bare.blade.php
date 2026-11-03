{{-- Pages outside the store layout (app/(auth)): no navbar, footer or cart --}}
<!DOCTYPE html>
<html lang="en">
<head>
  @include('partials.head')
</head>
<body style="margin:0;padding:0">
  @include('partials.alert-dialog')
  @yield('content')
  <script>window.DaivikaConfig = @json(['vapidPublicKey' => config('daivika.vapid.public_key')]);</script>
  <script src="/js/motion.js"></script>
  <script src="/js/daivika.js"></script>
  <script src="/js/alert.js"></script>
  @stack('scripts')
</body>
</html>
