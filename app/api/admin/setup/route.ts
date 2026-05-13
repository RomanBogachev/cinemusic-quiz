import { NextRequest, NextResponse } from "next/server";
import { hashAdminPassword, normalizeAdminEmail, validateAdminPassword } from "@/lib/adminPassword";
import { setAdminCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 0) {
    return NextResponse.json({ error: "Первый администратор уже создан" }, { status: 409 });
  }

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

  const user = await prisma.adminUser.create({
    data: {
      email,
      name: payload.name?.trim() || null,
      passwordHash: await hashAdminPassword(password)
    }
  });

  const response = NextResponse.json({ ok: true }, { status: 201 });
  setAdminCookie(response, user);
  return response;
}
