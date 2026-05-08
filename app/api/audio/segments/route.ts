import path from "path";
import { randomUUID } from "crypto";
import { rm } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { cutAudioSegment, probeDuration } from "@/lib/audioProcessing";
import { prisma } from "@/lib/prisma";
import { resolveUploadPublicPath } from "@/lib/files";

export const dynamic = "force-dynamic";

const segmentSchema = z
  .object({
    questionId: z.string().min(1),
    startTime: z.coerce.number().min(0),
    endTime: z.coerce.number().min(0.1)
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Конец должен быть больше начала" });
    }
    if (value.endTime - value.startTime < 0.1) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Минимальная длительность фрагмента 0.1 сек" });
    }
    if (Math.abs(value.endTime - value.startTime - 1) > 0.01) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "Базовый выбранный фрагмент должен быть ровно 1 секунда" });
    }
  });

const durations = [
  ["audioOnePath", 1],
  ["audioThreePath", 3],
  ["audioFivePath", 5],
  ["audioTenPath", 10]
] as const;

function publicAudioPath(fileName: string) {
  return `/uploads/audio/${fileName}`;
}

async function removeOld(paths: Array<string | null>) {
  await Promise.all(
    paths
      .filter((item): item is string => Boolean(item?.startsWith("/uploads/audio/")))
      .map((item) => rm(resolveUploadPublicPath(item.replace(/^\/uploads\//, "").split("/")), { force: true }))
  );
}

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const parsed = segmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({ where: { id: parsed.data.questionId } });
  if (!question || question.mediaType !== "audio") {
    return NextResponse.json({ error: "Аудиовопрос не найден" }, { status: 404 });
  }
  if (!question.mediaFilePath.startsWith("/uploads/audio/")) {
    return NextResponse.json({ error: "Исходный аудиофайл должен быть из локальных uploads" }, { status: 400 });
  }

  const sourcePath = resolveUploadPublicPath(question.mediaFilePath.replace(/^\/uploads\//, "").split("/"));
  const sourceDuration = await probeDuration(sourcePath);
  const { startTime, endTime } = parsed.data;

  if (endTime > sourceDuration) {
    return NextResponse.json({ error: "Конец фрагмента выходит за длительность файла" }, { status: 400 });
  }
  if (startTime + 10 > sourceDuration) {
    return NextResponse.json({ error: "От выбранного начала до конца файла меньше 10 секунд" }, { status: 400 });
  }

  await removeOld([question.audioOnePath, question.audioThreePath, question.audioFivePath, question.audioTenPath]);

  const baseName = `segment-${question.id}-${Date.now()}-${randomUUID()}`;
  const updates: Record<string, string | number> = {
    audioStart: startTime,
    audioEnd: endTime
  };

  for (const [field, duration] of durations) {
    const fileName = `${baseName}-${duration}s.mp3`;
    const outputPath = path.join(path.dirname(sourcePath), fileName);
    await cutAudioSegment(sourcePath, outputPath, startTime, duration);
    updates[field] = publicAudioPath(fileName);
  }

  const updated = await prisma.question.update({
    where: { id: question.id },
    data: updates
  });

  return NextResponse.json({
    ok: true,
    duration: sourceDuration,
    question: updated,
    segments: {
      1: updated.audioOnePath,
      3: updated.audioThreePath,
      5: updated.audioFivePath,
      10: updated.audioTenPath
    }
  });
}
