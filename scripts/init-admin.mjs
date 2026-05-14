import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function normalizeEmail(email) {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUsername(username) {
  return username.trim();
}

function usernameFromEnv({ username, name, email }) {
  const explicitUsername = normalizeUsername(username ?? "");
  if (explicitUsername) return explicitUsername;

  const displayName = normalizeUsername(name ?? "");
  if (displayName) return displayName;

  if (email) return email.split("@")[0];
  return "";
}

function validateUsername(username) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(username);
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
  const username = usernameFromEnv({
    username: process.env.ADMIN_USERNAME,
    name: process.env.ADMIN_NAME,
    email
  });

  if (!username || !password) {
    console.log("Admin init skipped: ADMIN_USERNAME or ADMIN_PASSWORD is not set.");
    return;
  }

  if (!validateUsername(username)) {
    throw new Error("ADMIN_USERNAME must be 3-32 characters and contain only latin letters, digits, dot, dash or underscore.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  await prisma.adminUser.create({
    data: {
      username,
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });

  console.log(`Admin user created: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
