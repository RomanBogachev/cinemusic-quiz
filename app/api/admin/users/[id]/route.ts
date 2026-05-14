import { NextRequest, NextResponse } from "next/server";
import { hashAdminPassword, validateAdminPassword } from "@/lib/adminPassword";
import { getAdminSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const payload = (await request.json()) as { name?: string; password?: string; isActive?: boolean };
  const data: { name?: string | null; passwordHash?: string; isActive?: boolean } = {};

  if (typeof payload.name === "string") {
    data.name = payload.name.trim() || null;
  }

  if (typeof payload.password === "string" && payload.password.length > 0) {
    const passwordError = validateAdminPassword(payload.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    data.passwordHash = await hashAdminPassword(payload.password);
  }

  if (typeof payload.isActive === "boolean") {
    const activeUsers = await prisma.adminUser.count({ where: { isActive: true } });
    const currentUserId = getAdminSession()?.userId;
    if (!payload.isActive && params.id === currentUserId) {
      return NextResponse.json({ error: "Нельзя отключить текущего пользователя" }, { status: 400 });
    }
    if (!payload.isActive && activeUsers <= 1) {
      return NextResponse.json({ error: "Должен остаться хотя бы один активный администратор" }, { status: 400 });
    }
    data.isActive = payload.isActive;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет изменений" }, { status: 400 });
  }

  const user = await prisma.adminUser.update({
    where: { id: params.id },
    data,
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

  return NextResponse.json({ user });
}
