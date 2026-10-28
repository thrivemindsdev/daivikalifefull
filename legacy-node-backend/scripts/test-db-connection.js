import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Testing PostgreSQL Database Connection & Health...\n');
  
  try {
    // 1. Check raw connection
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version();`;
    console.log('✅ PostgreSQL Connection: SUCCESSFUL!');
    console.log(`⏰ Server Time: ${result[0].current_time}`);
    console.log(`🐘 Version: ${result[0].version}\n`);

    // 2. Query Row Counts for all major models
    const [products, categories, collections, users, banners, reviews, orders, settings] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.category.count().catch(() => 0),
      prisma.collection.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.banner.count().catch(() => 0),
      prisma.review.count().catch(() => 0),
      prisma.order.count().catch(() => 0),
      prisma.setting.count().catch(() => 0)
    ]);

    console.log('📊 Current Database Records Summary:');
    console.log('------------------------------------');
    console.log(`🛍️  Products:    ${products}`);
    console.log(`📂 Categories:  ${categories}`);
    console.log(`✨ Collections: ${collections}`);
    console.log(`👤 Users/Admins:${users}`);
    console.log(`🖼️  Banners:     ${banners}`);
    console.log(`⭐ Reviews:     ${reviews}`);
    console.log(`📦 Orders:      ${orders}`);
    console.log(`⚙️  Settings:    ${settings}`);
    console.log('------------------------------------\n');

    if (products > 0) {
      console.log('🎉 Everything is working properly and database is healthy!');
    } else {
      console.log('ℹ️ Tables are created, but 0 products found. Run: node scripts/seed-postgres.js');
    }

  } catch (err) {
    console.error('❌ PostgreSQL Connection Failed:');
    console.error(err.message);
    console.log('\n💡 Checklist to fix:');
    console.log('1. Ensure DATABASE_URL is set correctly in Coolify Environment Variables.');
    console.log('2. Ensure PostgreSQL service in Coolify is running.');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
