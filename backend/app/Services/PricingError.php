<?php

namespace App\Services;

use RuntimeException;

// A problem with the cart the customer has to fix (shown to them as it is)
class PricingError extends RuntimeException
{
    public function __construct(string $message, public string $errorCode = 'invalid_order', public string $productId = '')
    {
        parent::__construct($message);
    }
}
