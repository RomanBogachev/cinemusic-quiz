"use client";

import { Maximize2, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VideoSegmentPlayerProps = {
  src: string;
  start: number;
  end: number;
};

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

export function VideoSegmentPlayer({ src, start, end }: VideoSegmentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearRaf();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = start;
    }
    setPlaying(false);
  }, [clearRaf, start]);

  const watchEnd = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= end) {
      video.pause();
      video.currentTime = end;
      setPlaying(false);
      clearRaf();
      return;
    }
    if (video.paused || video.ended) {
      setPlaying(false);
      clearRaf();
      return;
    }
    rafRef.current = requestAnimationFrame(watchEnd);
  }, [clearRaf, end]);

  async function playSegment() {
    const video = videoRef.current;
    if (!video) return;
    stop();
    setPlaying(true);
    setError(null);
    try {
      await waitForSeek(video, start);
      await video.play();
      rafRef.current = requestAnimationFrame(watchEnd);
      intervalRef.current = window.setInterval(watchEnd, 80);
    } catch {
      setPlaying(false);
      setError("Не удалось запустить видео. Попробуйте ещё раз.");
    }
  }

  async function openFullscreen() {
    await videoRef.current?.requestFullscreen?.();
  }

  useEffect(() => stop, [src, start, end, stop]);
  useEffect(() => clearRaf, [clearRaf]);

  return (
    <div className="rounded-[26px] border border-amber-100/10 bg-[radial-gradient(ellipse_at_center,rgba(255,235,190,0.08),rgba(0,0,0,0.88)_58%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-3">
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="mx-auto max-h-[68vh] min-h-[54vh] w-full rounded-[20px] bg-black object-contain shadow-[0_24px_80px_rgba(0,0,0,0.56)]"
      />
      <div className="flex justify-center p-4">
        <div className="media-controls-panel flex flex-wrap justify-center gap-2 p-2 md:gap-3">
        <button type="button" onClick={() => void playSegment()} className="media-control-button media-control-button-primary">
          <Play size={18} />
          Играть фрагмент
        </button>
        <button type="button" onClick={stop} className="media-control-button">
          <Square size={18} />
          Стоп
        </button>
        <button type="button" onClick={() => void openFullscreen()} className="media-control-button">
          <Maximize2 size={18} />
          На весь экран
        </button>
        </div>
      </div>
      <div className="pb-4 text-center text-sm text-white/55">
        Фрагмент: {start}–{end} сек. {playing ? "Идет воспроизведение." : "Ожидает запуска."}
      </div>
      {error && <div className="pb-4 text-center text-sm text-danger">{error}</div>}
    </div>
  );
}
