import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// ── Embedded seed data (no backup folder dependency) ─────────────────────────

const PRODUCTS = [
  {
    id: 'prod_6a7023b3c828fccd41941cb6',
    name: 'Daivika Rain Repellent',
    code: 'SL-RR-001',
    price: 649,
    mrp: 1000,
    category: 'car care',
    subcategory: '',
    image: 'https://res.cloudinary.com/zkspgwa1/image/upload/v1785734063/seepo/products/lhbqpxjjjbupyybqzpya.png',
    subImages: [
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785734064/seepo/products/olqzrir1dcwhui7s3rz6.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785734065/seepo/products/gsgtqu2ell8tqa1nsve3.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785734066/seepo/products/o7o1p5oxk1eibl4fvi6z.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785734066/seepo/products/zbvavwiuohxkitrldcxe.png'
    ],
    description: 'Drive with clearer vision during rain. DAIVIKA Rain Repellent creates a water-repellent layer on glass surfaces, helping rainwater bead up and roll away for improved visibility.',
    specifications: [
      { key: 'Brand', value: 'DAIVIKA' },
      { key: 'Product Type', value: 'Rain Repellent' },
      { key: 'Form', value: 'Liquid' },
      { key: 'Surface Type', value: 'Glass, Mirror & Helmets' },
      { key: 'Effect', value: 'Hydrophobic Water Repellent' },
      { key: 'Features', value: 'Water Beading, Clear Visibility, Easy Application' },
      { key: 'Volume', value: '100 Ml' }
    ],
    highlights: [
      { title: 'Crystal Clear Visibility', description: 'Helps maintain a clearer view while driving in rainy weather.' },
      { title: 'Superior Water Repellency', description: 'Creates a hydrophobic coating that makes rainwater bead up and roll off the glass.' },
      { title: 'Safer Driving', description: 'Improves visibility during rain, helping you drive with greater confidence.' },
      { title: 'Easy to Apply', description: 'Apply in just a few minutes with a clean cloth for quick protection.' },
      { title: 'Long-Lasting Protection', description: 'Provides durable water-repellent performance for extended use.' },
      { title: 'Multi-Surface Use', description: 'Suitable for car windshields, side windows, rear glass, and helmet visors.' },
      { title: 'Works in Heavy Rain', description: 'Helps reduce water buildup on the windshield during rainfall.' },
      { title: 'Premium Hydrophobic Formula', description: 'Advanced formula designed to repel water and improve driving visibility.' }
    ],
    featured: true,
    gender: 'daivika',
    colors: [],
    textures: [],
    variants: [],
    inventory: [{ variant: '', color: '', stock: 100 }],
    views: 90
  },
  {
    id: 'prod_6a6f3d25688916a235cee279',
    name: 'Daivika Premium Foam Wash Kit',
    code: 'SLR-FWK-001',
    price: 1499,
    mrp: 2000,
    category: 'car care',
    subcategory: '',
    image: 'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675038/seepo/products/ya1imiji3fqoj9qpua2t.png',
    subImages: [
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675039/seepo/products/nx8pvjm2j6l75dnzdgg2.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675040/seepo/products/qomlsi5p4zaznf4lwop3.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675041/seepo/products/nqvgjtew338kyfdbun0h.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675042/seepo/products/dcwlokomnliq7qqqpxss.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675043/seepo/products/ou05fooyuiea2y3ig1rf.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675043/seepo/products/xsonych1uoq3tuctuga9.png',
      'https://res.cloudinary.com/zkspgwa1/image/upload/v1785675044/seepo/products/wtwoou4upfu1f4mpau8j.png'
    ],
    description: 'Professional Car Wash at Home – No Pressure Washer Needed\n\n⭐⭐⭐⭐⭐ Rated by Happy Customers\n\nGet showroom-level cleanliness at home with the DAIVIKA Premium Foam Wash Kit. Our thick foam formula lifts dirt gently without scratching your car\'s paint.',
    specifications: [
      { key: 'Brand', value: 'DAIVIKA' },
      { key: 'Product Type', value: 'Foam Wash Kit' },
      { key: 'Foam Sprayer Capacity', value: '2 Litres' },
      { key: 'Shampoo Quantity', value: '500 Ml' },
      { key: 'Shampoo Type', value: 'Ceramic Shampoo' },
      { key: 'Microfibre Gloves', value: 'Included' },
      { key: 'Microfibre Towel', value: 'Included' },
      { key: 'Suitable For', value: 'All Vehicles' },
      { key: 'Pressure Washer & Electricity Required', value: 'No' },
      { key: 'Reusable', value: 'Yes' },
      { key: 'Country Of Origin', value: 'India' }
    ],
    highlights: [
      { title: 'Thick Foam Cleaning', description: 'Creates rich, thick foam for an effective car wash.' },
      { title: 'No Pressure Washer', description: 'Wash your car without electricity or a pressure washer.' },
      { title: 'Scratch-Free Wash', description: 'Soft microfiber gloves & towel help protect your car\'s paint.' },
      { title: 'Premium Products', description: 'Includes sprayer, ceramic shampoo, glove, and microfiber towels.' },
      { title: 'Easy Home Car Wash', description: 'Get a professional-quality wash at home in minutes.' },
      { title: 'Save Time & Money', description: 'Avoid expensive service station car washes.' }
    ],
    featured: true,
    gender: 'daivika',
    colors: [],
    textures: [],
    variants: [],
    inventory: [{ variant: '', color: '', stock: 200 }],
    views: 74
  },
  {
    id: 'prod_daivika_anti_fog_spray_001',
    name: 'DAIVIKA Anti-Fog Spray',
    code: 'SL-AFS-001',
    price: 399,
    mrp: 800,
    category: 'car care',
    subcategory: '',
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&auto=format&fit=crop&q=80',
    subImages: [
      'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Prevent fogging and mist on windshields, mirrors, helmet visors, and eyeglasses with DAIVIKA Anti-Fog Spray. Formulated for high humidity and rainy drives.',
    specifications: [
      { key: 'Brand', value: 'DAIVIKA' },
      { key: 'Product Type', value: 'Anti-Fog Spray' },
      { key: 'Form', value: 'Spray' },
      { key: 'Volume', value: '100 Ml' },
      { key: 'Surface Type', value: 'Glass, Mirror & Helmets' }
    ],
    highlights: [
      { title: 'Clear Visibility', description: 'Instant crystal-clear view on misty and foggy days.' },
      { title: 'Streak-Free Formula', description: 'Leaves no haze or oily residue on glass surfaces.' },
      { title: 'Long-Lasting Performance', description: 'Protects against fog buildup for days.' }
    ],
    featured: true,
    gender: 'daivika',
    colors: [],
    textures: [],
    variants: [],
    inventory: [{ variant: '', color: '', stock: 150 }],
    views: 85
  },
  {
    id: 'prod_daivika_microfibre_towel_001',
    name: 'DAIVIKA 1200 GSM Microfibre Drying Towel',
    code: 'SL-MDT-1200',
    price: 499,
    mrp: 999,
    category: 'car care',
    subcategory: '',
    image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&auto=format&fit=crop&q=80',
    subImages: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80'
    ],
    description: 'Ultra-plush 1200 GSM microfiber towel designed for fast, streak-free drying. Absorbs up to 10x its weight in water while protecting clear coats from scratches.',
    specifications: [
      { key: 'Brand', value: 'DAIVIKA' },
      { key: 'Product Type', value: 'Microfiber Drying Towel' },
      { key: 'GSM', value: '1200 GSM' },
      { key: 'Size', value: '40 x 40 cm' }
    ],
    highlights: [
      { title: 'Ultra-High Absorbency', description: 'Absorbs water instantly in a single pass without wringing.' },
      { title: 'Scratch-Free & Plush', description: 'Safe for delicate automotive clear coats and ceramic finishes.' },
      { title: 'Lint-Free Drying', description: 'Leaves zero lint or streaks behind.' }
    ],
    featured: true,
    gender: 'daivika',
    colors: [],
    textures: [],
    variants: [],
    inventory: [{ variant: '', color: '', stock: 250 }],
    views: 110
  }
];

const CATEGORIES = [
  { name: 'car care', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80', subcategories: [] },
  { name: 'accessories', image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=600&q=80', subcategories: [] },
  { name: 'home essentials', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80', subcategories: [] }
];

const COLLECTIONS = [
  { name: 'all', image: '' },
  { name: 'daivika', image: '' },
  { name: 'trending collection', image: '' }
];

// Only the admin defined in the environment; no passwords are kept in source code
const ADMINS = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD ? [
  {
    email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
    name: process.env.ADMIN_NAME || 'Daivika Administrator',
    password: process.env.ADMIN_PASSWORD,
    role: 'admin'
  }
] : [];

let BANNERS = [];
try {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'custom_banners.json'),
    path.join(__dirname, '..', 'data', 'custom_banners.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        BANNERS = parsed.map(b => ({
          id: b.id || b._id || `banner_${Date.now()}`,
          image: b.image || '',
          mobileImage: b.mobileImage || '',
          title: b.title || 'Daivika Banner',
          subtitle: b.subtitle || '',
          description: b.description || '',
          link: b.link || '/products',
          buttonText: b.buttonText || 'Shop Now'
        }));
        break;
      }
    }
  }
} catch (e) {
  console.warn('Could not read custom_banners.json for seeding:', e.message);
}

if (BANNERS.length === 0) {
  BANNERS = [
    {
      id: 'banner_1',
      image: '/api/images/cmu8aidx30000o332jvqtne4c',
      mobileImage: '/api/images/cmu8aidx30000o332jvqtne4c',
      title: 'Professional Car Wash At Home',
      subtitle: "Don't waste money on service stations",
      description: 'Buy 4 Get 2 Free - Free Tyre Polish Kit with Full Combo Kit',
      link: '/products',
      buttonText: 'Shop Now'
    },
    {
      id: 'banner_2',
      image: '/api/images/cmu8aig120001o332o6skmi4u',
      mobileImage: '/api/images/cmu8aig120001o332o6skmi4u',
      title: 'Daivika Rain Repellent',
      subtitle: 'Clear Vision. Safe Drive.',
      description: 'Hydrophobic Water Beading for Windshields & Glass',
      link: '/products',
      buttonText: 'Explore Now'
    },
    {
      id: 'banner_3',
      image: '/api/images/cmu8aih9j0002o332wle1gk77',
      mobileImage: '/api/images/cmu8aih9j0002o332wle1gk77',
      title: 'Thick Foam, Deep Clean',
      subtitle: 'Professional Results At Your Home',
      description: 'Powerful Cleaning Action, Safe on Paint & Glass',
      link: '/products',
      buttonText: 'Order Today'
    }
  ];
}

// ── Main Seeder ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting PostgreSQL Seeding...\n');

  // 1. Collections
  console.log('1️⃣ Seeding Collections...');
  for (const col of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { name: col.name },
      update: {}, // Preserve existing collection data modified by admin
      create: { name: col.name, image: col.image }
    }).catch(e => console.warn(`  Collection ${col.name}:`, e.message));
  }

  // 2. Categories
  console.log('2️⃣ Seeding Categories...');
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {}, // Preserve existing category data modified by admin
      create: { name: cat.name, image: cat.image, subcategories: cat.subcategories }
    }).catch(e => console.warn(`  Category ${cat.name}:`, e.message));
  }
  console.log(`  ✅ Checked ${CATEGORIES.length} categories.`);

  // 3. Products
  console.log('3️⃣ Seeding Products...');
  let productCount = 0;
  for (const prod of PRODUCTS) {
    const { id, ...data } = prod;
    await prisma.product.upsert({
      where: { id },
      update: {}, // Preserve existing products modified in admin panel
      create: { id, ...data }
    }).then(() => productCount++).catch(e => console.warn(`  Product ${prod.name}:`, e.message));
  }
  console.log(`  ✅ Checked ${productCount} products.`);

  // 4. Admin Accounts
  console.log('4️⃣ Seeding Admin Accounts...');
  for (const adm of ADMINS) {
    const hashedPassword = await bcrypt.hash(adm.password, 10);
    await prisma.user.upsert({
      where: { email: adm.email },
      update: { role: adm.role },
      create: { name: adm.name, email: adm.email, password: hashedPassword, role: adm.role, avatar: '' }
    }).catch(e => console.warn(`  Admin ${adm.email}:`, e.message));
  }
  console.log(`  ✅ Checked ${ADMINS.length} admin accounts.`);

  // 5. Banners (Preserve PostgreSQL as the single source of truth - NEVER wipe admin banners)
  console.log('5️⃣ Checking Banners...');
  const existingBanners = await prisma.banner.findMany().catch(() => []);

  if (existingBanners.length > 0) {
    console.log(`  ✅ Found ${existingBanners.length} existing banners in PostgreSQL database. Preserving admin banners.`);
    // Sync PostgreSQL banners to local custom_banners.json as backup
    try {
      const bannerFilePath = path.join(process.cwd(), 'data', 'custom_banners.json');
      fs.writeFileSync(bannerFilePath, JSON.stringify(existingBanners, null, 2), 'utf8');
    } catch (e) {}
  } else {
    // Only seed initial default banners if database has ZERO banners (fresh install)
    console.log(`  🌱 PostgreSQL banners table is empty. Seeding ${BANNERS.length} initial banners...`);
    for (const banner of BANNERS) {
      await prisma.banner.create({
        data: banner
      }).catch(e => console.warn(`  Banner ${banner.id}:`, e.message));
    }
    console.log(`  ✅ Seeded ${BANNERS.length} initial banners.`);
  }

  // 6. Default Settings
  console.log('6️⃣ Checking Default Settings...');
  const settings = [
    { key: 'free_shipping_threshold', value: 600 },
    { key: 'company_name', value: 'Daivika' },
    {
      key: 'invoice_settings',
      value: {
        companyName: 'Daivika',
        companyEmail: 'support@daivika.in',
        companyPhone: '+91 9876543210',
        companyStreet: 'Kozhikode, Kerala',
        companyCity: 'Kozhikode',
        companyState: 'Kerala',
        companyPin: '673001'
      }
    }
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {}, // Preserve settings customized in admin dashboard
      create: { key: s.key, value: s.value }
    }).catch(() => {});
  }

  console.log('\n🎉 Database Verification & Seeding Complete!');
}

seed()
  .catch(e => { console.error('Seeding error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
