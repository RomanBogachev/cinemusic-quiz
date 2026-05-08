"use client";

import { Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioSegmentPlayerProps = {
  src: string;
  start: number;
  segments?: Partial<Record<1 | 3 | 5 | 10, string | null>>;
};

const durations = [1, 3, 5, 10] as const;

export function AudioSegmentPlayer({ src, start, segments }: AudioSegmentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const stop = useCallback(() => {
    clearTimer();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = audio.getAttribute("src") === src ? start : 0;
    }
    setPlaying(null);
  }, [src, start]);

  async function playSegment(duration: (typeof durations)[number]) {
    const audio = audioRef.current;
    if (!audio) return;
    const segmentSrc = segments?.[duration];
    clearTimer();
    audio.pause();
    if (segmentSrc && audio.getAttribute("src") !== segmentSrc) {
      audio.src = segmentSrc;
      audio.load();
    } else if (!segmentSrc && audio.getAttribute("src") !== src) {
      audio.src = src;
      audio.load();
    }
    audio.currentTime = segmentSrc ? 0 : start;
    setPlaying(duration);
    await audio.play();
    if (!segmentSrc) {
      timerRef.current = window.setTimeout(stop, duration * 1000);
    }
  }

  useEffect(() => stop, [src, start, stop]);

  return (
    <div className="rounded-[28px] border border-white/10 bg-black/70 p-7 pb-32 shadow-panel">
      <audio ref={audioRef} src={src} preload="auto" onEnded={() => setPlaying(null)} />
      <div className="mb-7 flex h-36 items-end justify-center gap-3 rounded-3xl bg-gradient-to-br from-primary/10 to-black p-8">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className={`w-2 rounded-full bg-primary/80 ${playing ? "animate-pulse" : ""}`}
            style={{ height: `${28 + ((index * 19) % 72)}%`, animationDelay: `${index * 55}ms` }}
          />
        ))}
      </div>
      <div className="media-controls-panel mx-auto flex max-w-fit flex-wrap justify-center gap-2 p-2 md:gap-3">
        {durations.map((duration) => (
          <button key={duration} type="button" onClick={() => void playSegment(duration)} className="media-control-button media-control-button-primary">
            {playing === duration ? <Pause size={18} /> : <Play size={18} />}
            Играть {duration} сек
          </button>
        ))}
        <button type="button" onClick={stop} className="media-control-button">
          <Square size={18} />
          Стоп
        </button>
      </div>
      <div className="mt-5 text-center text-sm text-white/55">
        Старт фрагмента: {start} сек. {playing ? `Играет ${playing} сек.` : "Ожидает запуска."}
      </div>
    </div>
  );
}
