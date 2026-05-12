"use client";

import { Minus, Pause, Play, Plus, Square } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { clamp, formatTime } from "@/lib/time";

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

function formatRulerTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getRulerLabelStep(duration: number, zoom: number) {
  if (zoom >= 92 && duration <= 180) return 1;
  if (zoom >= 54 && duration <= 300) return 2;
  if (zoom >= 34 && duration <= 900) return 5;
  if (duration <= 1800) return 10;
  return 30;
}

function buildRulerTicks(duration: number, zoom: number) {
  if (!duration) return [];

  const tickStep = 0.5;
  const labelStep = getRulerLabelStep(duration, zoom);
  const tickCount = Math.floor(duration / tickStep);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const time = Number((index * tickStep).toFixed(3));
    const isWholeSecond = Math.abs(time - Math.round(time)) < 0.001;
    return {
      time,
      major: isWholeSecond,
      label: isWholeSecond && Math.round(time) % labelStep === 0
    };
  }).filter((tick) => tick.time <= duration);

  const lastTick = ticks[ticks.length - 1];
  if (!lastTick || duration - lastTick.time > tickStep * 0.45) {
    ticks.push({ time: duration, major: true, label: true });
  }

  return ticks;
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
  const [zoom, setZoom] = useState(34);
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
  const timelineWidth = duration > 0 ? `${Math.max(1000, duration * zoom)}px` : "100%";
  const rulerTicks = useMemo(() => buildRulerTicks(duration, zoom), [duration, zoom]);

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

  const emitRange = useCallback((nextStart: number, nextEnd: number) => {
    const roundedStart = Number(nextStart.toFixed(3));
    const roundedEnd = Number(nextEnd.toFixed(3));
    rangeRef.current = { start: roundedStart, end: roundedEnd };
    setStart(roundedStart);
    setEnd(roundedEnd);
    onChange({ start: roundedStart, end: roundedEnd });
  }, [onChange]);

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

  const tick = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextTime = video.currentTime;
    setCurrentTime(nextTime);

    if (video.paused || video.ended) {
      previewSelectionRef.current = false;
      setIsPlaying(false);
      stopRaf();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stopRaf]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    if (isPlaying) {
      pause();
      return;
    }

    const playhead = currentTime;
    await waitForSeek(video, playhead);
    video.currentTime = playhead;
    setCurrentTime(playhead);
    previewSelectionRef.current = false;
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
  }, [currentTime, duration, isPlaying, pause, tick]);

  const stop = useCallback(() => {
    const video = videoRef.current;
    rangeRef.current = { start, end };
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setCurrentTime(0);
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

    if (mode === "playhead") {
      seekPreview(secondsFromClientX(event.clientX));
      return;
    }

    if (mode === "start") {
      seekPreview(rangeRef.current.start);
      return;
    }

    if (mode === "end") {
      seekPreview(rangeRef.current.end);
      return;
    }

    seekPreview(rangeRef.current.start);
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
      const nextRange = setRange(pointerSeconds, drag.rangeEnd);
      if (nextRange) seekPreview(nextRange.start);
      return;
    }

    if (drag.mode === "end") {
      const nextRange = setRange(drag.rangeStart, pointerSeconds);
      if (nextRange) seekPreview(nextRange.end);
      return;
    }

    const selectionLength = drag.rangeEnd - drag.rangeStart;
    const delta = pointerSeconds - drag.pointerStart;
    const nextStart = clamp(drag.rangeStart + delta, 0, duration - selectionLength);
    const nextRange = setRange(nextStart, nextStart + selectionLength);
    if (nextRange) seekPreview(nextRange.start);
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

  function setTimelineZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, 18, 120));
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
          {isPlaying ? "Пауза" : "Play / Pause"}
        </button>
        <button type="button" className="media-control-button" disabled={!duration} onClick={stop}>
          <Square size={18} />
          Stop
        </button>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex flex-col justify-between gap-2 text-sm text-white/70 md:flex-row md:items-center">
          <span>{metadataLoading ? "Загружаем metadata..." : `Текущий кадр: ${formatTime(currentTime)} из ${formatTime(duration)}`}</span>
          <span>
            {thumbnailsLoading
              ? "Готовим кадры таймлайна..."
              : `Фрагмент: ${formatTime(start)} - ${formatTime(end)} · ${formatTime(selectionDuration)}`}
          </span>
        </div>

        <div className="relative overflow-x-auto overflow-y-hidden rounded-[18px] border border-white/10 bg-[#111217]" style={{ overscrollBehaviorX: "contain" }}>
          <div className="absolute right-2 top-2 z-50 flex items-center gap-1 rounded-full border border-white/12 bg-black/75 p-1 shadow-soft backdrop-blur">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              aria-label="Уменьшить масштаб timeline"
              onClick={() => setTimelineZoom(zoom - 12)}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
              aria-label="Увеличить масштаб timeline"
              onClick={() => setTimelineZoom(zoom + 12)}
            >
              <Plus size={16} />
            </button>
          </div>
          <div
            ref={timelineRef}
            className="relative h-[118px] min-w-full touch-none md:h-[128px]"
            style={{ width: timelineWidth }}
            onPointerDown={(event) => {
              startDrag("playhead", event);
            }}
            onPointerMove={updateDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <div className="absolute inset-x-0 top-0 z-10 h-8 border-b border-white/10 bg-black/45">
              {rulerTicks.map((tick) => (
                <div
                  key={`${tick.time}-${tick.major ? "major" : "minor"}`}
                  className="absolute bottom-0 top-0"
                  style={{ left: `${secondsToPercent(tick.time, duration)}%` }}
                >
                  <span
                    className={
                      tick.major
                        ? "absolute bottom-0 block h-4 border-l border-white/55"
                        : "absolute bottom-0 block h-2 border-l border-white/22"
                    }
                  />
                  {tick.label && (
                    <span className="absolute left-1 top-0.5 whitespace-nowrap text-[10px] font-semibold tabular-nums text-white/70">
                      {formatRulerTime(tick.time)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-3 top-8 grid border-y border-white/10" style={{ gridTemplateColumns: `repeat(${Math.max(thumbnails.length, DEFAULT_THUMBNAIL_COUNT)}, minmax(0, 1fr))` }}>
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

            <div className="absolute bottom-3 left-0 top-8 z-10 bg-black/62" style={{ width: `${leftPercent}%` }} />
            <div className="absolute bottom-3 top-8 z-10 bg-black/62" style={{ left: `${rightPercent}%`, right: 0 }} />
            <div
              className="absolute bottom-3 top-8 z-20 cursor-grab rounded-[10px] border-2 border-amber-300 bg-amber-300/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),0_0_18px_rgba(251,191,36,0.28)] active:cursor-grabbing"
              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
              onPointerDown={(event) => startDrag("range", event)}
              onPointerMove={updateDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              aria-label="Выбранный диапазон"
            />
            <button
              type="button"
              className="group absolute bottom-3 top-8 z-30 w-10 -translate-x-1/2 cursor-ew-resize bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-amber-200/35"
              style={{ left: `${leftPercent}%` }}
              onPointerDown={(event) => startDrag("start", event)}
              onPointerMove={updateDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              aria-label="Начало фрагмента"
            >
              <span className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 rounded-md border border-amber-100 bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.8)] transition group-hover:w-2.5" />
              <span className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35" />
            </button>
            <button
              type="button"
              className="group absolute bottom-3 top-8 z-30 w-10 -translate-x-1/2 cursor-ew-resize bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-amber-200/35"
              style={{ left: `${rightPercent}%` }}
              onPointerDown={(event) => startDrag("end", event)}
              onPointerMove={updateDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              aria-label="Конец фрагмента"
            >
              <span className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 rounded-md border border-amber-100 bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.8)] transition group-hover:w-2.5" />
              <span className="absolute left-1/2 top-1/2 h-7 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35" />
            </button>
            <div className="absolute inset-y-0 z-40 w-px bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" style={{ left: `${playheadPercent}%` }} />
            <button
              type="button"
              className="absolute bottom-1 z-50 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-rose-500 shadow-[0_0_16px_rgba(251,113,133,0.85)] transition hover:scale-110 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/35"
              style={{ left: `${playheadPercent}%` }}
              onPointerDown={(event) => startDrag("playhead", event)}
              onPointerMove={updateDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              aria-label="Переместить playhead"
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-white/58">Перетащите края, выделенную область или playhead. В квизе будет проигрываться только выбранный диапазон.</p>
      </div>

      {error && <p className="mt-3 rounded-2xl border border-danger/25 bg-danger/15 p-3 text-sm text-white">{error}</p>}
    </section>
  );
}
