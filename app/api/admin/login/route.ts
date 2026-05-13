import { NextRequest, NextResponse } from "next/server";
import { normalizeAdminEmail, verifyAdminPassword } from "@/lib/adminPassword";
import { setAdminCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: { email?: string; password?: string };
  if (contentType.includes("application/json")) {
    payload = (await request.json()) as { email?: string; password?: string };
  } else {
    const formData = await request.formData();
    payload = {
      email: formData.get("email")?.toString(),
      password: formData.get("password")?.toString()
    };
  }
  const email = normalizeAdminEmail(payload.email ?? "");
  const password = payload.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verifyAdminPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response, user);
  return response;
}
