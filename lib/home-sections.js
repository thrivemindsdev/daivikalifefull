// Home page content sections and the product themes behind them.
// The same themes power the "View all" links: /products?theme=<id> shows every product that matches.

export const HOME_INTRO = {
  eyebrow: 'Personalised Selection',
  title: 'Bring Sacred Meaning into Everyday Life',
  description: 'A thoughtful expression of spirituality, shaped by traditional wisdom, meaningful symbolism, and the timeless practices that nurture devotion.',
};

export const BESTSELLERS = {
  eyebrow: 'Devotee Favourites',
  title: 'Bestselling Sacred Essentials',
  description: "Among Daivika's most cherished selections, each offering carries the essence of tradition, devotion, and sacred significance.",
};

export const STORIES = {
  eyebrow: 'Sacred Stories & Rituals',
  title: 'Stories of Faith & Sacred Rituals',
  description: 'A window into the traditions that define Daivika. Witness moments of devotion, sacred practices, and the timeless rituals that honour the divine.',
};

export const SHOP_INTRO = {
  title: 'Divine Essentials',
  description: 'A curated collection inspired by timeless traditions, sacred symbolism, and the essence of devotion, honouring the deeper meaning of spiritual living.',
};

// Product themes, in home page order (stories and bestsellers sit between rituals and karungali)
export const THEMES = [
  {
    id: 'rituals',
    eyebrow: 'Sacred Daily Rituals',
    title: 'The Art of Everyday Devotion',
    description: 'Every prayer is an offering of faith, every ritual a moment of divine connection. Honour the sanctity of daily worship with timeless essentials that bring grace and reverence to your sacred space.',
    match: /pooja|puja|pooj|diya|deepam|vilakku|lamp|incense|agarbat|dhoop|dhup|camphor|karpoor|kumkum|sindoor|chandan|sandal|bhasma|vibhuti|kalash|ghanta|\bbell|thali|ritual|havan|homa|idol|yantra|prayer|worship/i,
  },
  {
    id: 'karungali',
    eyebrow: 'Sacred Ebony Wood',
    title: 'The Timeless Essence of Karungali',
    description: 'Revered for generations, Karungali holds a cherished place in spiritual traditions. A symbol of strength, protection, and inner harmony, its enduring significance transcends time.',
    match: /karungali|ebony/i,
  },
  {
    id: 'rudraksha',
    eyebrow: 'Tears Of Shiva',
    title: 'Rudraksha — A Sacred Legacy',
    description: 'Born of divine lore and revered as the sacred tears of Lord Shiva, Rudraksha embodies the essence of devotion, spiritual discipline, and the eternal bond between faith and the divine.',
    match: /rudraksh/i,
  },
  {
    id: 'crystals',
    eyebrow: 'Crystal Radiance',
    title: "The Beauty of Nature's Treasures",
    description: "Formed in the heart of the earth and cherished across ancient traditions, crystals and gemstones embody nature's splendour, timeless symbolism, and the beauty of spiritual harmony.",
    match: /crystal|gem|stone|quartz|amethyst|pyrite|citrine|tiger.?s?.?eye|jade|agate|onyx|selenite|tourmaline|lapis|sphatik|spatik|navaratna|navratna/i,
  },
  {
    id: 'adornments',
    eyebrow: 'Energised Adornments',
    title: 'Adorned with Meaning, Rooted in Faith',
    description: 'Where celestial wisdom meets timeless craftsmanship, each adornment carries the symbolism of ancient traditions, reflecting personal beliefs, spiritual aspirations, and the beauty of sacred expression.',
    match: /bracelet|pendant|locket|\brings?\b|necklace|chain|anklet|kada|bangle|\bmala\b|earring|jewel|adorn|wearable|panchaloha/i,
  },
];

export const getTheme = (id) => THEMES.find(t => t.id === id);

const text = (v) => (typeof v === 'object' && v ? v.name || v.slug || '' : String(v || ''));

export function productMatchesTheme(product, theme) {
  if (!product || !theme) return false;
  const haystack = [
    product.name,
    text(product.category),
    text(product.subcategory),
    // Extra categories the admin listed the product under
    ...(Array.isArray(product.extraCategories) ? product.extraCategories.flatMap(e => [e?.category, e?.subcategory]) : []),
    Array.isArray(product.tags) ? product.tags.join(' ') : product.tags,
  ].filter(Boolean).join(' ');
  return theme.match.test(haystack);
}
