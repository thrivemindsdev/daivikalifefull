import { execSync } from 'child_process';

async function start() {
  console.log('🚀 Starting Daivika Application Server...');

  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log('📦 DATABASE_URL detected. Synchronizing PostgreSQL schema...');
    try {
      // Without --accept-data-loss: a schema change that would drop data stops here instead of deleting it
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      console.log('🌱 Running PostgreSQL Seeder...');
      execSync('node ./scripts/seed-postgres.js', { stdio: 'inherit' });
    } catch (err) {
      console.warn('⚠️ Database sync/seed encountered an issue:', err.message);
      console.log('Continuing server boot...');
    }
  } else {
    console.warn('⚠️ No DATABASE_URL found in environment variables. Starting server in fallback mode.');
    console.warn('👉 Please add DATABASE_URL in Coolify Environment Variables settings.');
  }

  console.log('🌐 Starting Next.js production server...');
  execSync('next start', { stdio: 'inherit' });
}

start().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
