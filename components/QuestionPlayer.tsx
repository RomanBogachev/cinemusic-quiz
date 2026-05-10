"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioSegmentPlayer } from "@/components/AudioSegmentPlayer";
import { ImageViewer } from "@/components/ImageViewer";
import { VideoSegmentPlayer } from "@/components/VideoSegmentPlayer";
import type { QuestionMediaType } from "@/lib/types";

export type PlayerQuestion = {
  id: string;
  title: string | null;
  answer: string;
  mediaType: QuestionMediaType;
  mediaFilePath: string;
  audioStart: number | null;
  audioOnePath: string | null;
  audioThreePath: string | null;
  audioFivePath: string | null;
  audioTenPath: string | null;
  videoStart: number | null;
  videoEnd: number | null;
};

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
  }
  return copy;
}

function TheaterForeground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-[-10%] bottom-[-1.4rem] z-20 hidden h-[18vh] min-h-[92px] opacity-95 fullscreen:block md:block">
      {[0, 1].map((row) => (
        <div
          key={row}
          className="absolute left-1/2 flex -translate-x-1/2 justify-center gap-1.5"
          style={{
            bottom: `${row * 2.2}rem`,
            transform: `translateX(-50%) scale(${1 - row * 0.12})`,
            opacity: 0.92 - row * 0.22
          }}
        >
          {Array.from({ length: 18 - row * 3 }).map((_, index) => (
            <span
              key={index}
              className="block h-11 w-10 rounded-t-[22px] border border-red-200/10 bg-[linear-gradient(180deg,#8e1325_0%,#4b0712_70%,#150206_100%)] shadow-[0_-10px_24px_rgba(255,64,92,0.10),inset_0_1px_0_rgba(255,255,255,0.14)]"
            />
          ))}
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/82 to-transparent" />
    </div>
  );
}

export function QuestionPlayer({ topicTitle, questions }: { topicTitle: string; questions: PlayerQuestion[] }) {
  const [items, setItems] = useState(questions);
  const [index, setIndex] = useState(0);
  const [answerShown, setAnswerShown] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const mediaShellRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const question = items[index];

  const progress = useMemo(() => `${index + 1} из ${items.length}`, [index, items.length]);

  useEffect(() => {
    setItems(shuffled(questions));
    setIndex(0);
  }, [questions]);

  useEffect(() => {
    setAnswerShown(false);
  }, [question?.id]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => setControlsVisible(false), 1700);
  }, []);

  useEffect(() => {
    revealControls();
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [revealControls, question?.id]);

  useEffect(() => {
    function syncFullscreen() {
      setFullscreen(document.fullscreenElement === mediaShellRef.current);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const move = useCallback((nextIndex: number) => {
    setAnswerShown(false);
    setIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
    mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [items.length]);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await mediaShellRef.current?.requestFullscreen?.();
  }

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        revealControls();
        move(index + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        revealControls();
        move(index - 1);
      }
      if (event.code === "Space") {
        event.preventDefault();
        revealControls();
        setAnswerShown((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, move, revealControls]);

  if (!question) {
    return (
      <div className="mx-auto max-w-3xl rounded-[32px] border border-amber-100/20 bg-black/55 p-8 text-center text-white shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl">
        <h2 className="text-3xl font-extrabold tracking-[-0.03em]">В этой карточке пока нет вопросов</h2>
        <p className="mt-3 text-amber-50/70">Добавьте медиа и ответы в админке, затем вернитесь в режим квиза.</p>
      </div>
    );
  }

  return (
    <div ref={mainRef} className="space-y-5 md:space-y-6">
      <div className="mx-auto max-w-4xl text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80 md:text-sm">Вопрос {progress}</div>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em] text-white [text-shadow:0_10px_42px_rgba(0,0,0,0.8)] md:text-5xl">
          {topicTitle}
        </h1>
        {question.title && <p className="mt-3 text-lg text-amber-50/70">{question.title}</p>}
      </div>

      <div className="relative mx-auto max-w-[min(100%,88rem)]">
        <div className="pointer-events-none absolute -inset-x-8 -top-14 h-56 rounded-[44px] bg-[radial-gradient(ellipse_at_center,rgba(255,232,176,0.32),rgba(116,164,255,0.12)_42%,transparent_72%)] blur-3xl" />
        <div className="pointer-events-none absolute -inset-2 rounded-[34px] border border-amber-100/10 bg-gradient-to-b from-white/10 to-transparent shadow-[0_0_90px_rgba(255,211,138,0.18)]" />
        <div
          ref={mediaShellRef}
          onMouseMove={revealControls}
          onPointerMove={revealControls}
          onTouchStart={revealControls}
          className={`group relative overflow-hidden rounded-[32px] border border-amber-100/25 bg-[linear-gradient(180deg,#120b08_0%,#030202_24%,#010101_100%)] p-1.5 shadow-[0_38px_120px_rgba(0,0,0,0.82),0_0_74px_rgba(255,222,159,0.2),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/10 transition fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none fullscreen:border-0 fullscreen:p-0 ${
            controlsVisible ? "cursor-auto" : "cursor-none"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center_top,rgba(255,226,171,0.18),transparent_38%),linear-gradient(180deg,#060306_0%,#010101_58%,#000_100%)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[44%] w-[78%] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,236,197,0.16),rgba(124,172,255,0.06)_48%,transparent)] blur-2xl [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
          <TheaterForeground />
          <div className="relative z-10 mx-auto flex min-h-[58vh] items-center justify-center fullscreen:h-screen fullscreen:px-8 fullscreen:pb-32 fullscreen:pt-6">
            <div className="w-full">
              {question.mediaType === "image" && <ImageViewer src={question.mediaFilePath} title={question.title} />}
              {question.mediaType === "audio" && (
                <AudioSegmentPlayer
                  key={question.id}
                  src={question.mediaFilePath}
                  start={question.audioStart ?? 0}
                  segments={{
                    1: question.audioOnePath,
                    3: question.audioThreePath,
                    5: question.audioFivePath,
                    10: question.audioTenPath
                  }}
                />
              )}
              {question.mediaType === "video" && (
                <VideoSegmentPlayer key={question.id} src={question.mediaFilePath} start={question.videoStart ?? 0} end={question.videoEnd ?? 0} />
              )}
            </div>
          </div>

          <div
            className={`pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/50 via-transparent to-black/80 transition-opacity duration-300 ${
              controlsVisible || answerShown ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`media-controls-scrim pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44 transition-opacity duration-300 ${
              controlsVisible || answerShown ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`pointer-events-auto absolute right-4 top-4 z-30 transition-all duration-300 md:right-6 md:top-6 ${
              controlsVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            <button type="button" onClick={() => void toggleFullscreen()} className="media-control-button !border-amber-100/30 !bg-black/60">
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {fullscreen ? "Выйти из полного" : "На весь экран"}
            </button>
          </div>

          <div
            className={`pointer-events-auto absolute inset-x-0 bottom-5 z-30 flex flex-col items-center justify-center gap-3 px-4 transition-all duration-300 md:bottom-7 ${
              controlsVisible || answerShown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
            style={{ bottom: question.mediaType === "audio" ? "1rem" : undefined }}
          >
            <div className="media-controls-panel flex flex-wrap items-center justify-center gap-2 p-2 md:gap-3">
              <button
                type="button"
                onClick={() => move(index - 1)}
                disabled={index === 0}
                className="media-control-button !border-amber-100/25 !bg-black/60"
              >
                <ArrowLeft size={18} />
                Назад
              </button>
              <button
                type="button"
                className="media-control-button !border-amber-200/70 !bg-[linear-gradient(135deg,rgba(255,210,125,0.96),rgba(255,126,66,0.94))] !px-5 !text-black shadow-[0_16px_48px_rgba(255,145,65,0.32),0_8px_30px_rgba(0,0,0,0.35)] md:!px-7"
                onClick={() => setAnswerShown((value) => !value)}
              >
                {answerShown ? <EyeOff size={18} /> : <Eye size={18} />}
                {answerShown ? "Скрыть ответ" : "Показать ответ"}
              </button>
              <button
                type="button"
                onClick={() => move(index + 1)}
                disabled={index === items.length - 1}
                className="media-control-button !border-amber-100/25 !bg-black/60"
              >
                Следующий вопрос
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {answerShown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="pointer-events-none absolute inset-x-4 top-1/2 z-30 mx-auto max-w-3xl -translate-y-1/2 rounded-[30px] border border-amber-100/30 bg-[linear-gradient(135deg,rgba(18,11,8,0.82),rgba(0,0,0,0.66))] p-6 text-center text-3xl font-black leading-tight text-amber-50 shadow-[0_24px_90px_rgba(0,0,0,0.74),0_0_58px_rgba(255,195,104,0.22)] backdrop-blur-2xl [text-shadow:0_8px_28px_rgba(0,0,0,0.8)] md:text-5xl"
              >
                {question.answer}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
