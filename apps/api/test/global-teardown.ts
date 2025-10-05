import { PrismaClient } from '@prisma/client';

export default async function globalTeardown() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://shorly:shorly_password@localhost:5432/shorly_test',
      },
    },
  });

  try {
    await prisma.$connect();

    // Truncate all tables in correct order
    await prisma.clickEvent.deleteMany({});
    await prisma.link.deleteMany({});
    await prisma.oneLink.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Test database cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning test database:', error);
  } finally {
    await prisma.$disconnect();
  }
}
