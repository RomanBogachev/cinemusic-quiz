"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clamp, formatTime, parseTime } from "@/lib/time";

type VideoRange = {
  start: number;
  end: number;
};

type DragMode = "start" | "end" | "range" | "playhead";

type VideoTrimmerProps = {
  src: string;
  initialStart?: number | null;
  initialEnd?: number | null;
  defaultSelectionDuration?: number;
  minSelectionDuration?: number;
  onChange: (range: VideoRange) => void;
  onDurationChange?: (duration: number) => void;
  onReadyChange?: (ready: boolean) => void;
};

type DragState = {
  mode: DragMode;
  pointerStart: number;
  rangeStart: number;
  rangeEnd: number;
};

type VideoThumbnail = {
  time: number;
  url: string;
};

const DEFAULT_THUMBNAIL_COUNT = 12;
const MIN_THUMBNAIL_COUNT = 8;
const MAX_THUMBNAIL_COUNT = 18;

function secondsToPercent(seconds: number, duration: number) {
  if (!duration) return 0;
  return clamp((seconds / duration) * 100, 0, 100);
}

function waitForEvent(element: HTMLVideoElement, eventName: "loadedmetadata" | "seeked", signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Video loading cancelled", "AbortError"));
      return;
    }

    const cleanup = () => {
      element.removeEventListener(eventName, onSuccess);
      element.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video event failed"));
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Video loading cancelled", "AbortError"));
    };
    element.addEventListener(eventName, onSuccess, { once: true });
    element.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForThumbnailSeek(video: HTMLVideoElement, seconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Thumbnail generation cancelled", "AbortError"));
      return;
    }

    const target = Math.max(0, seconds);
    if (Math.abs(video.currentTime - target) < 0.015 && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Could not seek video thumbnail"));
    };
    const onSeeked = () => {
      requestAnimationFrame(done);
    };
    const onError = () => fail();
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException("Thumbnail generation cancelled", "AbortError"));
    };
    const timeout = window.setTimeout(fail, 2000);

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    signal?.addEventListener("abort", onAbort, { once: true });
    video.currentTime = target;
  });
}

function waitForSeek(video: HTMLVideoElement, seconds: number) {
  return new Promise<void>((resolve) => {
    const target = Math.max(0, seconds);
    if (Math.abs(video.currentTime - target) < 0.03 && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }, 800);
    const onSeeked = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = target;
  });
}

function drawVideoCover(context: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const videoWidth = video.videoWidth || width;
  const videoHeight = video.videoHeight || height;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
}

function getThumbnailCount(duration: number) {
  if (duration < 12) return MIN_THUMBNAIL_COUNT;
  if (duration > 180) return MAX_THUMBNAIL_COUNT;
  return DEFAULT_THUMBNAIL_COUNT;
}

function getThumbnailTime(index: number, count: number, duration: number) {
  const safeEnd = Math.max(0, duration - 0.05);
  if (count <= 1) return Math.min(0.1, safeEnd);
  const first = Math.min(0.1, safeEnd);
  const last = Math.max(first, safeEnd);
  return first + ((last - first) * index) / (count - 1);
}

async function generateThumbnails(src: string, duration: number, signal?: AbortSignal) {
  const video = document.createElement("video");
  try {
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = src;
    video.load();

    if (video.readyState < 1) await waitForEvent(video, "loadedmetadata", signal);

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d");
    if (!context) return [];

    const count = getThumbnailCount(duration);
    const frames: VideoThumbnail[] = [];
    for (let index = 0; index < count; index += 1) {
      if (signal?.aborted) throw new DOMException("Thumbnail generation cancelled", "AbortError");
      const time = getThumbnailTime(index, count, duration);
      await waitForThumbnailSeek(video, time, signal);
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawVideoCover(context, video, canvas.width, canvas.height);
      frames.push({ time, url: canvas.toDataURL("image/jpeg", 0.78) });
    }
    return frames;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

export function VideoTrimmer({
  src,
  initialStart = 0,
  initialEnd,
  defaultSelectionDuration = 10,
  minSelectionDuration = 0.5,
  onChange,
  onDurationChange,
  onReadyChange
}: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewSelectionRef = useRef(false);
  const rangeRef = useRef<VideoRange>({ start: initialStart ?? 0, end: initialEnd ?? defaultSelectionDuration });

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(initialStart ?? 0);
  const [end, setEnd] = useState(initialEnd ?? defaultSelectionDuration);
  const [currentTime, setCurrentTime] = useState(initialStart ?? 0);
  const [startInput, setStartInput] = useState(formatTime(initialStart ?? 0));
  const [endInput, setEndInput] = useState(formatTime(initialEnd ?? defaultSelectionDuration));
  const [thumbnails, setThumbnails] = useState<VideoThumbnail[]>([]);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectionDuration = Math.max(0, end - start);
  const leftPercent = secondsToPercent(start, duration);
  const widthPercent = secondsToPercent(selectionDuration, duration);
  const rightPercent = secondsToPercent(end, duration);
  const playheadPercent = secondsToPercent(currentTime, duration);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const syncInputs = useCallback((nextStart: number, nextEnd: number) => {
    setStartInput(formatTime(nextStart));
    setEndInput(formatTime(nextEnd));
  }, []);

  const emitRange = useCallback((nextStart: number, nextEnd: number) => {
    const roundedStart = Number(nextStart.toFixed(3));
    const roundedEnd = Number(nextEnd.toFixed(3));
    rangeRef.current = { start: roundedStart, end: roundedEnd };
    setStart(roundedStart);
    setEnd(roundedEnd);
    syncInputs(roundedStart, roundedEnd);
    onChange({ start: roundedStart, end: roundedEnd });
  }, [onChange, syncInputs]);

  const normalizeRange = useCallback((nextStart: number, nextEnd: number) => {
    if (!duration) return null;
    let normalizedStart = clamp(nextStart, 0, Math.max(0, duration - minSelectionDuration));
    let normalizedEnd = clamp(nextEnd, normalizedStart + minSelectionDuration, duration);

    if (normalizedEnd - normalizedStart < minSelectionDuration) {
      normalizedEnd = clamp(normalizedStart + minSelectionDuration, minSelectionDuration, duration);
      normalizedStart = clamp(normalizedEnd - minSelectionDuration, 0, Math.max(0, duration - minSelectionDuration));
    }

    return { start: normalizedStart, end: normalizedEnd };
  }, [duration, minSelectionDuration]);

  const setRange = useCallback((nextStart: number, nextEnd: number) => {
    const normalized = normalizeRange(nextStart, nextEnd);
    if (!normalized) return;
    setError(null);
    emitRange(normalized.start, normalized.end);
    return normalized;
  }, [emitRange, normalizeRange]);

  const secondsFromClientX = useCallback((clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration);
  }, [duration]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) video.pause();
    previewSelectionRef.current = false;
    setIsPlaying(false);
    stopRaf();
  }, [stopRaf]);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    const nextTime = clamp(seconds, 0, duration || 0);
    if (video) video.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const seekPreview = useCallback((seconds: number) => {
    const video = videoRef.current;
    const nextTime = clamp(seconds, 0, Math.max(0, (duration || 0) - 0.05));
    if (video) {
      video.pause();
      video.currentTime = nextTime;
    }
    previewSelectionRef.current = false;
    setIsPlaying(false);
    setCurrentTime(nextTime);
    stopRaf();
  }, [duration, stopRaf]);

  const resetRange = useCallback(() => {
    if (!duration) return;
    const savedStart = initialStart ?? 0;
    const fallbackEnd = Math.min(duration, defaultSelectionDuration);
    const savedEnd = initialEnd && initialEnd > savedStart ? initialEnd : fallbackEnd;
    const normalized = setRange(savedStart, savedEnd);
    if (normalized) seekPreview(normalized.start);
  }, [defaultSelectionDuration, duration, initialEnd, initialStart, seekPreview, setRange]);

  const selectFirstSeconds = useCallback(() => {
    if (!duration) return;
    const normalized = setRange(0, Math.min(duration, defaultSelectionDuration));
    if (normalized) seekPreview(normalized.start);
  }, [defaultSelectionDuration, duration, seekPreview, setRange]);

  const selectWholeVideo = useCallback(() => {
    if (!duration) return;
    const normalized = setRange(0, duration);
    if (normalized) seekPreview(normalized.start);
  }, [duration, seekPreview, setRange]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = video.currentTime;
    const currentEnd = rangeRef.current.end;
    setCurrentTime(nextTime);

    if (nextTime >= currentEnd) {
      video.pause();
      video.currentTime = currentEnd;
      setCurrentTime(currentEnd);
      previewSelectionRef.current = false;
      setIsPlaying(false);
      stopRaf();
      return;
    }

    if (video.paused || video.ended) {
      previewSelectionRef.current = false;
      setIsPlaying(false);
      stopRaf();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const playSelection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const currentStart = start;
    const currentEnd = end;
    rangeRef.current = { start: currentStart, end: currentEnd };
    stopRaf();
    previewSelectionRef.current = true;
    video.pause();
    await waitForSeek(video, currentStart);
    video.currentTime = currentStart;
    setCurrentTime(currentStart);

    try {
      await video.play();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
      intervalRef.current = window.setInterval(tick, 80);
    } catch {
      previewSelectionRef.current = false;
      setIsPlaying(false);
      setError("Браузер не смог запустить воспроизведение. Попробуйте нажать Play ещё раз.");
    }
  }, [duration, end, start, stopRaf, tick]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    if (isPlaying) {
      pause();
      return;
    }

    const currentStart = start;
    const currentEnd = end;
    rangeRef.current = { start: currentStart, end: currentEnd };
    if (video.currentTime < currentStart || video.currentTime >= currentEnd) {
      await waitForSeek(video, currentStart);
      video.currentTime = currentStart;
      setCurrentTime(currentStart);
    }
    previewSelectionRef.current = true;
    try {
      await video.play();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
      intervalRef.current = window.setInterval(tick, 80);
    } catch {
      previewSelectionRef.current = false;
      setIsPlaying(false);
      setError("Браузер не смог запустить воспроизведение.");
    }
  }, [duration, end, isPlaying, pause, start, tick]);

  const stop = useCallback(() => {
    const video = videoRef.current;
    const currentStart = start;
    rangeRef.current = { start, end };
    if (video) {
      video.pause();
      video.currentTime = currentStart;
    }
    setCurrentTime(currentStart);
    previewSelectionRef.current = false;
    setIsPlaying(false);
    stopRaf();
  }, [end, start, stopRaf]);

  const startDrag = useCallback((mode: DragMode, event: React.PointerEvent<HTMLElement>) => {
    if (!duration) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pause();
    dragRef.current = {
      mode,
      pointerStart: secondsFromClientX(event.clientX),
      rangeStart: rangeRef.current.start,
      rangeEnd: rangeRef.current.end
    };

    if (mode === "start") seekPreview(rangeRef.current.start);
    if (mode === "end") seekPreview(rangeRef.current.end);
    if (mode === "range") seekPreview(rangeRef.current.start);
    if (mode === "playhead") seekPreview(secondsFromClientX(event.clientX));
  }, [duration, pause, secondsFromClientX, seekPreview]);

  const updateDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || !duration) return;
    event.preventDefault();
    const pointerSeconds = secondsFromClientX(event.clientX);

    if (drag.mode === "playhead") {
      seekPreview(pointerSeconds);
      return;
    }

    if (drag.mode === "start") {
      const normalized = setRange(pointerSeconds, drag.rangeEnd);
      if (normalized) seekPreview(normalized.start);
      return;
    }

    if (drag.mode === "end") {
      const normalized = setRange(drag.rangeStart, pointerSeconds);
      if (normalized) seekPreview(normalized.end);
      return;
    }

    const selectionLength = drag.rangeEnd - drag.rangeStart;
    const delta = pointerSeconds - drag.pointerStart;
    const nextStart = clamp(drag.rangeStart + delta, 0, duration - selectionLength);
    const normalized = setRange(nextStart, nextStart + selectionLength);
    if (normalized) seekPreview(normalized.start);
  }, [duration, secondsFromClientX, seekPreview, setRange]);

  const finishDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    dragRef.current = null;
  }, []);

  function applyManualInput(kind: "start" | "end") {
    const nextValue = parseTime(kind === "start" ? startInput : endInput);
    if (nextValue == null) {
      setError("Введите время в секундах или в формате mm:ss.SSS.");
      syncInputs(start, end);
      return;
    }

    const nextStart = kind === "start" ? nextValue : start;
    const nextEnd = kind === "end" ? nextValue : end;
    const normalized = normalizeRange(nextStart, nextEnd);
    if (!normalized || Math.abs(normalized.start - nextStart) > 0.001 || Math.abs(normalized.end - nextEnd) > 0.001) {
      setError(`Фрагмент должен быть внутри видео и длиться не меньше ${minSelectionDuration} сек.`);
      syncInputs(start, end);
      return;
    }

    emitRange(normalized.start, normalized.end);
    seekPreview(kind === "start" ? normalized.start : normalized.end);
    setError(null);
  }

  useLayoutEffect(() => {
    setMetadataLoading(true);
    setThumbnails([]);
    setError(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    previewSelectionRef.current = false;
    onReadyChange?.(false);
    stopRaf();
    videoRef.current?.load();
  }, [onReadyChange, src, stopRaf]);

  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  useEffect(() => {
    if (!duration) return;
    const controller = new AbortController();
    let cancelled = false;
    setThumbnailsLoading(true);
    generateThumbnails(src, duration, controller.signal)
      .then((frames) => {
        if (!cancelled) setThumbnails(frames);
      })
      .catch((thumbnailError: unknown) => {
        if (thumbnailError instanceof DOMException && thumbnailError.name === "AbortError") return;
        if (!cancelled) setThumbnails([]);
      })
      .finally(() => {
        if (!cancelled) setThumbnailsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [duration, src]);

  return (
    <section className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0f] p-4 text-white shadow-floating md:p-5">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-soft">
        <video
          key={src}
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          className="mx-auto max-h-[55vh] min-h-[240px] w-full bg-black object-contain"
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
              setMetadataLoading(false);
              onReadyChange?.(false);
              setError("Не удалось прочитать длительность видео.");
              return;
            }

            const normalizedDuration = Number(nextDuration.toFixed(3));
            const savedStart = initialStart ?? 0;
            const fallbackEnd = Math.min(normalizedDuration, defaultSelectionDuration);
            const savedEnd = initialEnd && initialEnd > savedStart ? initialEnd : fallbackEnd;
            const nextStart = clamp(savedStart, 0, Math.max(0, normalizedDuration - minSelectionDuration));
            const nextEnd = clamp(savedEnd, nextStart + minSelectionDuration, normalizedDuration);

            setDuration(normalizedDuration);
            setMetadataLoading(false);
            onReadyChange?.(true);
            onDurationChange?.(normalizedDuration);
            emitRange(nextStart, nextEnd);
            event.currentTarget.currentTime = nextStart;
            setCurrentTime(nextStart);

            if (savedEnd > normalizedDuration) {
              setError("Сохранённый конец фрагмента был за пределами видео, диапазон скорректирован.");
            }
          }}
          onError={() => {
            setMetadataLoading(false);
            onReadyChange?.(false);
            setError("Видео не удалось загрузить. Проверьте mp4-файл.");
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={stop}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="media-control-button" disabled={!duration} onClick={() => void togglePlay()}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {isPlaying ? "Пауза" : "Play"}
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={stop}>
          <Square size={18} />
          Stop
        </button>
        <button type="button" className="media-control-button media-control-button-primary" disabled={!duration} onClick={() => void playSelection()}>
          <Play size={18} />
          Проиграть выбранный фрагмент
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={() => seekTo(start)} aria-label="Перейти к началу фрагмента">
          <SkipBack size={18} />
          К началу
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={() => seekTo(end)} aria-label="Перейти к концу фрагмента">
          <SkipForward size={18} />
          К концу
        </button>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex flex-col justify-between gap-2 text-sm text-white/70 md:flex-row md:items-center">
          <span>{metadataLoading ? "Загружаем metadata..." : `Позиция ${formatTime(currentTime)} из ${formatTime(duration)}`}</span>
          <span>{thumbnailsLoading ? "Готовим кадры таймлайна..." : `Выбран фрагмент ${formatTime(selectionDuration)}`}</span>
        </div>

        <div
          ref={timelineRef}
          className="relative h-[104px] w-full touch-none overflow-hidden rounded-[20px] border border-white/10 bg-[#17171c]"
          onPointerDown={(event) => {
            startDrag("playhead", event);
          }}
          onPointerMove={updateDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${Math.max(thumbnails.length, DEFAULT_THUMBNAIL_COUNT)}, minmax(0, 1fr))` }}>
            {thumbnails.length > 0 ? thumbnails.map((thumbnail, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${thumbnail.time}-${index}`} src={thumbnail.url} alt="" className="h-full w-full object-cover opacity-80" />
            )) : Array.from({ length: DEFAULT_THUMBNAIL_COUNT }).map((_, index) => (
              <div
                key={index}
                className="h-full border-r border-white/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))]"
                style={{ opacity: 0.45 + (index % 4) * 0.12 }}
              />
            ))}
          </div>

          <div className="absolute inset-y-0 left-0 bg-black/62" style={{ width: `${leftPercent}%` }} />
          <div className="absolute inset-y-0 bg-black/62" style={{ left: `${rightPercent}%`, right: 0 }} />
          <div
            className="absolute inset-y-2 cursor-grab rounded-[18px] border border-primary/80 bg-primary/24 shadow-[0_0_28px_rgba(0,122,255,0.32)] active:cursor-grabbing"
            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
            onPointerDown={(event) => startDrag("range", event)}
            onPointerMove={updateDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            aria-label="Выбранный диапазон"
          />
          <button
            type="button"
            className="absolute top-1/2 z-20 h-[88px] w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-floating outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            style={{ left: `${leftPercent}%` }}
            onPointerDown={(event) => startDrag("start", event)}
            onPointerMove={updateDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            aria-label="Начало фрагмента"
          />
          <button
            type="button"
            className="absolute top-1/2 z-20 h-[88px] w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-floating outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
            style={{ left: `${rightPercent}%` }}
            onPointerDown={(event) => startDrag("end", event)}
            onPointerMove={updateDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            aria-label="Конец фрагмента"
          />
          <div className="absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.85)]" style={{ left: `${playheadPercent}%` }} />
        </div>

        <p className="mt-3 text-sm text-white/58">Перетащите края, выделенную область или playhead. В квизе будет проигрываться только выбранный диапазон.</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-sm font-semibold text-white/70">Начало</span>
          <input
            className="input bg-white/95 text-foreground"
            value={startInput}
            onChange={(event) => setStartInput(event.target.value)}
            onBlur={() => applyManualInput("start")}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyManualInput("start");
            }}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-white/70">Конец</span>
          <input
            className="input bg-white/95 text-foreground"
            value={endInput}
            onChange={(event) => setEndInput(event.target.value)}
            onBlur={() => applyManualInput("end")}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyManualInput("end");
            }}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-white/70">Длительность</span>
          <input className="input bg-white/80 text-foreground" value={formatTime(selectionDuration)} readOnly />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="media-control-button" disabled={!duration} onClick={resetRange}>
          <RotateCcw size={18} />
          Сбросить
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={selectFirstSeconds}>
          Выбрать первые {defaultSelectionDuration} секунд
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={selectWholeVideo}>
          Выбрать всё видео
        </button>
      </div>

      {error && <p className="mt-3 rounded-2xl border border-danger/25 bg-danger/15 p-3 text-sm text-white">{error}</p>}
    </section>
  );
}
