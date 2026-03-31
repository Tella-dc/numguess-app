import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if super admin already exists
  const existing = await prisma.user.findUnique({
    where: { username: 'Edward' },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Myapp2026$', 12);
    const superAdmin = await prisma.user.create({
      data: {
        username: 'Edward',
        passwordHash,
        role: 'super_admin',
        status: 'offline',
      },
    });
    console.log(`Created super admin: ${superAdmin.username} (id: ${superAdmin.id})`);
  } else {
    console.log(`Super admin "Edward" already exists, skipping.`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
