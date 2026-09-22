import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function runtimeDatabaseUrl(): string | undefined {
  const configured = process.env.DATABASE_URL;
  if (!configured || process.env.NODE_ENV !== 'production') return configured;

  try {
    const url = new URL(configured);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return configured;

    // The production pooler returns PostgreSQL 42P05 for named prepared
    // statements. Prisma 6's PgBouncer mode disables its statement cache.
    url.searchParams.set('pgbouncer', 'true');
    return url.toString();
  } catch {
    return configured;
  }
}

function createPrismaClient() {
  const datasourceUrl = runtimeDatabaseUrl();
  return new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * One Prisma client per runtime process. This is intentionally provider-neutral:
 * DATABASE_URL can point to Neon today and to another PostgreSQL provider later.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
