import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const where = type ? { quizType: { type } } : {};
  const topics = await prisma.topicCard.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      quizType: true,
      _count: { select: { questions: true } }
    }
  });
  return NextResponse.json(topics);
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const parsed = topicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }

  const topic = await prisma.topicCard.create({ data: parsed.data });
  return NextResponse.json(topic, { status: 201 });
}
