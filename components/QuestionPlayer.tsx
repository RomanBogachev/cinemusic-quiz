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
      <div className="apple-card p-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-foreground">В этой карточке пока нет вопросов</h2>
        <p className="mt-3 text-muted">Добавьте медиа и ответы в админке, затем вернитесь в режим квиза.</p>
      </div>
    );
  }

  return (
    <div ref={mainRef} className="space-y-6">
      <div className="mx-auto max-w-4xl text-center">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">Вопрос {progress}</div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-[-0.04em] text-foreground md:text-5xl">{topicTitle}</h1>
        {question.title && <p className="mt-3 text-lg text-muted">{question.title}</p>}
      </div>

      <div
        ref={mediaShellRef}
        onMouseMove={revealControls}
        onPointerMove={revealControls}
        onTouchStart={revealControls}
        className={`group relative overflow-hidden rounded-[28px] border border-amber-200/14 bg-black shadow-panel transition [background:#050403] fullscreen:rounded-none fullscreen:border-0 ${
          controlsVisible ? "cursor-auto" : "cursor-none"
        }`}
      >
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

        <div
          className={`pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/42 via-transparent to-black/70 transition-opacity duration-300 ${
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
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="media-control-button"
          >
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
              className="media-control-button"
            >
              <ArrowLeft size={18} />
              Назад
            </button>
            <button type="button" className="media-control-button media-control-button-primary" onClick={() => setAnswerShown((value) => !value)}>
              {answerShown ? <EyeOff size={18} /> : <Eye size={18} />}
              {answerShown ? "Скрыть ответ" : "Показать ответ"}
            </button>
            <button
              type="button"
              onClick={() => move(index + 1)}
              disabled={index === items.length - 1}
              className="media-control-button"
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
              className="pointer-events-none absolute inset-x-4 top-1/2 z-30 mx-auto max-w-3xl -translate-y-1/2 rounded-[28px] border border-amber-200/24 bg-black/55 p-6 text-center text-3xl font-black leading-tight text-white shadow-glow backdrop-blur-2xl md:text-5xl"
            >
              {question.answer}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
