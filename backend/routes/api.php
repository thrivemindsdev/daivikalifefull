<?php

use App\Http\Controllers\Api;
use Illuminate\Support\Facades\Route;

// Same URLs as the old Next.js API (/api/...). Each module takes the rest of the path and decides by
// method and segments, like the old catch-all routes did.
$methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

$modules = [
    'auth' => Api\AuthController::class,
    'products' => Api\ProductController::class,
    'categories' => Api\CategoryController::class,
    'collections' => Api\CollectionController::class,
    'sizes' => Api\SizeController::class,
    'popular-searches' => Api\PopularSearchController::class,
    'admin' => Api\AdminController::class,
    'public' => Api\PublicController::class,
    'orders' => Api\OrderController::class,
    'payment' => Api\PaymentController::class,
    'reviews' => Api\ReviewController::class,
    'notifications' => Api\NotificationController::class,
    'vendors' => Api\VendorController::class,
    'reports' => Api\ReportController::class,
    'meta-pixel' => Api\MetaPixelController::class,
];

foreach ($modules as $prefix => $controller) {
    Route::match($methods, $prefix.'/{path?}', $controller)->where('path', '.*');
}

Route::get('images/{id}', Api\ImageController::class);
Route::get('health', Api\HealthController::class);

Route::fallback(fn () => \App\Support\Api::error('API endpoint not found', 404));
