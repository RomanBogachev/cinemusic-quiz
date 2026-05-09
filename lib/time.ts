export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  const wholeSeconds = Math.floor(remaining);
  const milliseconds = Math.round((remaining - wholeSeconds) * 1000);
  return `${minutes.toString().padStart(2, "0")}:${wholeSeconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

export function parseTime(input: string): number | null {
  const value = input.trim().replace(",", ".");
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds;

  const match = value.match(/^(?:(\d+):)?(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);
  if (!match) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const wholeSeconds = Number(match[3]);
  const milliseconds = match[4] ? Number(match[4].padEnd(3, "0")) : 0;
  const result = hours * 3600 + minutes * 60 + wholeSeconds + milliseconds / 1000;
  return Number.isFinite(result) ? result : null;
}
