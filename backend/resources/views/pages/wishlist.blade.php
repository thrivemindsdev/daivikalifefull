@extends('layouts.store')

@section('content')
{{-- Shown until the login check says otherwise, as on the React page --}}
<div data-wishlist-guest class="container wishlist-guest-container" style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding-top:3rem;padding-bottom:3rem">
  <div data-enter='{"opacity":0,"y":20}' data-enter-transition="default" style="opacity:0;transform:translateY(20px);max-width:500px;text-align:center;padding:clamp(3rem, 8vw, 4rem) clamp(1.5rem, 5vw, 4rem) clamp(4rem, 10vw, 5rem);background-color:#fff;border-radius:40px;box-shadow:0 30px 60px rgba(0,0,0,0.05);border:1px solid #f0f0f0">
    <div style="width:80px;height:80px;border-radius: 50%;background-color:#fdfbf9;display:flex;align-items:center;justify-content:center;margin:0 auto 2rem"><x-icon name="heart" size="32" color="var(--color-primary)" fill="var(--color-primary)" /></div>
    <h2 style="font-size:2rem;font-weight:900;margin-bottom:1rem;color:#111">Wishlist Access</h2>
    <p style="color:#666;font-size:1.05rem;line-height:1.6;margin-bottom:2.5rem">Please log in to your account to view and manage your saved items.</p>
    <a href="/login" class="btn btn-primary" style="padding:1.25rem 2.5rem;border-radius:16px;font-weight:800">Sign In to Continue</a>
  </div>
</div>

<div data-wishlist-user hidden class="container" style="padding-top:1.5rem;padding-bottom:2rem">
  <div style="margin-bottom:4rem;text-align:center">
    <h1 style="font-size:3rem;font-weight:900;margin-bottom:1rem">My Wishlist</h1>
    <p style="color:#888;font-size:1.1rem">Items you've saved for later.</p>
  </div>
  <div data-wishlist-grid class="grid-4"></div>
  <div data-wishlist-empty hidden style="text-align:center;padding:5rem 0">
    <div style="width:100px;height:100px;border-radius: 50%;background-color:#f5f5f5;display:flex;align-items:center;justify-content:center;margin:0 auto 2rem"><x-icon name="heart" size="40" color="#ccc" /></div>
    <h3 style="font-size:1.5rem;margin-bottom:1rem">Your wishlist is empty</h3>
    <p style="color:#888;margin-bottom:2.5rem">Start adding items you love to your wishlist!</p>
    <a href="/products" class="btn btn-primary">Explore Collection</a>
  </div>
</div>
@endsection

@push('scripts')
  <script src="/js/enter.js"></script>
  @include('partials.product-card-assets')
  <script src="/js/wishlist.js"></script>
@endpush
