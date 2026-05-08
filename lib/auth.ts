import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "quiz_admin_session";

function sessionToken(password: string) {
  return createHash("sha256").update(`quiz-admin:${password}`).digest("hex");
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "change-me";
  const left = Buffer.from(password);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function isAdminAuthenticated() {
  const expected = sessionToken(process.env.ADMIN_PASSWORD ?? "change-me");
  return cookies().get(COOKIE_NAME)?.value === expected;
}

export function setAdminCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, sessionToken(process.env.ADMIN_PASSWORD ?? "change-me"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function requireAdmin() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Требуется вход в админку" }, { status: 401 });
  }
  return null;
}
