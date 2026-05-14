import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "quiz_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

type AdminSessionPayload = {
  userId: string;
  username?: string;
  email?: string;
  exp: number;
};

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "local-dev-admin-session-secret-change-me";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseSessionToken(token?: string): AdminSessionPayload | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as AdminSessionPayload;
    if (!parsed.userId || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getAdminSession() {
  return parseSessionToken(cookies().get(COOKIE_NAME)?.value);
}

export async function getCurrentAdminUser() {
  const session = getAdminSession();
  if (!session) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      isActive: true
    }
  });

  return user?.isActive ? user : null;
}

export function isAdminAuthenticated() {
  return Boolean(getAdminSession());
}

export function setAdminCookie(response: NextResponse, user: { id: string; username: string }) {
  const payload = encodeBase64Url(
    JSON.stringify({
      userId: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
    } satisfies AdminSessionPayload)
  );

  response.cookies.set(COOKIE_NAME, `${payload}.${signPayload(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE
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
