import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { questionUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const question = await prisma.question.findUnique({ where: { id: params.id }, include: { topicCard: true } });
  if (!question) {
    return NextResponse.json({ error: "Вопрос не найден" }, { status: 404 });
  }
  return NextResponse.json(question);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;

  const parsed = questionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }

  const question = await prisma.question.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(question);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;
  await prisma.question.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
