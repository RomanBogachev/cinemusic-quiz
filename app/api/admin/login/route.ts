import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { normalizeAdminEmail, normalizeAdminUsername, verifyAdminPassword } from "@/lib/adminPassword";
import { setAdminCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: { username?: string; email?: string; password?: string };
  if (contentType.includes("application/json")) {
    payload = (await request.json()) as { username?: string; email?: string; password?: string };
  } else {
    const formData = await request.formData();
    payload = {
      username: formData.get("username")?.toString() ?? formData.get("email")?.toString(),
      password: formData.get("password")?.toString()
    };
  }
  const username = normalizeAdminUsername(payload.username ?? payload.email ?? "");
  const password = payload.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ error: "Введите имя пользователя и пароль" }, { status: 400 });
  }

  const emailFallback = username.includes("@") ? normalizeAdminEmail(username) : null;
  const loginConditions: Prisma.AdminUserWhereInput[] = [{ username: { equals: username, mode: "insensitive" } }];
  if (emailFallback) {
    loginConditions.push({ email: { equals: emailFallback, mode: "insensitive" } });
  }

  const user = await prisma.adminUser.findFirst({
    where: {
      isActive: true,
      OR: loginConditions
    }
  });
  if (!user || !user.isActive || !(await verifyAdminPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверное имя пользователя или пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response, user);
  return response;
}
