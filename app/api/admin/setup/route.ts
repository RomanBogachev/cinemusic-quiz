import { NextRequest, NextResponse } from "next/server";
import { hashAdminPassword, normalizeAdminEmail, normalizeAdminUsername, validateAdminPassword, validateAdminUsername, validateOptionalAdminEmail } from "@/lib/adminPassword";
import { setAdminCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 0) {
    return NextResponse.json({ error: "Первый администратор уже создан" }, { status: 409 });
  }

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

  const user = await prisma.adminUser.create({
    data: {
      username,
      email,
      name: payload.name?.trim() || null,
      passwordHash: await hashAdminPassword(password)
    }
  });

  const response = NextResponse.json({ ok: true }, { status: 201 });
  setAdminCookie(response, user);
  return response;
}
