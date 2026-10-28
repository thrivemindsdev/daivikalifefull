<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Display order of categories, set by the admin (lower comes first). Existing categories start at 0 and keep
// their current order (newest first) until the admin changes it.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0');
    }

    public function down(): void
    {
        // Never drops store data
    }
};
