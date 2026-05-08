"use client";

import { Maximize2, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VideoSegmentPlayerProps = {
  src: string;
  start: number;
  end: number;
};

export function VideoSegmentPlayer({ src, start, end }: VideoSegmentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = start;
    }
    setPlaying(false);
  }, [start]);

  function watchEnd() {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= end) {
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(watchEnd);
  }

  async function playSegment() {
    const video = videoRef.current;
    if (!video) return;
    stop();
    video.currentTime = start;
    setPlaying(true);
    await video.play();
    rafRef.current = requestAnimationFrame(watchEnd);
  }

  async function openFullscreen() {
    await videoRef.current?.requestFullscreen?.();
  }

  useEffect(() => stop, [src, start, end, stop]);

  return (
    <div className="rounded-[28px] border border-amber-200/14 bg-black/60 p-3 shadow-panel">
      <video ref={videoRef} src={src} preload="metadata" playsInline className="mx-auto max-h-[70vh] w-full rounded-[20px] object-contain" />
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
    </div>
  );
}
