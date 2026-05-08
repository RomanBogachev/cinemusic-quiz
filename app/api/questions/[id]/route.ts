import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMediaTypeFromQuizType } from "@/lib/mediaTypes";
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

  const body = (await request.json()) as { topicCardId?: string; mediaType?: string };
  const existingQuestion = await prisma.question.findUnique({
    where: { id: params.id },
    include: { topicCard: { include: { quizType: true } } }
  });
  if (!existingQuestion) {
    return NextResponse.json({ error: "Вопрос не найден" }, { status: 404 });
  }

  const nextTopic = body.topicCardId && body.topicCardId !== existingQuestion.topicCardId
    ? await prisma.topicCard.findUnique({ where: { id: body.topicCardId }, include: { quizType: true } })
    : existingQuestion.topicCard;
  if (!nextTopic) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 400 });
  }

  const existingExpectedMediaType = getMediaTypeFromQuizType(existingQuestion.topicCard.quizType.type);
  const nextExpectedMediaType = getMediaTypeFromQuizType(nextTopic.quizType.type);
  const keepsLegacyMismatch =
    existingQuestion.mediaType !== existingExpectedMediaType &&
    nextTopic.id === existingQuestion.topicCardId &&
    (!body.mediaType || body.mediaType === existingQuestion.mediaType);

  const parsed = questionUpdateSchema.safeParse({
    ...body,
    mediaType: keepsLegacyMismatch ? existingQuestion.mediaType : nextExpectedMediaType
  });
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
