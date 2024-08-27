import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Password to be hashed
  const password = '12345678';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create 10 users
  for (let i = 1; i <= 10; i++) {
    await prisma.user.create({
      data: {
        email: `rajesh+${i}@algorisys.com`,
        password: hashedPassword,
      },
    });
  }

  console.log('Seed data created: 10 users');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
