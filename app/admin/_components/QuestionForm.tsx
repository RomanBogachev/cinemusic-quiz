"use client";

import type { Question, QuizType, TopicCard } from "@prisma/client";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AudioWaveformEditor } from "@/components/AudioWaveformEditor";
import { MediaUploadField } from "@/components/MediaUploadField";
import { VideoTrimmer } from "@/components/admin/video/VideoTrimmer";
import { getCategoryDisplayName } from "@/lib/categories";
import { getMediaTypeDescription, getMediaTypeFromQuizType, MEDIA_TYPE_LABELS } from "@/lib/mediaTypes";
import type { QuestionMediaType } from "@/lib/types";

type TopicWithQuizType = TopicCard & { quizType: QuizType };

type QuestionFormProps = {
  topics: TopicWithQuizType[];
  question?: Question;
  initialTopicId?: string;
};

export function QuestionForm({ topics, question, initialTopicId }: QuestionFormProps) {
  const router = useRouter();
  const [topicCardId, setTopicCardId] = useState(question?.topicCardId ?? initialTopicId ?? topics[0]?.id ?? "");
  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === topicCardId), [topics, topicCardId]);
  const expectedMediaType = selectedTopic ? getMediaTypeFromQuizType(selectedTopic.quizType.type) : "image";
  const [mediaType, setMediaType] = useState<QuestionMediaType>((question?.mediaType as QuestionMediaType | undefined) ?? expectedMediaType);
  const [title, setTitle] = useState(question?.title ?? "");
  const [answer, setAnswer] = useState(question?.answer ?? "");
  const [mediaFilePath, setMediaFilePath] = useState(question?.mediaFilePath ?? "");
  const [audioStart, setAudioStart] = useState(question?.audioStart?.toString() ?? "0");
  const [videoStart, setVideoStart] = useState(question?.videoStart?.toString() ?? "0");
  const [videoEnd, setVideoEnd] = useState(question?.videoEnd?.toString() ?? "10");
  const [sortOrder, setSortOrder] = useState(question?.sortOrder?.toString() ?? "0");
  const [videoReady, setVideoReady] = useState(mediaType !== "video" || !mediaFilePath);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadKind = mediaType === "image" ? "image" : mediaType === "audio" ? "audio" : "video";
  const mediaMismatch = Boolean(question && selectedTopic && question.topicCardId === topicCardId && question.mediaType !== expectedMediaType);

  useEffect(() => {
    if (!question || question.topicCardId !== topicCardId) {
      setMediaType(expectedMediaType);
    }
  }, [expectedMediaType, question, topicCardId]);

  useEffect(() => {
    setVideoReady(mediaType !== "video" || !mediaFilePath);
  }, [mediaFilePath, mediaType]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mediaType === "video" && mediaFilePath && !videoReady) {
      setError("Дождитесь загрузки видео и таймлайна перед сохранением.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch(question ? `/api/questions/${question.id}` : "/api/questions", {
      method: question ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicCardId,
        title: title || null,
        answer,
        mediaType,
        mediaFilePath,
        sortOrder,
        audioStart: mediaType === "audio" ? audioStart : null,
        videoStart: mediaType === "video" ? videoStart : null,
        videoEnd: mediaType === "video" ? videoEnd : null
      })
    });
    const payload = (await response.json()) as { id?: string; topicCardId?: string; error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить");
      return;
    }
    router.push(`/admin/topics/${payload.topicCardId ?? topicCardId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="apple-card w-full min-w-0 overflow-hidden p-5 md:p-7">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="grid min-w-0 content-start gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-muted">Тема</span>
              <select
                className="input"
                value={topicCardId}
                onChange={(event) => {
                  const nextTopicId = event.target.value;
                  setTopicCardId(nextTopicId);
                  const nextTopic = topics.find((topic) => topic.id === nextTopicId);
                  if (nextTopic) setMediaType(getMediaTypeFromQuizType(nextTopic.quizType.type));
                }}
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-2 block text-sm font-semibold text-muted">Тип медиа</span>
              <div className="rounded-[18px] border border-black/[0.06] bg-primary/[0.06] p-4">
                <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  Тип медиа: {MEDIA_TYPE_LABELS[mediaType]}
                </div>
                {selectedTopic && (
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {getMediaTypeDescription(getCategoryDisplayName(selectedTopic.quizType.type), expectedMediaType)}
                  </p>
                )}
                {mediaMismatch && (
                  <p className="mt-2 text-sm leading-6 text-warning">
                    У этого существующего вопроса тип медиа отличается от категории темы. При смене темы тип будет выбран автоматически.
                  </p>
                )}
              </div>
            </div>
          </div>
          <label>
            <span className="mb-2 block text-sm font-semibold text-muted">Заголовок вопроса</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Необязательно" />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-muted">Правильный ответ</span>
            <input className="input" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
          </label>
          {mediaType === "audio" && question && mediaFilePath && (
            <div className="min-w-0">
              <AudioWaveformEditor
                questionId={question.id}
                src={mediaFilePath}
                initialStart={question.audioStart}
                initialEnd={question.audioEnd}
                onSaved={() => router.refresh()}
              />
            </div>
          )}
        </div>

        <aside className="grid min-w-0 content-start gap-5">
          <div className="min-w-0">
            <span className="mb-2 block text-sm font-semibold text-muted">Медиафайл</span>
            <MediaUploadField kind={uploadKind} value={mediaFilePath} onChange={setMediaFilePath} />
          </div>

          {mediaType === "audio" && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-muted">Начало, сек</span>
                  <input className="input" type="number" min="0" step="0.001" value={audioStart} onChange={(event) => setAudioStart(event.target.value)} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold text-muted">Конец, сек</span>
                  <input className="input" type="number" min="0" step="0.001" value={question?.audioEnd?.toString() ?? ""} readOnly />
                </label>
              </div>
              {(!question || !mediaFilePath) && (
                <div className="rounded-3xl border border-black/[0.06] bg-black/[0.03] p-5 text-sm text-muted">
                  Сначала сохраните аудиовопрос, затем откройте его редактирование и нарежьте фрагменты во встроенном waveform-редакторе.
                </div>
              )}
            </div>
          )}

          {mediaType === "video" && !mediaFilePath && (
            <div className="rounded-3xl border border-black/[0.06] bg-black/[0.03] p-5 text-sm text-muted">
              Загрузите mp4-файл, чтобы открыть таймлайн и выбрать фрагмент для проигрывания в квизе.
            </div>
          )}

          <label>
            <span className="mb-2 block text-sm font-semibold text-muted">Порядок</span>
            <input className="input" type="number" min="0" step="1" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </label>
        </aside>
      </div>

      {mediaType === "video" && mediaFilePath && (
        <div className="mt-6 min-w-0">
          <VideoTrimmer
            src={mediaFilePath}
            initialStart={Number(videoStart)}
            initialEnd={Number(videoEnd)}
            onReadyChange={setVideoReady}
            onChange={({ start, end }) => {
              setVideoStart(start.toString());
              setVideoEnd(end.toString());
            }}
          />
        </div>
      )}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-7 flex justify-end border-t border-black/[0.06] pt-5">
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
          <Save size={18} />
          {loading ? "Сохраняю..." : "Сохранить вопрос"}
        </button>
      </div>
    </form>
  );
}
