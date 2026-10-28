import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Auto-create StoredImage table if it doesn't exist (handles production deploy without manual migration)
if (!globalForPrisma._storedImageEnsured) {
  globalForPrisma._storedImageEnsured = true;
  prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoredImage" (
      "id"        TEXT NOT NULL,
      "data"      BYTEA NOT NULL,
      "mimeType"  TEXT NOT NULL DEFAULT 'image/jpeg',
      "filename"  TEXT NOT NULL DEFAULT '',
      "size"      INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("id")
    );
  `).catch((err) => {
    console.warn('[prisma] StoredImage table ensure failed (may already exist):', err.message);
  });
}

export default prisma;
