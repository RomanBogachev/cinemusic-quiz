import { spawn } from "child_process";

export function runProcess(command: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    let output = "";
    let error = "";

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      error += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(error.trim() || `${command} exited with ${code}`));
      }
    });
  });
}

export async function probeDuration(filePath: string) {
  const output = await runProcess("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath
  ]);
  const duration = Number.parseFloat(output);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("ffprobe не смог определить длительность файла");
  }
  return duration;
}

export async function cutAudioSegment(inputPath: string, outputPath: string, start: number, duration: number) {
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
    duration.toFixed(3),
    "-vn",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    outputPath
  ]);
}
