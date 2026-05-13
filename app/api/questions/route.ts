import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMediaTypeFromQuizType } from "@/lib/mediaTypes";
import { prisma } from "@/lib/prisma";
import { questionSchema } from "@/lib/validation";
import { removePublicUpload } from "@/lib/files";
import { trimVideoSegment } from "@/lib/videoProcessing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const topicId = request.nextUrl.searchParams.get("topicId");
  const pageParam = request.nextUrl.searchParams.get("page");
  const limitParam = request.nextUrl.searchParams.get("limit");

  if (pageParam || limitParam) {
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(limitParam ?? "10", 10) || 10));
    const where = topicId ? { topicCardId: topicId } : {};
    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { topicCard: { include: { quizType: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.question.count({ where })
    ]);
    return NextResponse.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  }

  const questions = await prisma.question.findMany({
    where: topicId ? { topicCardId: topicId } : {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const body = (await request.json()) as { topicCardId?: string };
  const topic = body.topicCardId
    ? await prisma.topicCard.findUnique({ where: { id: body.topicCardId }, include: { quizType: true } })
    : null;
  if (!topic) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 400 });
  }

  const parsed = questionSchema.safeParse({
    ...body,
    mediaType: getMediaTypeFromQuizType(topic.quizType.type)
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }
  let data = parsed.data;
  let trimmedVideo: Awaited<ReturnType<typeof trimVideoSegment>> | null = null;

  try {
    if (data.mediaType === "video") {
      trimmedVideo = await trimVideoSegment({
        mediaFilePath: data.mediaFilePath,
        start: data.videoStart ?? 0,
        end: data.videoEnd ?? 0
      });
      data = {
        ...data,
        mediaFilePath: trimmedVideo.outputPublicPath,
        videoStart: 0,
        videoEnd: trimmedVideo.duration
      };
    }

    const question = await prisma.question.create({ data });
    if (trimmedVideo) {
      await removePublicUpload(trimmedVideo.inputPublicPath);
    }
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    if (trimmedVideo) {
      await removePublicUpload(trimmedVideo.outputPublicPath);
    }
    const message = error instanceof Error ? error.message : "Не удалось сохранить вопрос";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
