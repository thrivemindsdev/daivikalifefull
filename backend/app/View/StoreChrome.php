<?php

namespace App\View;

use App\Models\Category;
use App\Services\Settings;
use App\Support\Json;
use Illuminate\View\View;

// Data for the parts every storefront page shares (navbar and footer), read once per request
class StoreChrome
{
    public const DEFAULT_LOGO = '/logo-light.png?v=daivika_v3';

    // Ticker icon names the admin can pick, and the icon file each one uses (unknown names show Sparkles)
    private const TICKER_ICONS = [
        'Zap' => 'zap', 'Truck' => 'truck', 'ShieldCheck' => 'shield-check', 'RefreshCw' => 'refresh-cw', 'Sparkles' => 'sparkles',
        'Headphones' => 'headphones', 'Gift' => 'gift', 'ShoppingBag' => 'shopping-bag', 'Percent' => 'percent', 'Clock' => 'clock',
        'Star' => 'star', 'Heart' => 'heart', 'Tag' => 'tag', 'Flame' => 'flame', 'Award' => 'award', 'Package' => 'package',
        'Check' => 'check', 'Shield' => 'shield',
    ];

    private static ?array $cache = null;

    public function compose(View $view): void
    {
        $view->with(self::$cache ??= self::build());
    }

    private static function build(): array
    {
        $company = Json::obj(Settings::get('invoice_settings', []));
        $logo = (string) ($company['companyLogo'] ?? '');
        $threshold = (int) Settings::get('free_shipping_threshold', 500) ?: 500;

        $saved = Settings::get('header_ticker');
        $ticker = is_array($saved) && $saved ? array_map(fn ($t) => [
            'text' => preg_replace('/₹\d+/u', "₹$threshold", (string) ($t['text'] ?? '')),
            'icon' => (string) ($t['icon'] ?? ''),
        ], $saved) : [
            ['text' => 'Order now & get it within **2-3 days!**', 'icon' => 'Zap'],
            ['text' => "Free express delivery above **₹$threshold!**", 'icon' => 'Truck'],
            ['text' => '100% Certified **Pure Quality!**', 'icon' => 'ShieldCheck'],
        ];

        return [
            'navLogo' => $logo !== '' && ! str_contains($logo, 'slaro') && ! str_contains($logo, 'api/images') ? $logo : self::DEFAULT_LOGO,
            'navBrand' => ($company['companyName'] ?? '') ?: 'Daivika',
            'navTicker' => array_map(fn ($t) => [
                'text' => str_replace('**', '', $t['text']),
                'icon' => self::TICKER_ICONS[$t['icon']] ?? 'sparkles',
            ], $ticker),
            'navCategories' => $categories = Category::ordered()->get(['id', 'name', 'image'])->map(fn ($c) => ['name' => (string) $c->name, 'image' => (string) $c->image])->all(),
            'footerLogo' => $logo !== '' && ! str_contains($logo, 'slaro') && ! str_contains($logo, 'api/images') ? $logo : self::DEFAULT_LOGO,
            'footerBrand' => ($company['companyName'] ?? '') ?: 'Daivika',
            'footerCategories' => array_column(array_slice($categories, 0, 5), 'name'),
        ];
    }
}
