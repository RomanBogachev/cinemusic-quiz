import { randomUUID } from "crypto";
import path from "path";
import { rename, rm, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { probeDuration } from "@/lib/audioProcessing";
import { ensureUploadDir, isAllowedExtension, publicUploadPath, type UploadKind } from "@/lib/files";
import { uploadKindSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;

const allowedMimeTypes: Record<UploadKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  cover: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "audio/x-aac",
    "audio/ogg",
    "audio/flac",
    "audio/x-flac",
    "audio/opus",
    "application/ogg",
    "application/octet-stream"
  ],
  video: ["video/mp4"]
};

export async function POST(request: NextRequest) {
  const authError = requireAdmin();
  if (authError) return authError;

  const formData = await request.formData();
  const kindResult = uploadKindSchema.safeParse(formData.get("kind"));
  const file = formData.get("file");

  if (!kindResult.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Передайте файл и тип загрузки" }, { status: 400 });
  }

  const kind = kindResult.data as UploadKind;
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой. Максимум 500 MB." }, { status: 413 });
  }
  if (!allowedMimeTypes[kind].includes(file.type)) {
    return NextResponse.json({ error: "MIME type файла не поддерживается" }, { status: 400 });
  }
  if (!isAllowedExtension(kind, file.name)) {
    return NextResponse.json({ error: "Недопустимый формат файла" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  const safeName = `${Date.now()}-${randomUUID()}${ext}`;
  const dir = await ensureUploadDir(kind);
  const tempName = `.upload-${randomUUID()}${ext}`;
  const tempPath = path.join(dir, tempName);
  const targetPath = path.join(dir, safeName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(tempPath, bytes);

  try {
    let duration: number | null = null;
    if (kind === "audio") {
      duration = await probeDuration(tempPath);
    }
    await rename(tempPath, targetPath);
    return NextResponse.json({ path: publicUploadPath(kind, safeName), duration });
  } catch (error) {
    await rm(tempPath, { force: true });
    const message = error instanceof Error ? error.message : "Неизвестная ошибка загрузки";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
