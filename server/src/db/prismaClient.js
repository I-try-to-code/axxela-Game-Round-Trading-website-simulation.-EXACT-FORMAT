/**
 * Prisma Client wrapper
 * 
 * Provides database persistence with graceful fallback if running without active migrations.
 */
let prisma = null;

try {
  const { PrismaClient } = await import('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  // Prisma client not yet generated or running in memory mode
  console.log('[DB] Running with in-memory persistence layer');
}

export { prisma };
