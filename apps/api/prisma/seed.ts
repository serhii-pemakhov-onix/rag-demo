import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  options: '-c timezone=UTC',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  console.log('Seeded admin user:', admin.email);

  const defaultAgent = await prisma.agent.upsert({
    where: { slug: 'general-assistant' },
    update: {},
    create: {
      name: 'General Assistant',
      slug: 'general-assistant',
      description: 'A general-purpose AI assistant that can help with various tasks.',
      systemPrompt:
        'You are a helpful AI assistant. Use the provided context to answer questions accurately and concisely.',
      isActive: true,
    },
  });

  console.log('Seeded agent:', defaultAgent.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
