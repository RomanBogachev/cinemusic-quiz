import { randomUUID } from "crypto";
import path from "path";
import { stat } from "fs/promises";
import { runProcess, probeDuration } from "@/lib/audioProcessing";
import { ensureNestedUploadDir, localPathFromPublicUpload, publicNestedUploadPath, removePublicUpload } from "@/lib/files";

type TrimVideoInput = {
  mediaFilePath: string;
  start: number;
  end: number;
};

export type TrimmedVideoResult = {
  inputPublicPath: string;
  outputPublicPath: string;
  duration: number;
};

const MIN_VIDEO_SEGMENT_DURATION = 0.5;

function validateTrimRange(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Некорректный диапазон видео");
  }
  if (start < 0) {
    throw new Error("Начало видео не может быть меньше 0");
  }
  if (end <= start) {
    throw new Error("Конец видео должен быть больше начала");
  }
  if (end - start < MIN_VIDEO_SEGMENT_DURATION) {
    throw new Error("Фрагмент видео должен длиться не меньше 0.5 сек");
  }
}

export async function trimVideoSegment({ mediaFilePath, start, end }: TrimVideoInput): Promise<TrimmedVideoResult> {
  validateTrimRange(start, end);
  if (!mediaFilePath.toLowerCase().endsWith(".mp4")) {
    throw new Error("Видео должно быть в формате mp4");
  }

  const inputPath = localPathFromPublicUpload(mediaFilePath);
  const inputDuration = await probeDuration(inputPath);
  if (end > inputDuration + 0.05) {
    throw new Error("Конец фрагмента выходит за пределы видео");
  }

  const segmentDuration = end - start;
  const outputFileName = `${Date.now()}-${randomUUID()}.mp4`;
  const outputDir = await ensureNestedUploadDir("video", "trimmed");
  const outputPath = path.join(outputDir, outputFileName);
  const outputPublicPath = publicNestedUploadPath("video", "trimmed", outputFileName);

  try {
    await runProcess("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      start.toFixed(3),
      "-i",
      inputPath,
      "-t",
      segmentDuration.toFixed(3),
      "-map",
      "0:v:0?",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      outputPath
    ]);

    const outputStat = await stat(outputPath);
    if (outputStat.size <= 0) {
      throw new Error("FFmpeg создал пустой видеофайл");
    }

    const outputDuration = await probeDuration(outputPath);
    return {
      inputPublicPath: mediaFilePath,
      outputPublicPath,
      duration: Number(outputDuration.toFixed(3))
    };
  } catch (error) {
    await removePublicUpload(outputPublicPath);
    throw error;
  }
}
