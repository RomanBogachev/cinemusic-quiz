import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"), 303);
  clearAdminCookie(response);
  return response;
}
