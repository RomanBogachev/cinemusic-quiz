import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMediaTypeFromQuizType } from "@/lib/mediaTypes";
import { prisma } from "@/lib/prisma";
import { questionUpdateSchema } from "@/lib/validation";
import { removePublicUpload } from "@/lib/files";
import { trimVideoSegment } from "@/lib/videoProcessing";

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

  let data = parsed.data;
  let trimmedVideo: Awaited<ReturnType<typeof trimVideoSegment>> | null = null;
  const nextMediaType = data.mediaType ?? existingQuestion.mediaType;
  const nextMediaFilePath = data.mediaFilePath ?? existingQuestion.mediaFilePath;
  const nextVideoStart = data.videoStart ?? existingQuestion.videoStart ?? 0;
  const nextVideoEnd = data.videoEnd ?? existingQuestion.videoEnd ?? 0;
  const videoRangeChanged =
    nextVideoStart !== (existingQuestion.videoStart ?? 0) ||
    nextVideoEnd !== (existingQuestion.videoEnd ?? 0);
  const videoFileChanged = nextMediaFilePath !== existingQuestion.mediaFilePath;
  const shouldTrimVideo = nextMediaType === "video" && (videoFileChanged || videoRangeChanged);

  try {
    if (shouldTrimVideo) {
      trimmedVideo = await trimVideoSegment({
        mediaFilePath: nextMediaFilePath,
        start: nextVideoStart,
        end: nextVideoEnd
      });
      data = {
        ...data,
        mediaFilePath: trimmedVideo.outputPublicPath,
        videoStart: 0,
        videoEnd: trimmedVideo.duration
      };
    }

    const question = await prisma.question.update({ where: { id: params.id }, data });
    if (trimmedVideo) {
      await removePublicUpload(trimmedVideo.inputPublicPath);
      if (existingQuestion.mediaFilePath !== trimmedVideo.inputPublicPath) {
        await removePublicUpload(existingQuestion.mediaFilePath);
      }
    }
    return NextResponse.json(question);
  } catch (error) {
    if (trimmedVideo) {
      await removePublicUpload(trimmedVideo.outputPublicPath);
    }
    const message = error instanceof Error ? error.message : "Не удалось сохранить вопрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const authError = requireAdmin();
  if (authError) return authError;
  const question = await prisma.question.delete({ where: { id: params.id } });
  if (question.mediaType === "video") {
    await removePublicUpload(question.mediaFilePath);
  }
  return NextResponse.json({ ok: true });
}
