@extends('layouts.store')

@push('head')
  <link rel="stylesheet" href="/css/profile.css">
@endpush

@section('content')
{{-- public/js/profile.js draws the guest card or the account pages once the login check is done --}}
<div data-profile></div>
<input type="file" data-profile-file style="display:none" accept="image/*">

@php
    $pfIcons = [];
    foreach (['user', 'shield', 'shield-check', 'heart', 'shopping-bag', 'camera', 'log-out', 'check-circle-2', 'trash-2', 'arrow-right', 'settings', 'credit-card', 'map-pin', 'chevron-right', 'package', 'refresh-ccw', 'x', 'check', 'alert-triangle', 'edit-2', 'plus', 'star', 'home', 'briefcase', 'phone', 'chevron-down', 'search'] as $n) {
        $pfIcons[$n] = json_decode(file_get_contents(resource_path("icons/$n.svg")), true);
    }
@endphp
<script>window.DaivikaIcons = Object.assign(window.DaivikaIcons || {}, {!! json_encode($pfIcons, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!});</script>
@endsection

@push('scripts')
  <script src="/js/india-districts.js"></script>
  <script src="/js/address-tools.js"></script>
  <script src="/js/vendor/jspdf.umd.min.js" defer></script>
  <script src="/js/vendor/jspdf.plugin.autotable.min.js" defer></script>
  <script src="/js/profile.js"></script>
@endpush
