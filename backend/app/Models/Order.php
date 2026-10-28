<?php

namespace App\Models;

use App\Casts\JsonValue;

class Order extends BaseModel
{
    protected $table = 'Order';

    public const COLUMNS = ['id', 'razorpay_payment_id', 'invoiceNumber', 'user', 'email', 'phone', 'total', 'shippingCharge', 'status', 'paymentStatus', 'paymentMethod', 'isPartialCod', 'advanceAmount', 'remainingAmount', 'codPercent', 'time', 'date', 'address', 'itemsList', 'isGuest', 'userId', 'isStockDecremented', 'discount', 'couponCode', 'companyDetails', 'vendorId', 'vendorName', 'vendorStatus', 'stockSource', 'routingLog', 'createdAt', 'updatedAt'];

    protected $casts = [
        'total' => 'float',
        'shippingCharge' => 'float',
        'isPartialCod' => 'boolean',
        'advanceAmount' => 'float',
        'remainingAmount' => 'float',
        'codPercent' => 'float',
        'address' => JsonValue::class,
        'itemsList' => JsonValue::class,
        'isGuest' => 'boolean',
        'isStockDecremented' => 'boolean',
        'discount' => 'float',
        'companyDetails' => JsonValue::class,
        'routingLog' => JsonValue::class,
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];
}
