"use client";

import { FastForward, Pause, Play, Rewind, Save, Scissors, Square, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

type RegionLike = {
  start: number;
  end: number;
  remove: () => void;
  setOptions: (options: { start: number; end: number }) => void;
};

type AudioWaveformEditorProps = {
  questionId: string;
  src: string;
  initialStart?: number | null;
  initialEnd?: number | null;
  onSaved?: () => void;
};

function formatTime(value: number) {
  const safeValue = Math.max(0, value);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const milliseconds = Math.round((safeValue - Math.floor(safeValue)) * 1000);
  const base = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return milliseconds > 0 ? `${base}.${milliseconds.toString().padStart(3, "0")}` : base;
}

function parseTime(value: string) {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number.parseFloat(trimmed);
  }
  const match = trimmed.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,3}))?$/);
  if (!match) return Number.NaN;
  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  const milliseconds = Number.parseInt((match[3] ?? "0").padEnd(3, "0"), 10);
  return minutes * 60 + seconds + milliseconds / 1000;
}

export function AudioWaveformEditor({ questionId, src, initialStart = 0, initialEnd = null, onSaved }: AudioWaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<RegionLike | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(initialStart ?? 0);
  const [end, setEnd] = useState((initialStart ?? 0) + 1);
  const [startInput, setStartInput] = useState(formatTime(initialStart ?? 0));
  const [endInput, setEndInput] = useState(formatTime((initialStart ?? 0) + 1));
  const [zoom, setZoom] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDuration = useMemo(() => Math.max(0, end - start), [end, start]);

  const validate = useCallback(
    (nextStart: number, nextEnd: number) => {
      if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) return "Введите время в формате mm:ss или mm:ss.SSS";
      if (nextStart < 0) return "Начало должно быть не меньше 0";
      if (duration > 0 && nextEnd > duration) return "Конец не должен выходить за длительность файла";
      if (nextEnd <= nextStart) return "Конец должен быть больше начала";
      if (nextEnd - nextStart < 0.1) return "Минимальная длительность фрагмента 0.1 сек";
      if (Math.abs(nextEnd - nextStart - 1) > 0.01) return "Выделите базовый фрагмент ровно 1 секунду";
      return null;
    },
    [duration]
  );

  const updateRegion = useCallback((nextStart: number, nextEnd: number, syncInputs = true) => {
    setStart(nextStart);
    setEnd(nextEnd);
    if (syncInputs) {
      setStartInput(formatTime(nextStart));
      setEndInput(formatTime(nextEnd));
    }
    regionRef.current?.setOptions({ start: nextStart, end: nextEnd });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const regions = RegionsPlugin.create();
    const wave = WaveSurfer.create({
      container: containerRef.current,
      url: src,
      height: 164,
      waveColor: "rgba(110, 110, 115, 0.25)",
      progressColor: "rgba(0, 122, 255, 0.82)",
      cursorColor: "#007AFF",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      barRadius: 3,
      normalize: true,
      plugins: [regions]
    });

    waveRef.current = wave;
    wave.on("ready", () => {
      const fileDuration = wave.getDuration();
      const nextEnd = Math.min((initialStart ?? 0) + 1, fileDuration);
      setDuration(fileDuration);
      regionRef.current = regions.addRegion({
        start: initialStart ?? 0,
        end: nextEnd,
        color: "rgba(0, 122, 255, 0.18)",
        drag: true,
        resize: true
      }) as RegionLike;
      updateRegion(initialStart ?? 0, nextEnd);
    });
    wave.on("play", () => setPlaying(true));
    wave.on("pause", () => setPlaying(false));
    wave.on("timeupdate", (currentTime) => {
      if (stopAtRef.current != null && currentTime >= stopAtRef.current) {
        wave.pause();
        stopAtRef.current = null;
      }
    });
    regions.on("region-updated", (region: RegionLike) => {
      updateRegion(region.start, region.end);
      setError(validate(region.start, region.end));
    });

    return () => {
      wave.destroy();
      waveRef.current = null;
      regionRef.current = null;
    };
  }, [initialEnd, initialStart, src, updateRegion, validate]);

  function applyManualTimes(nextStartText = startInput, nextEndText = endInput) {
    const nextStart = parseTime(nextStartText);
    const nextEnd = parseTime(nextEndText);
    const validationError = validate(nextStart, nextEnd);
    setError(validationError);
    if (!validationError) {
      updateRegion(nextStart, nextEnd, false);
    }
  }

  async function playSelected() {
    const wave = waveRef.current;
    if (!wave) return;
    const validationError = validate(start, end);
    setError(validationError);
    if (validationError) return;
    stopAtRef.current = end;
    wave.setTime(start);
    await wave.play();
  }

  function stop() {
    const wave = waveRef.current;
    if (!wave) return;
    stopAtRef.current = null;
    wave.pause();
    wave.setTime(start);
  }

  function setWaveZoom(nextZoom: number) {
    const value = Math.max(0, Math.min(160, nextZoom));
    setZoom(value);
    waveRef.current?.zoom(value);
  }

  function setOneSecondFromStart() {
    const nextEnd = Math.min(start + 1, duration || start + 1);
    updateRegion(Math.max(0, nextEnd - 1), nextEnd);
    setError(null);
  }

  async function saveSegments() {
    const validationError = validate(start, end);
    setError(validationError);
    if (validationError) return;
    setSaving(true);
    const response = await fetch("/api/audio/segments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId, startTime: start, endTime: end })
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
    <div className="max-w-full overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/80 p-5 shadow-soft backdrop-blur-xl">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h3 className="text-2xl font-bold tracking-[-0.03em] text-foreground">Редактор аудиофрагмента</h3>
          <p className="mt-1 text-sm text-muted">Выделите 1 секунду. Версии 3, 5 и 10 секунд создаются автоматически от того же начала.</p>
        </div>
        <div className="text-sm text-muted">Длина файла: {duration ? formatTime(duration) : "..."}</div>
      </div>
      <div className="max-w-full overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-4">
        <div ref={containerRef} className="max-w-full overflow-x-auto overflow-y-hidden" style={{ contain: "layout paint", overscrollBehaviorX: "contain" }} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Начало</span>
          <input
            className="input"
            value={startInput}
            onBlur={() => applyManualTimes()}
            onChange={(event) => {
              setStartInput(event.target.value);
              applyManualTimes(event.target.value, endInput);
            }}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Конец</span>
          <input
            className="input"
            value={endInput}
            onBlur={() => applyManualTimes()}
            onChange={(event) => {
              setEndInput(event.target.value);
              applyManualTimes(startInput, event.target.value);
            }}
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Длительность</span>
          <input className="input" value={formatTime(selectedDuration)} readOnly />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={setOneSecondFromStart}>
          <Scissors size={18} />
          Выделить 1 сек
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void waveRef.current?.playPause()}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
          Play / Pause
        </button>
        <button type="button" className="btn btn-ghost" onClick={stop}>
          <Square size={18} />
          Stop
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void playSelected()}>
          <Play size={18} />
          Play selected fragment
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => waveRef.current?.setTime(start)}>
          <Rewind size={18} />
          К началу
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => waveRef.current?.setTime(end)}>
          <FastForward size={18} />К концу
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setWaveZoom(zoom + 24)}>
          <ZoomIn size={18} />
          Zoom in
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setWaveZoom(zoom - 24)}>
          <ZoomOut size={18} />
          Zoom out
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setWaveZoom(0)}>
          Reset zoom
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void saveSegments()} disabled={saving}>
          <Save size={18} />
          {saving ? "Сохраняю..." : "Применить настройки"}
        </button>
      </div>
    </div>
  );
}
