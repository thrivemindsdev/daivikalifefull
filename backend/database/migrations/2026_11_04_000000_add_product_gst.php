<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// GST rate (%) and HSN code per product, shown on invoices. Existing products start without a rate
// (no GST line on their invoices) until the admin sets one.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gstRate" DOUBLE PRECISION');
        DB::statement('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT NOT NULL DEFAULT \'\'');
    }

    public function down(): void
    {
        // Never drops store data
    }
};
