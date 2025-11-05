#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignSuperAdmin(email: string) {
  try {
    console.log(`🔑 Assigning SUPER_ADMIN role to user: ${email}`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Find the SUPER_ADMIN role
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (!superAdminRole) {
      console.error('❌ SUPER_ADMIN role not found. Please run seed first.');
      process.exit(1);
    }

    // Update the user with the SUPER_ADMIN role
    await prisma.user.update({
      where: { id: user.id },
      data: { roleId: superAdminRole.id },
    });

    console.log(`✅ Successfully assigned SUPER_ADMIN role to ${email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role ID: ${superAdminRole.id}`);
  } catch (error) {
    console.error('❌ Error assigning role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: pnpm admin:create-super-admin <email>');
  process.exit(1);
}

// Validate email format (simple validation)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

assignSuperAdmin(email);
