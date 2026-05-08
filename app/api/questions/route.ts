import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId");
  const questions = await prisma.question.findMany({
    where: topicId ? { topicCardId: topicId } : {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const parsed = questionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }
  const question = await prisma.question.create({ data: parsed.data });
  return NextResponse.json(question, { status: 201 });
}
