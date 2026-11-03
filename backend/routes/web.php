<?php

use App\Http\Controllers\StorePageController;
use App\Support\PolicyPages;
use Illuminate\Support\Facades\Route;

// The JSON API lives under /api. Storefront pages move here from Next.js as they are converted.
Route::get('/', [StorePageController::class, 'home']);
Route::get('/products', [StorePageController::class, 'products']);
Route::get('/faq', [StorePageController::class, 'faq']);
Route::get('/about', [StorePageController::class, 'about']);
Route::get('/contact', [StorePageController::class, 'contact']);
Route::get('/wishlist', [StorePageController::class, 'wishlist']);
Route::get('/order-tracking', [StorePageController::class, 'orderTracking']);
foreach (array_keys(PolicyPages::PAGES) as $slug) {
    Route::get('/'.$slug, [StorePageController::class, 'policy'])->defaults('slug', $slug);
}
