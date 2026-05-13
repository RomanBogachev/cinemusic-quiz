import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function main() {
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 0) {
    console.log("Admin init skipped: administrator already exists.");
    return;
  }

  const email = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "").trim() || null;

  if (!email || !password) {
    console.log("Admin init skipped: ADMIN_EMAIL or ADMIN_PASSWORD is not set.");
    return;
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
