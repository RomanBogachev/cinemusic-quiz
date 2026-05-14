import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { hashAdminPassword, normalizeAdminEmail, normalizeAdminUsername, validateAdminPassword, validateAdminUsername, validateOptionalAdminEmail } from "@/lib/adminPassword";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = requireAdmin();
  if (authError) return authError;

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ users, currentUserId: getAdminSession()?.userId ?? null });
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const payload = (await request.json()) as { username?: string; email?: string; name?: string; password?: string; passwordConfirm?: string };
  const username = normalizeAdminUsername(payload.username ?? "");
  const email = normalizeAdminEmail(payload.email ?? "");
  const password = payload.password ?? "";
  const usernameError = validateAdminUsername(username);
  const emailError = validateOptionalAdminEmail(email);
  const passwordError = validateAdminPassword(password);

  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  if (typeof payload.passwordConfirm === "string" && payload.passwordConfirm !== password) {
    return NextResponse.json({ error: "Пароли не совпадают" }, { status: 400 });
  }

  const existingConditions: Prisma.AdminUserWhereInput[] = [{ username: { equals: username, mode: "insensitive" } }];
  if (email) {
    existingConditions.push({ email: { equals: email, mode: "insensitive" } });
  }

  const existingUser = await prisma.adminUser.findFirst({
    where: {
      OR: existingConditions
    },
    select: { id: true }
  });

  if (existingUser) {
    return NextResponse.json({ error: "Пользователь с таким username или email уже существует" }, { status: 409 });
  }

  try {
    const user = await prisma.adminUser.create({
      data: {
        username,
        email,
        name: payload.name?.trim() || null,
        passwordHash: await hashAdminPassword(password)
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Пользователь с таким username или email уже существует" }, { status: 409 });
  }
}
