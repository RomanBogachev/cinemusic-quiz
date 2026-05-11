"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioSegmentPlayer } from "@/components/AudioSegmentPlayer";
import { CinemaTheaterBackdrop } from "@/components/CinemaBackground";
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
  const screenWidth = fullscreen ? "min(92vw, 1750px, calc((100vh - 12rem) * 16 / 9))" : "min(96vw, 1375px, calc((100vh - 13rem) * 16 / 9))";

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
    <div ref={mainRef}>
      <div className="relative mx-auto max-w-[min(100%,96rem)]">
        <div
          ref={mediaShellRef}
          onMouseMove={revealControls}
          onPointerMove={revealControls}
          onTouchStart={revealControls}
          className={`cinema-stage-shell group relative overflow-hidden transition ${
            fullscreen ? "h-screen w-screen bg-black" : "min-h-[calc(100vh-2rem)] bg-transparent"
          } ${
            controlsVisible ? "cursor-auto" : "cursor-none"
          }`}
        >
          <CinemaTheaterBackdrop
            className={`pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black ${fullscreen ? "block" : "hidden"}`}
          />

          <div className={`relative z-20 flex flex-col px-4 pt-4 md:px-8 ${fullscreen ? "h-screen pb-[17vh] px-8" : "min-h-[calc(100vh-2rem)] pb-[18vh]"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="text-left text-white">
                <div className="text-xs font-black uppercase leading-none tracking-[0.22em] md:text-sm">CINEMUSIC</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-red-400">Quiz</div>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/38 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_34px_rgba(0,0,0,0.38)] backdrop-blur-md md:text-base">
                Вопрос <span className="text-red-300">{index + 1}</span>/<span>{items.length}</span>
              </div>
            </div>

            <div className="mx-auto mt-[2vh] w-full max-w-5xl text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80 md:text-sm">{topicTitle}</div>
              {question.title && <p className="mt-2 text-sm text-amber-50/70 md:text-base">{question.title}</p>}
            </div>

            <div
              className="relative z-10 mx-auto mt-2 aspect-video max-w-full shrink-0 rounded-[26px] border border-cyan-50/80 bg-black/90 p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_22px_rgba(125,211,252,0.30),0_0_46px_rgba(14,165,233,0.18),0_22px_58px_rgba(0,0,0,0.55)]"
              style={{ width: screenWidth }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-[26px] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_0_24px_rgba(125,211,252,0.10)]" />
              <div className="absolute inset-[3px] overflow-hidden rounded-[22px] bg-black">
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

            <div className="relative z-30 mt-[clamp(1rem,2.5vh,2rem)] flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => move(index - 1)}
                disabled={index === 0}
                className="media-control-button !min-h-11 !border-white/15 !bg-black/46 !px-5 !py-2.5 !text-sm"
              >
                <ArrowLeft size={16} />
                Назад
              </button>
              <button
                type="button"
                className="inline-flex min-h-[60px] w-[min(70vw,520px)] items-center justify-center gap-3 rounded-[22px] border border-red-100/70 bg-[linear-gradient(135deg,#ff5368_0%,#d51f3d_45%,#730b1e_100%)] px-8 py-4 text-lg font-black uppercase tracking-[0.08em] text-white shadow-[0_0_30px_rgba(255,58,82,0.68),0_20px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.42)] transition hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_0_46px_rgba(255,78,98,0.82),0_26px_80px_rgba(0,0,0,0.66)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:min-h-[68px] md:text-2xl"
                onClick={() => setAnswerShown((value) => !value)}
              >
                {answerShown ? <EyeOff size={24} /> : <Eye size={24} />}
                {answerShown ? "Скрыть ответ" : "Показать ответ"}
              </button>
              <button
                type="button"
                onClick={() => move(index + 1)}
                disabled={index === items.length - 1}
                className="media-control-button !min-h-11 !border-white/15 !bg-black/46 !px-5 !py-2.5 !text-sm"
              >
                Следующий
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div
            className={`pointer-events-auto absolute right-4 top-20 z-30 transition-all duration-300 md:right-6 md:top-24 ${
              controlsVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            <button type="button" onClick={() => void toggleFullscreen()} className="media-control-button !border-amber-100/30 !bg-black/60">
              {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {fullscreen ? "Выйти из полного" : "На весь экран"}
            </button>
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
