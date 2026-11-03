<?php

use App\Http\Controllers\StorePageController;
use App\Support\PolicyPages;
use Illuminate\Support\Facades\Route;

// The JSON API lives under /api. Storefront pages move here from Next.js as they are converted.
Route::get('/', fn () => response()->json(['name' => 'Daivika API', 'status' => 'ok']));
Route::get('/faq', [StorePageController::class, 'faq']);
foreach (array_keys(PolicyPages::PAGES) as $slug) {
    Route::get('/'.$slug, [StorePageController::class, 'policy'])->defaults('slug', $slug);
}
