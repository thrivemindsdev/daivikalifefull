<?php

use App\Http\Controllers\SiteFilesController;
use App\Http\Controllers\StorePageController;
use App\Support\PolicyPages;
use Illuminate\Support\Facades\Route;

// The JSON API lives under /api. Storefront pages move here from Next.js as they are converted.
Route::get('/', [StorePageController::class, 'home']);
Route::get('/products', [StorePageController::class, 'products']);
Route::get('/product/{id}', [StorePageController::class, 'product']);
Route::get('/profile', [StorePageController::class, 'profile']);
Route::get('/checkout', [StorePageController::class, 'checkout']);
Route::get('/admin/dashboard', [StorePageController::class, 'adminDashboard']);
Route::get('/vendor/dashboard', [StorePageController::class, 'vendorDashboard']);
Route::get('/login', [StorePageController::class, 'login']);
Route::get('/faq', [StorePageController::class, 'faq']);
Route::get('/about', [StorePageController::class, 'about']);
Route::get('/contact', [StorePageController::class, 'contact']);
Route::get('/wishlist', [StorePageController::class, 'wishlist']);
Route::get('/order-tracking', [StorePageController::class, 'orderTracking']);
foreach (array_keys(PolicyPages::PAGES) as $slug) {
    Route::get('/'.$slug, [StorePageController::class, 'policy'])->defaults('slug', $slug);
}

Route::get('/robots.txt', [SiteFilesController::class, 'robots']);
Route::get('/sitemap.xml', [SiteFilesController::class, 'sitemap']);
Route::get('/uploads/{path}', [SiteFilesController::class, 'upload'])->where('path', '.*');

// Any other address: the API keeps its own JSON 404 (bootstrap/app.php), pages get the 404 screen
Route::fallback(function () {
    abort_if(request()->is('api/*'), 404);

    return app(SiteFilesController::class)->notFound();
});
