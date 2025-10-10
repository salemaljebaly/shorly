import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with demo data...');

  // Clean existing records (order matters because of foreign keys)
  await prisma.clickEvent.deleteMany();
  await prisma.oneLink.deleteMany();
  await prisma.link.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'demo@shorly.app',
        name: 'Demo Owner',
        password: passwordHash,
        bio: 'Growth marketer turning clicks into customers.',
        website: 'https://shorly.app',
        timezone: 'UTC',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'marketing@shorly.app',
        name: 'Marketing Team',
        password: passwordHash,
        bio: 'Owns campaigns and QR activations.',
        website: 'https://marketing.shorly.app',
        timezone: 'America/New_York',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
      },
    }),
  ]);

  const [demoUser, marketingUser] = users;

  const demoLinks = await Promise.all([
    prisma.link.create({
      data: {
        userId: demoUser.id,
        shortCode: 'launch',
        destinationUrl: 'https://shorly.app/features',
        title: 'Product Launch',
        description: 'Feature overview for launch announcement',
        tags: ['launch', 'product'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: demoUser.id,
        shortCode: 'pricing',
        destinationUrl: 'https://shorly.app/pricing',
        title: 'Pricing Page',
        tags: ['pricing', 'sales'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: demoUser.id,
        shortCode: 'support',
        destinationUrl: 'https://support.shorly.app',
        title: 'Support Portal',
        tags: ['support'],
        isActive: false,
      },
    }),
  ]);

  const marketingLinks = await Promise.all([
    prisma.link.create({
      data: {
        userId: marketingUser.id,
        shortCode: 'fb-ads',
        destinationUrl: 'https://campaigns.shorly.app/facebook',
        title: 'Facebook Ads Landing',
        tags: ['paid', 'facebook'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: marketingUser.id,
        shortCode: 'newsletter',
        destinationUrl: 'https://shorly.app/newsletter',
        title: 'Newsletter Signup',
        tags: ['email'],
        isActive: true,
      },
    }),
  ]);

  const demoOneLinks = await Promise.all([
    prisma.oneLink.create({
      data: {
        userId: demoUser.id,
        shortCode: 'get-app',
        title: 'Get the Shorly App',
        description: 'Direct users to the right store based on device',
        fallbackUrl: 'https://shorly.app/download',
        isActive: true,
        targets: [
          { deviceType: 'android', url: 'https://play.google.com/store/apps/details?id=shorly' },
          { deviceType: 'ios', url: 'https://apps.apple.com/app/shorly/id000000' },
          { deviceType: 'web', url: 'https://shorly.app/download' },
        ] as Prisma.JsonArray,
      },
    }),
    prisma.oneLink.create({
      data: {
        userId: demoUser.id,
        shortCode: 'demo-call',
        title: 'Book a Demo',
        description: 'Route based on device for scheduling experience',
        fallbackUrl: 'https://cal.shorly.app/book',
        isActive: true,
        targets: [
          { deviceType: 'android', url: 'https://cal.shorly.app/book?platform=android' },
          { deviceType: 'ios', url: 'https://cal.shorly.app/book?platform=ios' },
          { deviceType: 'web', url: 'https://cal.shorly.app/book' },
        ] as Prisma.JsonArray,
      },
    }),
  ]);

  const marketingOneLinks = await Promise.all([
    prisma.oneLink.create({
      data: {
        userId: marketingUser.id,
        shortCode: 'qr-signup',
        title: 'Event QR Signup',
        fallbackUrl: 'https://events.shorly.app/signup',
        isActive: true,
        targets: [
          { deviceType: 'android', url: 'https://events.shorly.app/signup?device=android' },
          { deviceType: 'ios', url: 'https://events.shorly.app/signup?device=ios' },
          { deviceType: 'web', url: 'https://events.shorly.app/signup' },
        ] as Prisma.JsonArray,
      },
    }),
  ]);

  const now = new Date();
  const clickEvents = [
    // Demo user link clicks
    ...demoLinks.flatMap((link, index) => [
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - index * 3600_000),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) Safari/605.1.15',
        referer: 'https://twitter.com',
        country: 'United States',
        city: 'San Francisco',
        device: 'desktop',
        browser: 'Safari',
        os: 'macOS',
      },
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - index * 5400_000),
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
        referer: 'https://google.com',
        country: 'United States',
        city: 'New York',
        device: 'mobile',
        browser: 'Mobile Safari',
        os: 'iOS',
      },
    ]),
    // Marketing team links
    ...marketingLinks.flatMap((link, index) => [
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - (index + 1) * 2700_000),
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6)',
        referer: 'https://facebook.com',
        country: 'Canada',
        city: 'Toronto',
        device: 'mobile',
        browser: 'Chrome',
        os: 'Android',
      },
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - (index + 1) * 1800_000),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referer: 'https://linkedin.com',
        country: 'United Kingdom',
        city: 'London',
        device: 'desktop',
        browser: 'Edge',
        os: 'Windows',
      },
    ]),
    // OneLink routing events
    ...demoOneLinks.map((oneLink, index) => ({
      oneLinkId: oneLink.id,
      timestamp: new Date(now.getTime() - index * 4200_000),
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
      referer: 'https://instagram.com',
      country: 'United States',
      city: 'Los Angeles',
      device: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
    })),
    ...marketingOneLinks.map((oneLink, index) => ({
      oneLinkId: oneLink.id,
      timestamp: new Date(now.getTime() - index * 3600_000),
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991U)',
      referer: 'https://qr-event.com',
      country: 'Germany',
      city: 'Berlin',
      device: 'mobile',
      browser: 'Chrome',
      os: 'Android',
    })),
  ];

  await prisma.clickEvent.createMany({ data: clickEvents });

  console.log('✅ Seed data created successfully.');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
