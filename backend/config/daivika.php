<?php

// Store settings read from the environment. Names match the old Next.js backend's .env, so the same
// .env values work for both.
return [

    'jwt_secret' => env('JWT_SECRET'),

    // Built-in admin account (ADMIN_EMAIL / ADMIN_PASSWORD). In production it is only enabled when both are set.
    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
        'name' => env('ADMIN_NAME', 'Daivika Administrator'),
        'phone' => env('ADMIN_PHONE', ''),
    ],

    'frontend_url' => env('FRONTEND_URL', env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')),

    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID', env('NEXT_PUBLIC_RAZORPAY_KEY_ID')),
        'key_secret' => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
    ],

    'cashfree' => [
        'app_id' => env('CASHFREE_APP_ID', env('NEXT_PUBLIC_CASHFREE_APP_ID')),
        'secret_key' => env('CASHFREE_SECRET_KEY'),
        'env' => env('CASHFREE_ENV', env('NEXT_PUBLIC_CASHFREE_ENV', 'sandbox')),
    ],

    'cloudinary' => [
        'cloud_name' => env('CLOUDINARY_CLOUD_NAME'),
        'api_key' => env('CLOUDINARY_API_KEY'),
        'api_secret' => env('CLOUDINARY_API_SECRET'),
        'folder' => env('CLOUDINARY_FOLDER', 'Clixdot/Daivika'),
    ],

    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY', env('NEXT_PUBLIC_VAPID_PUBLIC_KEY')),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT', 'mailto:support@daivika.com'),
    ],

    'smtp' => [
        'host' => env('SMTP_HOST'),
        'port' => (int) env('SMTP_PORT', 587),
        'user' => env('SMTP_USER'),
        'pass' => env('SMTP_PASS'),
        'admin_email' => env('ADMIN_NOTIFICATION_EMAIL', 'admin@daivika.in'),
    ],

    'sms' => [
        'api_key' => env('SMS_API_KEY'),
        'sender' => env('DLT_SENDER_ID'),
        'template_id' => env('DLT_OTP_TEMPLATE_ID'),
        'template_text' => env('DLT_OTP_TEMPLATE_TEXT', ''),
        'otp_expiry_minutes' => max(1, (int) env('OTP_EXPIRY_MINUTES', 5)),
        'otp_max_attempts' => max(1, (int) env('OTP_MAX_ATTEMPTS', 5)),
    ],

    // Resized copies of database-stored images are cached here
    'image_cache_dir' => env('IMAGE_CACHE_DIR', storage_path('app/image-cache')),
];
