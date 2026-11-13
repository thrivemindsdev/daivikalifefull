<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Special offer sale - divine weekend badge tag per product.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isWeekendSale" BOOLEAN NOT NULL DEFAULT false');
    }

    public function down(): void
    {
        // Never drops store data
    }
};

