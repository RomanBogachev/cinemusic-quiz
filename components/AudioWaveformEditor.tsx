"use client";

import { Pause, Play, Save, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

type RegionLike = {
  start: number;
  end: number;
  remove: () => void;
  setOptions: (options: { start: number; end: number; color?: string }) => void;
};

type SegmentDragMode = "start" | "end" | "range";

type SegmentDragState = {
  mode: SegmentDragMode;
  pointerStart: number;
  rangeStart: number;
  rangeEnd: number;
};

type RegionsPluginLike = ReturnType<typeof RegionsPlugin.create> & {
  addRegion: (options: {
    start: number;
    end: number;
    color: string;
    drag: boolean;
    resize: boolean;
  }) => RegionLike;
  on: (event: "region-updated", callback: (region: RegionLike) => void) => void;
};

type AudioWaveformEditorProps = {
  questionId?: string;
  src: string;
  initialStart?: number | null;
  initialEnd?: number | null;
  uploadStatus?: "idle" | "uploading" | "error" | "done";
  uploadError?: string | null;
  onRangeChange?: (range: { start: number; end: number }) => void;
  onSaved?: () => void;
};

const segmentDurations = [
  { value: 1, label: "1 сек", className: "bg-sky-500 text-white shadow-[0_10px_28px_rgba(14,165,233,0.28)] hover:bg-sky-400 focus-visible:ring-sky-300/40" },
  { value: 3, label: "3 сек", className: "bg-emerald-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:bg-emerald-400 focus-visible:ring-emerald-300/40" },
  { value: 5, label: "5 сек", className: "bg-orange-500 text-white shadow-[0_10px_28px_rgba(249,115,22,0.28)] hover:bg-orange-400 focus-visible:ring-orange-300/40" },
  { value: 10, label: "10 сек", className: "bg-rose-600 text-white shadow-[0_10px_28px_rgba(225,29,72,0.28)] hover:bg-rose-500 focus-visible:ring-rose-300/40" }
] as const;

const minSegmentDuration = 0.1;
const regionColor = "rgba(251, 191, 36, 0.32)";
const timelinePadding = 16;

function formatTime(value: number) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const milliseconds = Math.round((safeValue - Math.floor(safeValue)) * 1000);
  const base = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return milliseconds > 0 ? `${base}.${milliseconds.toString().padStart(3, "0")}` : base;
}

function formatRulerTime(value: number) {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRulerTickStep(duration: number, width: number) {
  const pixelsPerSecond = width > 0 && duration > 0 ? width / duration : 0;
  if (pixelsPerSecond >= 16) return 0.5;
  if (pixelsPerSecond >= 8) return 1;
  if (pixelsPerSecond >= 4) return 2;
  if (pixelsPerSecond >= 2) return 5;
  return 10;
}

function getRulerLabelStep(duration: number, width: number) {
  const pixelsPerSecond = width > 0 && duration > 0 ? width / duration : 0;
  if (pixelsPerSecond >= 70 && duration <= 180) return 1;
  if (pixelsPerSecond >= 34 && duration <= 300) return 2;
  if (pixelsPerSecond >= 14 && duration <= 900) return 5;
  if (duration <= 1800) return 10;
  return 30;
}

function buildRulerTicks(duration: number, width: number) {
  if (!duration) return [];

  const tickStep = getRulerTickStep(duration, width);
  const labelStep = getRulerLabelStep(duration, width);
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true'], [role='textbox']")
  );
}

export function AudioWaveformEditor({
  questionId,
  src,
  initialStart = 0,
  initialEnd = null,
  uploadStatus = "idle",
  uploadError = null,
  onRangeChange,
  onSaved
}: AudioWaveformEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineViewportRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<RegionLike | null>(null);
  const segmentDragRef = useRef<SegmentDragState | null>(null);
  const segmentRafRef = useRef<number | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  const initialStartRef = useRef(initialStart ?? 0);
  const initialEndRef = useRef(initialEnd);
  const startRef = useRef(initialStart ?? 0);
  const endRef = useRef(initialEnd ?? (initialStart ?? 0) + 1);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  const hasSelectedSegmentRef = useRef(initialEnd !== null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [start, setStart] = useState(initialStart ?? 0);
  const [end, setEnd] = useState((initialStart ?? 0) + 1);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);

  const selectedDuration = useMemo(() => Math.max(0, end - start), [end, start]);
  const activeDuration = segmentDurations.find((durationOption) => Math.abs(durationOption.value - selectedDuration) < 0.05)?.value ?? null;
  const playheadPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const segmentStartPercent = duration > 0 ? clamp((start / duration) * 100, 0, 100) : 0;
  const segmentWidthPercent = duration > 0 ? clamp((selectedDuration / duration) * 100, 0, 100) : 0;
  const rulerWidth = Math.max(0, timelineViewportWidth - timelinePadding * 2);
  const rulerTicks = useMemo(() => buildRulerTicks(duration, rulerWidth), [duration, rulerWidth]);

  useEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  }, [onRangeChange]);

  useEffect(() => {
    const element = timelineViewportRef.current;
    if (!element) return;

    const updateWidth = () => {
      setTimelineViewportWidth(element.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  initialStartRef.current = initialStart ?? 0;
  initialEndRef.current = initialEnd;

  const syncRange = useCallback((nextStart: number, nextEnd: number, syncRegion = true) => {
    const nextRange = { start: nextStart, end: nextEnd };
    startRef.current = nextStart;
    endRef.current = nextEnd;
    setStart(nextStart);
    setEnd(nextEnd);
    onRangeChangeRef.current?.(nextRange);
    if (syncRegion) {
      regionRef.current?.setOptions({ start: nextStart, end: nextEnd, color: regionColor });
    }
  }, []);

  const seekPlayhead = useCallback((time: number) => {
    const safeDuration = durationRef.current;
    const safeTime = clamp(time, 0, Math.max(0, safeDuration));
    const wave = waveRef.current;
    currentTimeRef.current = safeTime;
    setCurrentTime(safeTime);
    setError(null);
    if (!wave) return;
    wave.pause();
    wave.setTime(safeTime);
  }, []);

  const stopSegmentPlaybackMonitor = useCallback(() => {
    if (segmentRafRef.current) {
      cancelAnimationFrame(segmentRafRef.current);
      segmentRafRef.current = null;
    }
  }, []);

  const monitorSegmentPlayback = useCallback(() => {
    const wave = waveRef.current;
    if (!wave) return;

    const time = wave.getCurrentTime();
    currentTimeRef.current = time;
    setCurrentTime(time);

    if (time >= endRef.current || !wave.isPlaying()) {
      const endTime = endRef.current;
      wave.pause();
      wave.setTime(endTime);
      currentTimeRef.current = endTime;
      setCurrentTime(endTime);
      setPlaying(false);
      stopSegmentPlaybackMonitor();
      return;
    }

    segmentRafRef.current = requestAnimationFrame(monitorSegmentPlayback);
  }, [stopSegmentPlaybackMonitor]);

  const playSegment = useCallback(async (nextStart: number, nextEnd: number) => {
    const wave = waveRef.current;
    if (!wave || nextEnd <= nextStart) return;

    stopSegmentPlaybackMonitor();
    wave.pause();
    wave.setTime(nextStart);
    currentTimeRef.current = nextStart;
    setCurrentTime(nextStart);
    setError(null);

    try {
      await wave.play();
      setPlaying(true);
      segmentRafRef.current = requestAnimationFrame(monitorSegmentPlayback);
    } catch {
      setPlaying(false);
      setError("Браузер не смог запустить воспроизведение фрагмента.");
    }
  }, [monitorSegmentPlayback, stopSegmentPlaybackMonitor]);

  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create() as RegionsPluginLike;
    setReady(false);
    setError(null);
    setPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;

    const wave = WaveSurfer.create({
      container: containerRef.current,
      url: src,
      height: 170,
      waveColor: "#10b981",
      progressColor: "#14b8a6",
      cursorColor: "#f43f5e",
      cursorWidth: 1,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      normalize: true,
      interact: true,
      plugins: [regions]
    });

    waveRef.current = wave;

    wave.on("ready", () => {
      const fileDuration = wave.getDuration();
      const safeStart = clamp(initialStartRef.current, 0, Math.max(0, fileDuration - minSegmentDuration));
      const fallbackEnd = safeStart + 1;
      const safeEnd = clamp(initialEndRef.current ?? fallbackEnd, safeStart + minSegmentDuration, fileDuration || fallbackEnd);

      durationRef.current = fileDuration;
      setDuration(fileDuration);
      setReady(true);
      currentTimeRef.current = safeStart;
      setCurrentTime(safeStart);
      wave.setTime(safeStart);
      hasSelectedSegmentRef.current = initialEndRef.current !== null;

      regionRef.current = regions.addRegion({
        start: safeStart,
        end: safeEnd,
        color: regionColor,
        drag: true,
        resize: true
      });
      syncRange(safeStart, safeEnd, false);
    });

    wave.on("play", () => setPlaying(true));
    wave.on("pause", () => setPlaying(false));
    wave.on("finish", () => setPlaying(false));
    wave.on("timeupdate", (time) => {
      currentTimeRef.current = time;
      setCurrentTime(time);
    });
    wave.on("interaction", (time) => {
      const nextTime = typeof time === "number" ? time : wave.getCurrentTime();
      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      setError(null);
    });
    regions.on("region-updated", (region) => {
      const nextStart = clamp(region.start, 0, Math.max(0, durationRef.current - minSegmentDuration));
      const nextEnd = clamp(region.end, nextStart + minSegmentDuration, durationRef.current || region.end);
      hasSelectedSegmentRef.current = true;
      syncRange(nextStart, nextEnd, false);
      setError(null);
    });

    return () => {
      stopSegmentPlaybackMonitor();
      wave.destroy();
      waveRef.current = null;
      regionRef.current = null;
      durationRef.current = 0;
    };
  }, [src, syncRange, stopSegmentPlaybackMonitor]);

  async function playPause() {
    const wave = waveRef.current;
    if (!wave) return;
    setError(null);
    stopSegmentPlaybackMonitor();

    if (wave.isPlaying()) {
      wave.pause();
      setPlaying(false);
      return;
    }

    wave.setTime(currentTimeRef.current);
    try {
      await wave.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("Браузер не смог запустить воспроизведение.");
    }
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.code !== "Space" && event.key !== " ") return;
    if (event.repeat || !ready || isEditableTarget(event.target)) return;

    event.preventDefault();
    void playPause();
  }

  function handleEditorPointerDownCapture(event: React.PointerEvent<HTMLDivElement>) {
    if (isEditableTarget(event.target)) return;
    rootRef.current?.focus({ preventScroll: true });
  }

  function stop() {
    const wave = waveRef.current;
    if (!wave) return;
    stopSegmentPlaybackMonitor();
    wave.pause();
    const nextTime = startRef.current || 0;
    wave.setTime(nextTime);
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  }

  async function chooseSegment(segmentDuration: number) {
    if (!ready || durationRef.current <= 0) return;
    const fileDuration = durationRef.current;
    const anchorStart = hasSelectedSegmentRef.current ? startRef.current : currentTimeRef.current;
    const nextStart = clamp(anchorStart, 0, Math.max(0, fileDuration - minSegmentDuration));
    const nextEnd = clamp(nextStart + segmentDuration, nextStart + minSegmentDuration, fileDuration);

    if (nextEnd <= nextStart) {
      setError("От текущей позиции до конца файла не хватает аудио");
      return;
    }

    setError(null);
    hasSelectedSegmentRef.current = true;
    syncRange(nextStart, nextEnd);
    await playSegment(nextStart, nextEnd);
  }

  function nudgePlayhead(delta: number) {
    const wave = waveRef.current;
    if (!ready || durationRef.current <= 0) return;
    stopSegmentPlaybackMonitor();
    wave?.pause();
    setPlaying(false);
    seekPlayhead(currentTimeRef.current + delta);
  }

  function handlePlayheadPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX);
  }

  function handlePlayheadPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    seekFromPointer(event.clientX);
  }

  function seekFromPointer(clientX: number) {
    const timeline = timelineRef.current;
    if (!timeline || durationRef.current <= 0) return;
    const rect = timeline.getBoundingClientRect();
    const trackLeft = rect.left + timelinePadding;
    const trackWidth = Math.max(1, rect.width - timelinePadding * 2);
    const x = clamp(clientX - trackLeft, 0, trackWidth);
    const nextTime = (x / trackWidth) * durationRef.current;
    seekPlayhead(nextTime);
  }

  function secondsFromPointer(clientX: number) {
    const timeline = timelineRef.current;
    if (!timeline || durationRef.current <= 0) return 0;
    const rect = timeline.getBoundingClientRect();
    const trackLeft = rect.left + timelinePadding;
    const trackWidth = Math.max(1, rect.width - timelinePadding * 2);
    const x = clamp(clientX - trackLeft, 0, trackWidth);
    return (x / trackWidth) * durationRef.current;
  }

  function updateSegment(nextStart: number, nextEnd: number, previewTime: number) {
    const fileDuration = durationRef.current;
    if (fileDuration <= 0) return;
    const safeStart = clamp(nextStart, 0, Math.max(0, fileDuration - minSegmentDuration));
    const safeEnd = clamp(nextEnd, safeStart + minSegmentDuration, fileDuration);
    syncRange(safeStart, safeEnd);
    seekPlayhead(previewTime);
  }

  function handleSegmentPointerDown(mode: SegmentDragMode, event: React.PointerEvent<HTMLElement>) {
    if (!ready || durationRef.current <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stopSegmentPlaybackMonitor();
    waveRef.current?.pause();
    setPlaying(false);
    hasSelectedSegmentRef.current = true;
    segmentDragRef.current = {
      mode,
      pointerStart: secondsFromPointer(event.clientX),
      rangeStart: startRef.current,
      rangeEnd: endRef.current
    };

    if (mode === "start") seekPlayhead(startRef.current);
    if (mode === "end") seekPlayhead(endRef.current);
    if (mode === "range") seekPlayhead(startRef.current);
  }

  function handleSegmentPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = segmentDragRef.current;
    if (!drag || durationRef.current <= 0) return;
    event.preventDefault();
    event.stopPropagation();

    const pointerTime = secondsFromPointer(event.clientX);
    if (drag.mode === "start") {
      const nextStart = clamp(pointerTime, 0, drag.rangeEnd - minSegmentDuration);
      updateSegment(nextStart, drag.rangeEnd, nextStart);
      return;
    }

    if (drag.mode === "end") {
      const nextEnd = clamp(pointerTime, drag.rangeStart + minSegmentDuration, durationRef.current);
      updateSegment(drag.rangeStart, nextEnd, nextEnd);
      return;
    }

    const segmentLength = drag.rangeEnd - drag.rangeStart;
    const delta = pointerTime - drag.pointerStart;
    const nextStart = clamp(drag.rangeStart + delta, 0, Math.max(0, durationRef.current - segmentLength));
    updateSegment(nextStart, nextStart + segmentLength, nextStart);
  }

  function handleSegmentPointerUp(event: React.PointerEvent<HTMLElement>) {
    if (segmentDragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture can already be released by the browser.
      }
    }
    segmentDragRef.current = null;
  }

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLElement && event.target.closest("[data-playhead-handle]")) return;
    seekFromPointer(event.clientX);
  }

  async function saveSegments() {
    if (!questionId) {
      setError("Сначала сохраните вопрос, затем можно создать постоянные аудионарезки.");
      return;
    }
    if (endRef.current <= startRef.current) {
      setError("Выберите фрагмент на timeline");
      return;
    }
    setSaving(true);
    const response = await fetch("/api/audio/segments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId, startTime: startRef.current, endTime: endRef.current })
    });
    const payload = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить нарезки");
      return;
    }
    onSaved?.();
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleEditorKeyDown}
      onPointerDownCapture={handleEditorPointerDownCapture}
      className="max-w-full overflow-hidden rounded-[24px] border border-emerald-300/30 bg-slate-950 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/25"
    >
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h3 className="text-xl font-bold tracking-[-0.03em] text-white">Редактор аудиофрагмента</h3>
          <p className="mt-1 text-sm text-slate-300">
            Поставьте playhead на нужный момент и выберите длительность фрагмента. Пробел — Play/Pause.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : "..."}
        </div>
      </div>

      <div className="relative max-w-full overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-900">
        {!ready && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-emerald-300/20 bg-slate-950/88 px-4 py-3 text-center text-sm font-semibold text-slate-200 shadow-lg backdrop-blur">
            Загружаем waveform...
          </div>
        )}

        <div ref={timelineViewportRef} className="overflow-hidden">
          <div
            ref={timelineRef}
            className="relative min-w-full cursor-crosshair px-4 pb-8 pt-12"
            onClick={handleTimelineClick}
          >
            <div className="pointer-events-none absolute inset-x-4 top-3 h-8 border-t border-emerald-300/15">
              {rulerTicks.map((tick) => (
                <div
                  key={`${tick.time}-${tick.major ? "major" : "minor"}`}
                  className="absolute bottom-0 top-0"
                  style={{ left: `${duration > 0 ? (tick.time / duration) * 100 : 0}%` }}
                >
                  <span
                    className={
                      tick.major
                        ? "absolute bottom-0 block h-5 border-l border-emerald-100/65"
                        : "absolute bottom-0 block h-2.5 border-l border-emerald-100/28"
                    }
                  />
                  {tick.label && (
                    <span className="absolute left-1 top-0 whitespace-nowrap text-[10px] font-semibold tabular-nums text-emerald-100/70">
                      {formatRulerTime(tick.time)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div ref={containerRef} className="relative z-10 overflow-hidden rounded-xl border border-emerald-300/15 bg-gradient-to-b from-emerald-950/70 to-slate-950" />
            <div
              className="absolute bottom-8 top-12 z-20 cursor-grab rounded-xl border border-amber-200/90 bg-amber-300/24 shadow-[0_0_24px_rgba(251,191,36,0.28)] active:cursor-grabbing"
              style={{
                left: `calc(1rem + (100% - 2rem) * ${segmentStartPercent / 100})`,
                width: `calc((100% - 2rem) * ${segmentWidthPercent / 100})`,
                minWidth: "26px"
              }}
              onPointerDown={(event) => handleSegmentPointerDown("range", event)}
              onPointerMove={handleSegmentPointerMove}
              onPointerUp={handleSegmentPointerUp}
              onPointerCancel={handleSegmentPointerUp}
              aria-label="Переместить фрагмент"
            >
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-amber-100/55" />
            </div>
            <button
              type="button"
              aria-label="Изменить начало фрагмента"
              className="group absolute bottom-7 top-11 z-30 w-5 -translate-x-1/2 cursor-ew-resize bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/35"
              style={{ left: `calc(1rem + (100% - 2rem) * ${segmentStartPercent / 100})` }}
              onPointerDown={(event) => handleSegmentPointerDown("start", event)}
              onPointerMove={handleSegmentPointerMove}
              onPointerUp={handleSegmentPointerUp}
              onPointerCancel={handleSegmentPointerUp}
            >
              <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.58)] transition group-hover:w-1" />
              <span className="absolute -top-1 left-1/2 h-2 w-3 -translate-x-1/2 rounded-sm bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
            </button>
            <button
              type="button"
              aria-label="Изменить конец фрагмента"
              className="group absolute bottom-7 top-11 z-30 w-5 -translate-x-1/2 cursor-ew-resize bg-transparent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/35"
              style={{ left: `calc(1rem + (100% - 2rem) * ${(segmentStartPercent + segmentWidthPercent) / 100})` }}
              onPointerDown={(event) => handleSegmentPointerDown("end", event)}
              onPointerMove={handleSegmentPointerMove}
              onPointerUp={handleSegmentPointerUp}
              onPointerCancel={handleSegmentPointerUp}
            >
              <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.58)] transition group-hover:w-1" />
              <span className="absolute -top-1 left-1/2 h-2 w-3 -translate-x-1/2 rounded-sm bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
            </button>
            <div
              className="pointer-events-none absolute bottom-5 top-12 z-40 w-px rounded-full bg-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.72)]"
              style={{ left: `calc(1rem + (100% - 2rem) * ${playheadPercent / 100})` }}
            />
            <button
              type="button"
              data-playhead-handle
              aria-label="Переместить playhead"
              className="absolute bottom-4 z-50 h-4 w-4 -translate-x-1/2 rounded-full border border-white bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.72)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/35"
              style={{ left: `calc(1rem + (100% - 2rem) * ${playheadPercent / 100})` }}
              onPointerDown={handlePlayheadPointerDown}
              onPointerMove={handlePlayheadPointerMove}
            />
          </div>
        </div>
      </div>

      {uploadStatus === "uploading" && <p className="mt-2 text-sm text-slate-300">Загрузка аудио в фоне...</p>}
      {uploadStatus === "error" && <p className="mt-2 text-sm text-danger">{uploadError ?? "Не удалось загрузить аудио"}</p>}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 grid gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <span className="px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Трек</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-[0_10px_28px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35 active:translate-y-0 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/20 disabled:text-slate-500"
            onClick={() => void playPause()}
            disabled={!ready}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
            Play / Pause
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-[0_10px_28px_rgba(255,255,255,0.10)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100/35 active:translate-y-0 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/20 disabled:text-slate-500"
            onClick={stop}
            disabled={!ready}
          >
            <Square size={18} />
            Stop
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-50 px-3.5 py-2 text-sm font-extrabold text-cyan-950 shadow-[0_10px_24px_rgba(103,232,249,0.14)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/45 active:translate-y-0 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/20 disabled:text-slate-500"
            onClick={() => nudgePlayhead(-0.5)}
            disabled={!ready}
            aria-label="Сдвинуть playhead на 0.5 секунды назад"
          >
            -0.5 сек
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-50 px-3.5 py-2 text-sm font-extrabold text-cyan-950 shadow-[0_10px_24px_rgba(103,232,249,0.14)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/45 active:translate-y-0 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/20 disabled:text-slate-500"
            onClick={() => nudgePlayhead(0.5)}
            disabled={!ready}
            aria-label="Сдвинуть playhead на 0.5 секунды вперёд"
          >
            +0.5 сек
          </button>
          <div className="ml-auto rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">
            Текущий момент: {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
          <span className="px-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Фрагмент</span>
          {segmentDurations.map((durationOption) => (
            <button
              key={durationOption.value}
              type="button"
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 ${
                durationOption.className
              } ${activeDuration === durationOption.value ? "scale-[1.03] ring-2 ring-white/75" : "opacity-88 hover:opacity-100"}`}
              onClick={() => void chooseSegment(durationOption.value)}
              disabled={!ready}
            >
              {durationOption.label}
            </button>
          ))}
          <div className="ml-auto rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
            Фрагмент: {formatTime(start)} - {formatTime(end)} ({formatTime(selectedDuration)})
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={() => void saveSegments()} disabled={saving || !questionId}>
            <Save size={18} />
            {saving ? "Сохраняю..." : questionId ? "Применить настройки" : "Нарезки доступны после сохранения"}
          </button>
        </div>
      </div>
    </div>
  );
}
