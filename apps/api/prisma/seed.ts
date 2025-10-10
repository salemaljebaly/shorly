import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedRoles() {
  console.log('👥 Seeding default roles...');

  const defaultRoles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full system access - owner only',
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'users:impersonate',
        'users:suspend',
        'billing:read',
        'billing:write',
        'billing:refund',
        'system:read',
        'system:write',
        'roles:manage',
        'logs:read',
      ],
    },
    {
      name: 'ADMIN',
      description: 'Admin access - trusted team members',
      permissions: [
        'users:read',
        'users:write',
        'users:impersonate',
        'users:suspend',
        'billing:read',
        'billing:write',
        'system:read',
        'logs:read',
      ],
    },
    {
      name: 'SUPERVISOR',
      description: 'Read-only monitoring access',
      permissions: ['users:read', 'billing:read', 'system:read', 'logs:read'],
    },
    {
      name: 'USER',
      description: 'Regular user - no admin access',
      permissions: [],
    },
  ];

  for (const roleData of defaultRoles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: roleData,
      create: roleData,
    });
  }

  console.log('✅ Default roles seeded successfully.');
}

async function main() {
  console.log('🌱 Seeding database with demo data...');

  // Clean existing records (order matters because of foreign keys)
  await prisma.clickEvent.deleteMany();
  await prisma.oneLink.deleteMany();
  await prisma.link.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // Seed default roles
  await seedRoles();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Get the roles we just created
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });

  if (!superAdminRole || !adminRole || !userRole) {
    throw new Error('Default roles not found. Make sure roles are seeded first.');
  }

  const users = await Promise.all([
    // Super Admin Users
    prisma.user.create({
      data: {
        email: 'admin@shorly.app',
        name: 'Super Admin',
        password: passwordHash,
        bio: 'Super administrator with full system access.',
        website: 'https://shorly.app',
        timezone: 'UTC',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        roleId: superAdminRole.id, // Assign SUPER_ADMIN role
      },
    }),
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
        roleId: superAdminRole.id, // Assign SUPER_ADMIN role
      },
    }),

    // Regular Admin Users
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
        roleId: adminRole.id, // Assign ADMIN role
      },
    }),
    prisma.user.create({
      data: {
        email: 'support@shorly.app',
        name: 'Support Lead',
        password: passwordHash,
        bio: 'Handles customer support and user management.',
        website: 'https://support.shorly.app',
        timezone: 'America/Los_Angeles',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        roleId: adminRole.id, // Assign ADMIN role
      },
    }),

    // Supervisor (Read-only Admin)
    prisma.user.create({
      data: {
        email: 'supervisor@shorly.app',
        name: 'System Supervisor',
        password: passwordHash,
        bio: 'Monitoring and analytics supervisor with read-only access.',
        website: 'https://analytics.shorly.app',
        timezone: 'Europe/London',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        roleId: (await prisma.role.findUnique({ where: { name: 'SUPERVISOR' } }))!.id,
      },
    }),

    // Regular Users (for testing admin features)
    prisma.user.create({
      data: {
        email: 'user1@shorly.app',
        name: 'Regular User One',
        password: passwordHash,
        bio: 'Regular user for testing admin management features.',
        website: 'https://personal.shorly.app',
        timezone: 'America/New_York',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: true,
        roleId: userRole.id, // Assign USER role
      },
    }),
    prisma.user.create({
      data: {
        email: 'user2@shorly.app',
        name: 'Regular User Two',
        password: passwordHash,
        bio: 'Another regular user for testing purposes.',
        website: 'https://blog.shorly.app',
        timezone: 'Asia/Tokyo',
        language: 'en',
        emailNotifications: false,
        analyticsTracking: true,
        roleId: userRole.id, // Assign USER role
      },
    }),
    prisma.user.create({
      data: {
        email: 'suspended@shorly.app',
        name: 'Suspended User',
        password: passwordHash,
        bio: 'User with suspended account for testing suspension features.',
        website: 'https://suspended.shorly.app',
        timezone: 'Europe/Paris',
        language: 'en',
        emailNotifications: true,
        analyticsTracking: false,
        roleId: userRole.id, // Assign USER role
        isActive: false, // Inactive user
        suspendedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Suspended 24 hours ago
        suspendedBy: 'admin@shorly.app',
        suspensionReason: 'Violation of terms of service',
      },
    }),
  ]);

  const [
    adminUser,
    demoUser,
    marketingUser,
    supportUser,
    supervisorUser,
    regularUser1,
    regularUser2,
    suspendedUser,
  ] = users;

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

  // Support user links
  const supportLinks = await Promise.all([
    prisma.link.create({
      data: {
        userId: supportUser.id,
        shortCode: 'help-docs',
        destinationUrl: 'https://docs.shorly.app',
        title: 'Help Documentation',
        tags: ['support', 'documentation'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: supportUser.id,
        shortCode: 'contact-us',
        destinationUrl: 'https://support.shorly.app/contact',
        title: 'Contact Support',
        tags: ['support', 'contact'],
        isActive: true,
      },
    }),
  ]);

  // Regular user links
  const regularUserLinks = await Promise.all([
    prisma.link.create({
      data: {
        userId: regularUser1.id,
        shortCode: 'my-blog',
        destinationUrl: 'https://myblog.shorly.app',
        title: 'My Personal Blog',
        tags: ['personal', 'blog'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: regularUser2.id,
        shortCode: 'portfolio',
        destinationUrl: 'https://portfolio.shorly.app',
        title: 'My Portfolio',
        tags: ['portfolio', 'work'],
        isActive: true,
      },
    }),
    prisma.link.create({
      data: {
        userId: suspendedUser.id,
        shortCode: 'banned-link',
        destinationUrl: 'https://banned.shorly.app',
        title: 'This should be inactive',
        tags: ['banned'],
        isActive: false, // Inactive link from suspended user
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
    // Support user links
    ...supportLinks.flatMap((link, index) => [
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - (index + 2) * 3200_000),
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
        referer: 'https://stackoverflow.com',
        country: 'Australia',
        city: 'Sydney',
        device: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
      },
    ]),
    // Regular user links
    ...regularUserLinks.flatMap((link, index) => [
      {
        linkId: link.id,
        timestamp: new Date(now.getTime() - (index + 3) * 2800_000),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
        referer: 'https://reddit.com',
        country: 'India',
        city: 'Mumbai',
        device: 'desktop',
        browser: 'Firefox',
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

  // Display login credentials
  console.log('\n🔑 Login Credentials for Testing:');
  console.log('=====================================');
  console.log('📧 Email: admin@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: SUPER_ADMIN');
  console.log('');
  console.log('📧 Email: demo@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: SUPER_ADMIN');
  console.log('');
  console.log('📧 Email: marketing@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: ADMIN');
  console.log('');
  console.log('📧 Email: support@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: ADMIN');
  console.log('');
  console.log('📧 Email: supervisor@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: SUPERVISOR (Read-only Admin)');
  console.log('');
  console.log('📧 Email: user1@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: USER (Regular User)');
  console.log('');
  console.log('📧 Email: user2@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: USER (Regular User)');
  console.log('');
  console.log('📧 Email: suspended@shorly.app');
  console.log('🔐 Password: Password123!');
  console.log('👤 Role: USER (Suspended - for testing suspension features)');
  console.log('=====================================');
  console.log('🌐 Admin Dashboard: http://localhost:3000/admin');
  console.log('🏠 User Dashboard: http://localhost:3000/dashboard');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
