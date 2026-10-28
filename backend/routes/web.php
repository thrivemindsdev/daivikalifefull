<?php

use Illuminate\Support\Facades\Route;

// This app only serves the JSON API under /api (the storefront is the Next.js app)
Route::get('/', fn () => response()->json(['name' => 'Daivika API', 'status' => 'ok']));
