"use client";

import { Minus, Pause, Play, Plus, Save, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

type RegionLike = {
  start: number;
  end: number;
  remove: () => void;
  setOptions: (options: { start: number; end: number; color?: string }) => void;
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

function formatTime(value: number) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const milliseconds = Math.round((safeValue - Math.floor(safeValue)) * 1000);
  const base = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return milliseconds > 0 ? `${base}.${milliseconds.toString().padStart(3, "0")}` : base;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<RegionLike | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  const initialStartRef = useRef(initialStart ?? 0);
  const initialEndRef = useRef(initialEnd);
  const startRef = useRef(initialStart ?? 0);
  const endRef = useRef(initialEnd ?? (initialStart ?? 0) + 1);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [start, setStart] = useState(initialStart ?? 0);
  const [end, setEnd] = useState((initialStart ?? 0) + 1);
  const [zoom, setZoom] = useState(48);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zoomRef = useRef(zoom);

  const selectedDuration = useMemo(() => Math.max(0, end - start), [end, start]);
  const activeDuration = segmentDurations.find((durationOption) => Math.abs(durationOption.value - selectedDuration) < 0.05)?.value ?? null;
  const playheadPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const timelineWidth = duration > 0 && zoom > 0 ? `${Math.max(1000, duration * zoom)}px` : "100%";

  useEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  }, [onRangeChange]);

  initialStartRef.current = initialStart ?? 0;
  initialEndRef.current = initialEnd;
  zoomRef.current = zoom;

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
      cursorWidth: 3,
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      normalize: true,
      interact: true,
      minPxPerSec: zoomRef.current,
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

      regionRef.current = regions.addRegion({
        start: safeStart,
        end: safeEnd,
        color: regionColor,
        drag: true,
        resize: true
      });
      syncRange(safeStart, safeEnd, false);
      wave.zoom(zoomRef.current);
    });

    wave.on("play", () => setPlaying(true));
    wave.on("pause", () => setPlaying(false));
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
      syncRange(nextStart, nextEnd, false);
      setError(null);
    });

    return () => {
      wave.destroy();
      waveRef.current = null;
      regionRef.current = null;
      durationRef.current = 0;
    };
  }, [src, syncRange]);

  function setWaveZoom(nextZoom: number) {
    const value = clamp(nextZoom, 24, 180);
    setZoom(value);
    waveRef.current?.zoom(value);
  }

  function playPause() {
    const wave = waveRef.current;
    if (!wave) return;
    setError(null);
    if (!playing) {
      wave.setTime(currentTimeRef.current);
    }
    void wave.playPause();
  }

  function stop() {
    const wave = waveRef.current;
    if (!wave) return;
    wave.pause();
    const nextTime = startRef.current || 0;
    wave.setTime(nextTime);
    currentTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  }

  function chooseSegment(segmentDuration: number) {
    if (!ready || durationRef.current <= 0) return;
    const fileDuration = durationRef.current;
    const nextStart = clamp(currentTimeRef.current, 0, Math.max(0, fileDuration - minSegmentDuration));
    const nextEnd = clamp(nextStart + segmentDuration, nextStart + minSegmentDuration, fileDuration);

    if (nextEnd <= nextStart) {
      setError("От текущей позиции до конца файла не хватает аудио");
      return;
    }

    setError(null);
    syncRange(nextStart, nextEnd);
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
    const x = clamp(clientX - rect.left, 0, rect.width);
    const nextTime = (x / rect.width) * durationRef.current;
    seekPlayhead(nextTime);
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
    <div className="max-w-full overflow-hidden rounded-[24px] border border-emerald-300/30 bg-slate-950 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h3 className="text-xl font-bold tracking-[-0.03em] text-white">Редактор аудиофрагмента</h3>
          <p className="mt-1 text-sm text-slate-300">
            Поставьте playhead на нужный момент и выберите длительность фрагмента. Zoom и выделение сохраняются при навигации.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : "..."}
        </div>
      </div>

      <div className="relative max-w-full overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-900">
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/88 p-1 shadow-lg backdrop-blur">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-100 transition hover:bg-emerald-400/15 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/25"
            aria-label="Уменьшить масштаб timeline"
            onClick={() => setWaveZoom(zoom - 24)}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-100 transition hover:bg-emerald-400/15 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/25"
            aria-label="Увеличить масштаб timeline"
            onClick={() => setWaveZoom(zoom + 24)}
          >
            <Plus size={16} />
          </button>
        </div>

        {!ready && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-emerald-300/20 bg-slate-950/88 px-4 py-3 text-center text-sm font-semibold text-slate-200 shadow-lg backdrop-blur">
            Загружаем waveform...
          </div>
        )}

        <div className="overflow-x-auto overflow-y-hidden" style={{ overscrollBehaviorX: "contain" }}>
          <div
            ref={timelineRef}
            className="relative min-w-full cursor-crosshair px-4 pb-8 pt-12"
            style={{ width: timelineWidth }}
            onClick={handleTimelineClick}
          >
            <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-between border-t border-emerald-300/15 pt-1 text-[10px] font-semibold text-emerald-100/70">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <span key={ratio}>{formatTime((duration || 0) * ratio)}</span>
              ))}
            </div>
            <div ref={containerRef} className="relative z-10 overflow-hidden rounded-xl border border-emerald-300/15 bg-gradient-to-b from-emerald-950/70 to-slate-950" />
            <div
              className="pointer-events-none absolute bottom-5 top-12 z-20 w-0.5 rounded-full bg-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.75)]"
              style={{ left: `calc(1rem + (100% - 2rem) * ${playheadPercent / 100})` }}
            />
            <button
              type="button"
              data-playhead-handle
              aria-label="Переместить playhead"
              className="absolute bottom-3 z-30 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.8)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/35"
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
          <button type="button" className="btn btn-ghost border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]" onClick={playPause} disabled={!ready}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
            Play / Pause
          </button>
          <button type="button" className="btn btn-ghost border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12]" onClick={stop} disabled={!ready}>
            <Square size={18} />
            Stop
          </button>
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
              onClick={() => chooseSegment(durationOption.value)}
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
