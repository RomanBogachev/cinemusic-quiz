"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImage } from "@/lib/getCroppedImage";

type CoverImageCropperProps = {
  imageSrc: string;
  aspect?: number;
  outputWidth?: number;
  outputHeight?: number;
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
};

export function CoverImageCropper({ imageSrc, aspect = 16 / 9, outputWidth = 1280, outputHeight = 720, onCancel, onApply }: CoverImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [imageSrc]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (!croppedAreaPixels) return;
    let active = true;
    let nextPreviewUrl: string | null = null;
    const timer = window.setTimeout(() => {
      void getCroppedImage(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
        .then((blob) => {
          if (!active) return;
          nextPreviewUrl = URL.createObjectURL(blob);
          setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return nextPreviewUrl;
          });
        })
        .catch(() => {
          if (active) setError("Не удалось обновить предпросмотр");
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
      if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [croppedAreaPixels, imageSrc, outputHeight, outputWidth]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function applyCrop() {
    if (!croppedAreaPixels) {
      setError("Выберите изображение");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const blob = await getCroppedImage(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      const file = new File([blob], `cover-${Date.now()}.jpg`, { type: "image/jpeg" });
      const finalPreviewUrl = URL.createObjectURL(blob);
      onApply(file, finalPreviewUrl);
    } catch {
      setError("Не удалось обработать изображение");
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/28 p-4 backdrop-blur-md">
      <div className="mx-auto my-6 max-w-5xl rounded-[28px] border border-black/[0.06] bg-white/94 p-5 shadow-floating">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground">Настроить обложку</h2>
            <p className="mt-1 text-sm text-muted">Перетащите изображение и выберите область, которая будет отображаться на карточке темы.</p>
          </div>
          <button type="button" className="btn btn-ghost px-3" aria-label="Закрыть редактор обложки" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="cover-cropper relative h-[56vw] max-h-[520px] min-h-[280px] overflow-hidden rounded-3xl bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                minZoom={1}
                maxZoom={3}
                objectFit="cover"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-muted" htmlFor="cover-zoom">
                Масштаб
              </label>
              <div className="flex items-center gap-3">
                <button type="button" className="btn btn-ghost px-3" aria-label="Уменьшить масштаб" onClick={() => setZoom((value) => Math.max(1, value - 0.1))}>
                  <Minus size={18} />
                </button>
                <input
                  id="cover-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="h-2 min-w-0 flex-1 accent-primary"
                />
                <button type="button" className="btn btn-ghost px-3" aria-label="Увеличить масштаб" onClick={() => setZoom((value) => Math.min(3, value + 0.1))}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <aside>
            <div className="text-sm font-semibold text-muted">Так будет выглядеть обложка</div>
            <div className="mt-3 aspect-video overflow-hidden rounded-3xl border border-black/[0.06] bg-black/[0.04] shadow-soft">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Предпросмотр</div>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">Итоговый файл сохраняется в формате JPEG 1280x720.</p>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </aside>
        </div>

        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="btn btn-ghost" onClick={reset}>
            <RotateCcw size={18} />
            Сбросить
          </button>
          <button type="button" className="btn btn-primary" disabled={processing} onClick={() => void applyCrop()}>
            {processing ? "Обрабатываю..." : "Применить"}
          </button>
        </div>
      </div>
    </div>
  );
}
