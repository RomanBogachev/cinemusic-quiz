import { NextRequest, NextResponse } from "next/server";
import { setAdminCookie, verifyAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const password = contentType.includes("application/json")
    ? ((await request.json()) as { password?: string }).password
    : (await request.formData()).get("password")?.toString();

  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookie(response);
  return response;
}
