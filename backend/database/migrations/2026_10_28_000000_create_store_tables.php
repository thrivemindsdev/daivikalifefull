<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The store tables exactly as the original Prisma schema created them. Every statement uses IF NOT EXISTS,
// so running this on the existing production database changes nothing that is already there.
// The only addition is Notification.broadcastId (admin broadcast history).
return new class extends Migration
{
    public function up(): void
    {
        foreach (self::STATEMENTS as $sql) {
            DB::statement($sql);
        }
    }

    public function down(): void
    {
        // Never drops store data
    }

    private const STATEMENTS = [
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Product" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "code" TEXT NOT NULL DEFAULT '',
            "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "mrp" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "category" TEXT NOT NULL,
            "subcategory" TEXT NOT NULL DEFAULT '',
            "extraCategories" JSONB DEFAULT '[]',
            "image" TEXT NOT NULL,
            "subImages" JSONB DEFAULT '[]',
            "description" TEXT NOT NULL,
            "shortDescription" TEXT NOT NULL DEFAULT '',
            "benefits" TEXT NOT NULL DEFAULT '',
            "astrologySignificance" TEXT NOT NULL DEFAULT '',
            "howToWear" TEXT NOT NULL DEFAULT '',
            "specifications" JSONB DEFAULT '[]',
            "highlights" JSONB DEFAULT '[]',
            "featured" BOOLEAN NOT NULL DEFAULT false,
            "gender" TEXT NOT NULL DEFAULT 'all',
            "badge" TEXT NOT NULL DEFAULT '',
            "badgeBg" TEXT NOT NULL DEFAULT '',
            "badgeColor" TEXT NOT NULL DEFAULT '',
            "bulkMinQty" INTEGER,
            "bulkPrice" DOUBLE PRECISION,
            "colors" JSONB DEFAULT '[]',
            "textures" JSONB DEFAULT '[]',
            "variants" JSONB DEFAULT '[]',
            "inventory" JSONB DEFAULT '[]',
            "views" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Category" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "image" TEXT NOT NULL DEFAULT '',
            "gender" TEXT NOT NULL DEFAULT 'all',
            "subcategories" JSONB DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Collection" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "image" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Banner" (
            "id" TEXT NOT NULL,
            "image" TEXT NOT NULL DEFAULT '',
            "mobileImage" TEXT NOT NULL DEFAULT '',
            "title" TEXT NOT NULL DEFAULT 'Daivika Banner',
            "subtitle" TEXT NOT NULL DEFAULT '',
            "description" TEXT NOT NULL DEFAULT '',
            "link" TEXT NOT NULL DEFAULT '/products',
            "buttonText" TEXT NOT NULL DEFAULT 'Shop Now',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT,
            "phone" TEXT,
            "password" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'user',
            "avatar" TEXT NOT NULL DEFAULT '',
            "googleId" TEXT,
            "pushSubscriptions" JSONB DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "User_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Order" (
            "id" TEXT NOT NULL,
            "razorpay_payment_id" TEXT NOT NULL DEFAULT '',
            "invoiceNumber" TEXT NOT NULL,
            "user" TEXT NOT NULL,
            "email" TEXT NOT NULL DEFAULT '',
            "phone" TEXT NOT NULL,
            "total" DOUBLE PRECISION NOT NULL,
            "shippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "status" TEXT NOT NULL DEFAULT 'Processing',
            "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
            "paymentMethod" TEXT NOT NULL,
            "isPartialCod" BOOLEAN NOT NULL DEFAULT false,
            "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "remainingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "codPercent" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
            "time" TEXT NOT NULL DEFAULT '',
            "date" TEXT NOT NULL DEFAULT '',
            "address" JSONB NOT NULL,
            "itemsList" JSONB NOT NULL,
            "isGuest" BOOLEAN NOT NULL DEFAULT true,
            "userId" TEXT,
            "isStockDecremented" BOOLEAN NOT NULL DEFAULT false,
            "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "couponCode" TEXT NOT NULL DEFAULT '',
            "companyDetails" JSONB DEFAULT '{}',
            "vendorId" TEXT,
            "vendorName" TEXT NOT NULL DEFAULT '',
            "vendorStatus" TEXT NOT NULL DEFAULT '',
            "stockSource" TEXT NOT NULL DEFAULT '',
            "routingLog" JSONB DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Review" (
            "id" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "user" TEXT NOT NULL,
            "email" TEXT NOT NULL DEFAULT '',
            "productName" TEXT NOT NULL DEFAULT '',
            "rating" INTEGER NOT NULL DEFAULT 5,
            "comment" TEXT NOT NULL,
            "orderId" TEXT NOT NULL DEFAULT '',
            "likes" INTEGER NOT NULL DEFAULT 0,
            "replies" JSONB DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Setting" (
            "id" TEXT NOT NULL,
            "key" TEXT NOT NULL,
            "value" JSONB NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "ContactMessage" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "phone" TEXT NOT NULL DEFAULT '',
            "subject" TEXT NOT NULL DEFAULT '',
            "message" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'unread',
            "notes" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Newsletter" (
            "id" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Notification" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "type" TEXT NOT NULL DEFAULT 'system',
            "recipientType" TEXT NOT NULL DEFAULT 'all',
            "targetUserId" TEXT,
            "isRead" BOOLEAN NOT NULL DEFAULT false,
            "readBy" JSONB DEFAULT '[]',
            "link" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "PopularSearch" (
            "id" TEXT NOT NULL,
            "query" TEXT NOT NULL,
            "count" INTEGER NOT NULL DEFAULT 1,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "PopularSearch_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Size" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "order" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "ProductGroup" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "productIds" JSONB DEFAULT '[]',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "StoredImage" (
            "id" TEXT NOT NULL,
            "data" BYTEA NOT NULL,
            "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
            "filename" TEXT NOT NULL DEFAULT '',
            "size" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "Vendor" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "businessName" TEXT NOT NULL DEFAULT '',
            "email" TEXT NOT NULL DEFAULT '',
            "phone" TEXT NOT NULL DEFAULT '',
            "state" TEXT NOT NULL,
            "district" TEXT NOT NULL,
            "address" TEXT NOT NULL DEFAULT '',
            "pincode" TEXT NOT NULL DEFAULT '',
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "notes" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "VendorStock" (
            "id" TEXT NOT NULL,
            "vendorId" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "variant" TEXT NOT NULL DEFAULT '',
            "color" TEXT NOT NULL DEFAULT '',
            "stock" INTEGER NOT NULL DEFAULT 0,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "VendorStock_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            CREATE TABLE IF NOT EXISTS "VendorReport" (
            "id" TEXT NOT NULL,
            "vendorId" TEXT NOT NULL,
            "vendorName" TEXT NOT NULL DEFAULT '',
            "title" TEXT NOT NULL DEFAULT '',
            "rangeFrom" TIMESTAMP(3) NOT NULL,
            "rangeTo" TIMESTAMP(3) NOT NULL,
            "groupBy" TEXT NOT NULL DEFAULT 'day',
            "note" TEXT NOT NULL DEFAULT '',
            "summary" JSONB DEFAULT '{}',
            "data" JSONB NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'submitted',
            "adminNote" TEXT NOT NULL DEFAULT '',
            "reviewedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "VendorReport_pkey" PRIMARY KEY ("id")
            )
            SQL,
        <<<'SQL'
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT NOT NULL DEFAULT ''
            SQL,
        <<<'SQL'
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "benefits" TEXT NOT NULL DEFAULT ''
            SQL,
        <<<'SQL'
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "astrologySignificance" TEXT NOT NULL DEFAULT ''
            SQL,
        <<<'SQL'
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "howToWear" TEXT NOT NULL DEFAULT ''
            SQL,
        <<<'SQL'
            ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "extraCategories" JSONB DEFAULT '[]'
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Product_featured_idx" ON "Product"("featured")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "Collection_name_key" ON "Collection"("name")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Order_vendorId_idx" ON "Order"("vendorId")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Review_productId_idx" ON "Review"("productId")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "Newsletter_email_key" ON "Newsletter"("email")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "PopularSearch_query_key" ON "PopularSearch"("query")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_userId_key" ON "Vendor"("userId")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "Vendor_state_district_idx" ON "Vendor"("state", "district")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "VendorStock_productId_idx" ON "VendorStock"("productId")
            SQL,
        <<<'SQL'
            CREATE UNIQUE INDEX IF NOT EXISTS "VendorStock_vendorId_productId_variant_color_key" ON "VendorStock"("vendorId", "productId", "variant", "color")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "VendorReport_vendorId_idx" ON "VendorReport"("vendorId")
            SQL,
        <<<'SQL'
            CREATE INDEX IF NOT EXISTS "VendorReport_status_idx" ON "VendorReport"("status")
            SQL,
        <<<'SQL'
            ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "broadcastId" TEXT
            SQL,
    ];
};
