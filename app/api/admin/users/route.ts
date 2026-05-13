import { NextRequest, NextResponse } from "next/server";
import { hashAdminPassword, normalizeAdminEmail, validateAdminPassword } from "@/lib/adminPassword";
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

  const payload = (await request.json()) as { email?: string; name?: string; password?: string };
  const email = normalizeAdminEmail(payload.email ?? "");
  const password = payload.password ?? "";
  const passwordError = validateAdminPassword(password);

  if (!email) {
    return NextResponse.json({ error: "Введите email" }, { status: 400 });
  }
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const user = await prisma.adminUser.create({
      data: {
        email,
        name: payload.name?.trim() || null,
        passwordHash: await hashAdminPassword(password)
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }
}
