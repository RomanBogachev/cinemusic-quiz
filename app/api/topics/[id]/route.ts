import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const topic = await prisma.topicCard.findUnique({
    where: { id: params.id },
    include: {
      quizType: true,
      questions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });
  if (!topic) {
    return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
  }
  return NextResponse.json(topic);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const parsed = topicSchema.partial().safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }

  const topic = await prisma.topicCard.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(topic);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;
  await prisma.topicCard.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
