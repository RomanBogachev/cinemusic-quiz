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
    <div className="flex h-full flex-col justify-center rounded-[22px] border border-amber-100/10 bg-[radial-gradient(ellipse_at_center,rgba(255,207,118,0.12),rgba(16,9,18,0.72)_48%,rgba(0,0,0,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-6">
      <audio ref={audioRef} src={src} preload="auto" onEnded={() => setPlaying(null)} />
      <div className="mx-auto mb-5 flex h-28 w-full max-w-4xl items-end justify-center gap-2 rounded-[28px] border border-amber-100/15 bg-[linear-gradient(135deg,rgba(255,215,136,0.10),rgba(89,132,210,0.08)_45%,rgba(0,0,0,0.62))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] md:h-40 md:gap-3 md:p-8">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className={`w-2 rounded-full bg-gradient-to-t from-amber-500 to-amber-100 shadow-[0_0_18px_rgba(255,200,100,0.45)] ${playing ? "animate-pulse" : ""}`}
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
