import path from "path";
import { mkdir } from "fs/promises";

export type UploadKind = "image" | "audio" | "video" | "cover";

const uploadFolders: Record<UploadKind, string> = {
  image: "images",
  audio: "audio",
  video: "video",
  cover: "covers"
};

const extensions: Record<UploadKind, string[]> = {
  image: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  cover: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  audio: [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".opus"],
  video: [".mp4"]
};

export function uploadRoot() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export function isAllowedExtension(kind: UploadKind, fileName: string) {
  return extensions[kind].includes(path.extname(fileName).toLowerCase());
}

export async function ensureUploadDir(kind: UploadKind) {
  const dir = path.join(uploadRoot(), uploadFolders[kind]);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function publicUploadPath(kind: UploadKind, fileName: string) {
  return `/uploads/${uploadFolders[kind]}/${fileName}`;
}

export function resolveUploadPublicPath(publicPath: string[]) {
  const safeParts = publicPath.filter((part) => part && !part.includes("..") && !path.isAbsolute(part));
  return path.join(uploadRoot(), ...safeParts);
}

export function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".opus") return "audio/opus";
  if (ext === ".mp4") return "video/mp4";
  return "application/octet-stream";
}
