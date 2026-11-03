{{-- Admin and vendor dashboards: the React app built by tools/dashboards into public/dashboard --}}
<!DOCTYPE html>
<html lang="en">
<head>
  @include('partials.head', ['reactApp' => true])
  @if (file_exists(public_path("dashboard/$entry.css")))
    <link rel="stylesheet" href="/dashboard/{{ $entry }}.css?v={{ filemtime(public_path("dashboard/$entry.css")) }}">
  @endif
</head>
<body style="margin:0;padding:0">
  <div id="daivika-dashboard"></div>
  <script>window.__DAIVIKA_VAPID__ = @json(config('daivika.vapid.public_key'));</script>
  <script type="module" src="/dashboard/{{ $entry }}.js?v={{ filemtime(public_path("dashboard/$entry.js")) }}"></script>
</body>
</html>
