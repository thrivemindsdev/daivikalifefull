<?php

namespace App\Support;

// Home page section texts and the product themes behind them (lib/home-sections.js).
// `match` is a JavaScript regular expression source, tested case-insensitively in the browser.
// The same themes power /products?theme=<id>.
class HomeSections
{
    public const INTRO = [
        'eyebrow' => 'Personalised Selection',
        'title' => 'Bring Sacred Meaning into Everyday Life',
        'description' => 'A thoughtful expression of spirituality, shaped by traditional wisdom, meaningful symbolism, and the timeless practices that nurture devotion.',
    ];

    public const BESTSELLERS = [
        'eyebrow' => 'Devotee Favourites',
        'title' => 'Bestselling Sacred Essentials',
        'description' => "Among Daivika's most cherished selections, each offering carries the essence of tradition, devotion, and sacred significance.",
    ];

    public const STORIES = [
        'eyebrow' => 'Sacred Stories & Rituals',
        'title' => 'Stories of Faith & Sacred Rituals',
        'description' => 'A window into the traditions that define Daivika. Witness moments of devotion, sacred practices, and the timeless rituals that honour the divine.',
    ];

    public const SHOP_INTRO = [
        'title' => 'Divine Essentials',
        'description' => 'A curated collection inspired by timeless traditions, sacred symbolism, and the essence of devotion, honouring the deeper meaning of spiritual living.',
    ];

    // In home page order (bestsellers and stories sit between rituals and karungali)
    public const THEMES = [
        [
            'id' => 'rituals',
            'eyebrow' => 'Sacred Daily Rituals',
            'title' => 'The Art of Everyday Devotion',
            'description' => 'Every prayer is an offering of faith, every ritual a moment of divine connection. Honour the sanctity of daily worship with timeless essentials that bring grace and reverence to your sacred space.',
            'match' => 'pooja|puja|pooj|diya|deepam|vilakku|lamp|incense|agarbat|dhoop|dhup|camphor|karpoor|kumkum|sindoor|chandan|sandal|bhasma|vibhuti|kalash|ghanta|\bbell|thali|ritual|havan|homa|idol|yantra|prayer|worship',
        ],
        [
            'id' => 'karungali',
            'eyebrow' => 'Sacred Ebony Wood',
            'title' => 'The Timeless Essence of Karungali',
            'description' => 'Revered for generations, Karungali holds a cherished place in spiritual traditions. A symbol of strength, protection, and inner harmony, its enduring significance transcends time.',
            'match' => 'karungali|ebony',
        ],
        [
            'id' => 'rudraksha',
            'eyebrow' => 'Tears Of Shiva',
            'title' => 'Rudraksha — A Sacred Legacy',
            'description' => 'Born of divine lore and revered as the sacred tears of Lord Shiva, Rudraksha embodies the essence of devotion, spiritual discipline, and the eternal bond between faith and the divine.',
            'match' => 'rudraksh',
        ],
        [
            'id' => 'crystals',
            'eyebrow' => 'Crystal Radiance',
            'title' => "The Beauty of Nature's Treasures",
            'description' => "Formed in the heart of the earth and cherished across ancient traditions, crystals and gemstones embody nature's splendour, timeless symbolism, and the beauty of spiritual harmony.",
            'match' => 'crystal|gem|stone|quartz|amethyst|pyrite|citrine|tiger.?s?.?eye|jade|agate|onyx|selenite|tourmaline|lapis|sphatik|spatik|navaratna|navratna',
        ],
        [
            'id' => 'adornments',
            'eyebrow' => 'Energised Adornments',
            'title' => 'Adorned with Meaning, Rooted in Faith',
            'description' => 'Where celestial wisdom meets timeless craftsmanship, each adornment carries the symbolism of ancient traditions, reflecting personal beliefs, spiritual aspirations, and the beauty of sacred expression.',
            'match' => 'bracelet|pendant|locket|\brings?\b|necklace|chain|anklet|kada|bangle|\bmala\b|earring|jewel|adorn|wearable|panchaloha',
        ],
    ];

    // Feature cards shown above the footer until the admin sets their own ("feature_cards")
    public const FEATURE_CARDS = [
        ['title' => '100% Authentic & Energised', 'desc' => 'Prana Pratishtha by Vedic rituals', 'icon' => 'Flame', 'bg' => 'rgba(181, 231, 109, 0.08)'],
        ['title' => 'Pure Sacred Materials', 'desc' => 'Original Karungali, Rudraksha & Tulasi', 'icon' => 'Sprout', 'bg' => 'rgba(189, 155, 59, 0.08)'],
        ['title' => 'Devotional Sacred Packaging', 'desc' => 'Dispatched with protective care', 'icon' => 'Sparkles', 'bg' => 'rgba(10, 10, 10, 0.06)'],
        ['title' => 'Trusted by Devotees', 'desc' => 'Sacred blessings across India', 'icon' => 'ShieldCheck', 'bg' => 'rgba(181, 231, 109, 0.08)'],
    ];
}
