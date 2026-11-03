<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\Settings;
use App\Support\Json;
use App\Support\PolicyPages;
use Illuminate\Contracts\View\View;

// Storefront pages rendered by Blade
class StorePageController
{
    private const FAQS = [
        ['category' => 'Orders', 'question' => 'How long does shipping take?', 'answer' => 'Our standard express shipping takes 3-5 business days across India. Every order is packed with devotional care and protective sanctified packaging.'],
        ['category' => 'Orders', 'question' => 'How can I track my sacred order?', 'answer' => 'Once your order is consecrated and dispatched, you will receive an SMS and email with a live tracking number to follow your package directly.'],
        ['category' => 'Returns & Exchanges', 'question' => 'What is your return and exchange policy?', 'answer' => 'Due to the sacred and energised nature of our spiritual wearables and pooja items, we maintain a strict policy. If an item arrives damaged, we provide immediate assistance and replacements.'],
        ['category' => 'Returns & Exchanges', 'question' => 'What if I receive a damaged or incorrect item?', 'answer' => 'Every order undergoes strict sanctity and quality inspection before dispatch. If you receive a transit-damaged item, please contact us on WhatsApp at +91 75108 21228 within 24 hours with photos, and we will immediately send a blessed replacement.'],
        ['category' => 'Product', 'question' => 'Are the Karungali wood and Rudrakshas 100% authentic and natural?', 'answer' => 'Yes, 100%. All our Karungali (Ebony wood) malas, Himalayan Rudrakshas, and sacred Tulasi beads are 100% natural, pure, and authentic. They are ethically harvested without artificial dyes or harmful chemicals.'],
        ['category' => 'Product', 'question' => 'Are your spiritual malas and wearables energised (Prana Pratishtha)?', 'answer' => 'Yes. Every sacred mala, yantra, and spiritual wearable undergoes authentic Vedic Prana Pratishtha rituals and mantra chanting by qualified Vedic priests to invoke divine blessings before reaching you.'],
    ];

    public function faq(): View
    {
        $company = Json::obj(Settings::get('invoice_settings', []));
        return view('pages.faq', [
            'faqs' => self::FAQS,
            'categories' => ['All', ...array_values(array_unique(array_column(self::FAQS, 'category')))],
            'email' => ($company['companyEmail'] ?? '') ?: 'support@daivika.in',
            'phones' => array_filter(array_map('trim', preg_split('/[,\/]+/', ($company['companyPhone'] ?? '') ?: '+91 75108 21228'))),
        ]);
    }

    public function about(): View
    {
        return view('pages.about');
    }

    // Contact details come from the invoice settings, with the storefront's defaults for empty fields
    public function contact(): View
    {
        $company = Json::obj(Settings::get('invoice_settings', []));
        $defaults = [
            'companyName' => 'DAIVIKA Store',
            'companyEmail' => 'daivikaofficial77@gmail.com',
            'companyPhone' => '+91 75108 21228',
            'companyStreet' => 'Kuriyedam, Ayikkarapadi',
            'companyCity' => 'Malappuram',
            'companyState' => 'Kerala',
            'companyPin' => '673637',
            'contactEmailSubtitle' => 'Drop us a line and our executive concierge team will respond within 4 business hours.',
            'contactPhoneSubtitle' => 'Mon – Sat: 9:00 AM to 6:00 PM IST. Standard calling rates apply.',
            'contactAddressSubtitle' => 'Visit our design flagship experience store or send your return parcels to:',
        ];
        $c = [];
        foreach ($defaults as $key => $fallback) {
            $c[$key] = ($company[$key] ?? '') ?: $fallback;
        }
        return view('pages.contact', ['c' => $c]);
    }

    // Privacy, terms, refund, returns and shipping pages: the admin's saved text, or the defaults
    public function policy(string $slug): View
    {
        $page = PolicyPages::PAGES[$slug];
        $saved = Json::obj(Settings::get($page['setting'], []));
        $title = $page['seoTitle'];
        return view('pages.policy', [
            'slug' => $slug,
            'page' => $page,
            'content' => $saved ?: $page['defaults'],
            'seoTitle' => str_contains($title, 'DAIVIKA') || str_contains($title, 'Daivika') ? $title : "$title | DAIVIKA",
            'siteUrl' => request()->getSchemeAndHttpHost(),
        ]);
    }
}
