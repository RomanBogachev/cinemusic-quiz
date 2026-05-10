"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CoverImageCropper } from "@/components/CoverImageCropper";

type MediaUploadFieldProps = {
  kind: "image" | "audio" | "video" | "cover";
  value?: string | null;
  onChange: (path: string) => void;
  onLocalPreviewChange?: (url: string | null) => void;
  onUploadStateChange?: (state: { loading: boolean; error: string | null }) => void;
};

export function MediaUploadField({ kind, value, onChange, onLocalPreviewChange, onUploadStateChange }: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (cropSource) URL.revokeObjectURL(cropSource);
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [cropSource, localPreview]);

  async function upload(file: File) {
    setLoading(true);
    setError(null);
    onUploadStateChange?.({ loading: true, error: null });
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = (await response.json()) as { path?: string; error?: string };
    setLoading(false);
    if (!response.ok || !payload.path) {
      const message = payload.error ?? "Не удалось загрузить файл";
      setError(message);
      onUploadStateChange?.({ loading: false, error: message });
      return;
    }
    onUploadStateChange?.({ loading: false, error: null });
    onChange(payload.path);
  }

  function validateCover(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const lowerName = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) || !allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      return "Формат изображения не поддерживается";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Файл слишком большой";
    }
    return null;
  }

  function handleFile(file: File) {
    if (kind !== "cover") {
      if (kind === "audio") {
        const nextPreview = URL.createObjectURL(file);
        setLocalPreview((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextPreview;
        });
        onLocalPreviewChange?.(nextPreview);
      }
      void upload(file);
      return;
    }
    setError(null);
    const validationError = validateCover(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const nextSource = URL.createObjectURL(file);
    setCropSource((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextSource;
    });
  }

  async function applyCroppedCover(file: File, previewUrl: string) {
    setCropSource((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return previewUrl;
    });
    await upload(file);
  }

  function cancelCrop() {
    setCropSource((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  return (
    <div className="min-w-0">
      {kind === "cover" && (localPreview || value) && (
        <div className="mb-3 overflow-hidden rounded-3xl border border-black/[0.06] bg-black/[0.04] shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={localPreview ?? value ?? ""} alt="" className="aspect-video w-full object-cover" />
        </div>
      )}
      <button
        type="button"
        className="flex w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-black/[0.12] bg-white/70 p-4 text-center transition hover:border-primary/35 hover:bg-white md:p-5"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files.item(0);
          if (file) handleFile(file);
        }}
      >
        {kind === "cover" ? <ImagePlus className="mb-2 text-primary" size={24} /> : <Upload className="mb-2 text-primary" size={24} />}
        <span className="text-sm font-semibold text-foreground">
          {loading ? "Загружаю..." : kind === "cover" && value ? "Изменить обложку или перетащить сюда" : "Загрузить файл или перетащить сюда"}
        </span>
        {value && <span className="mt-1.5 max-w-full break-all text-xs leading-5 text-muted">{value}</span>}
      </button>
      {kind === "cover" && value && (
        <button
          type="button"
          className="btn btn-ghost mt-3 text-danger"
          onClick={() => {
            setLocalPreview((current) => {
              if (current) URL.revokeObjectURL(current);
              return null;
            });
            onChange("");
          }}
        >
          <Trash2 size={17} />
          Удалить обложку
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={kind === "audio" ? ".mp3,.wav,.m4a,.aac,.ogg,.flac,.opus" : kind === "video" ? ".mp4" : kind === "cover" ? ".jpg,.jpeg,.png,.webp" : ".jpg,.jpeg,.png,.webp,.gif"}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) handleFile(file);
          event.currentTarget.value = "";
        }}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {cropSource && <CoverImageCropper imageSrc={cropSource} onCancel={cancelCrop} onApply={(file, previewUrl) => void applyCroppedCover(file, previewUrl)} />}
    </div>
  );
}
