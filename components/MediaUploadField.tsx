"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

type MediaUploadFieldProps = {
  kind: "image" | "audio" | "video" | "cover";
  value?: string | null;
  onChange: (path: string) => void;
};

export function MediaUploadField({ kind, value, onChange }: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { path?: string; error?: string };
    setLoading(false);
    if (!response.ok || !payload.path) {
      setError(payload.error ?? "Не удалось загрузить файл");
      return;
    }
    onChange(payload.path);
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-black/[0.12] bg-white/70 p-7 text-center transition hover:border-primary/35 hover:bg-white"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files.item(0);
          if (file) void upload(file);
        }}
      >
        <Upload className="mb-3 text-primary" size={28} />
        <span className="font-semibold text-foreground">{loading ? "Загружаю..." : "Загрузить файл или перетащить сюда"}</span>
        {value && <span className="mt-2 max-w-full truncate text-sm text-muted">{value}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={kind === "audio" ? ".mp3,.wav,.m4a,.aac,.ogg,.flac,.opus" : kind === "video" ? ".mp4" : ".jpg,.jpeg,.png,.webp,.gif"}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) void upload(file);
        }}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
