<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sub-user permissions, the customer-facing order number and back-in-stock requests. Also repairs the settings
// that older admin pages saved as two rows named "key" and "value" instead of one row under the real name.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT \'[]\'');
        DB::statement('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT NOT NULL DEFAULT \'\'');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order" ("orderNumber") WHERE "orderNumber" <> \'\'');

        DB::statement(<<<'SQL'
            CREATE TABLE IF NOT EXISTS "StockNotification" (
                "id" TEXT NOT NULL,
                "productId" TEXT NOT NULL,
                "variant" TEXT NOT NULL DEFAULT '',
                "color" TEXT NOT NULL DEFAULT '',
                "phone" TEXT NOT NULL,
                "userId" TEXT,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "notifiedAt" TIMESTAMP(3),
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "StockNotification_pkey" PRIMARY KEY ("id")
            )
            SQL);
        DB::statement('CREATE INDEX IF NOT EXISTS "StockNotification_status_idx" ON "StockNotification" ("status", "productId")');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "StockNotification_pending_key" ON "StockNotification" ("productId", "variant", "color", "phone") WHERE "status" = \'pending\'');

        $name = Setting::query()->where('key', 'key')->first();
        $value = Setting::query()->where('key', 'value')->first();
        if ($name && $value && is_string($name->value) && ! Setting::query()->where('key', $name->value)->exists()) {
            Setting::query()->create(['key' => $name->value, 'value' => $value->value]);
        }
        Setting::query()->whereIn('key', ['key', 'value'])->delete();
    }

    public function down(): void
    {
        // Never drops store data
    }
};
