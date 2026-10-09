import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_COST = Number(process.env.BCRYPT_COST ?? 12);

/**
 * Runs on every deploy (after migrations). Safe to run repeatedly: only
 * creates an admin user when the users table is empty, so a fresh database
 * always has a way to log in without re-running the full dev seed (which is
 * blocked in production, see prisma/seed.ts).
 */
async function main() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log(`ensure-admin: ${userCount} user(s) already exist, skipping.`);
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email,
      passwordHash,
      role: "admin",
    },
  });

  console.log(`ensure-admin: created default admin user ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
