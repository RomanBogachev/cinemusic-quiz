"use client";

import type { Question } from "@prisma/client";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AudioWaveformEditor } from "@/components/AudioWaveformEditor";
import { MediaUploadField } from "@/components/MediaUploadField";
import { VideoTrimmer } from "@/components/admin/video/VideoTrimmer";
import { getCategoryBadgeClassName, getCategoryCardClassName, getCategoryDisplayName } from "@/lib/categories";
import { getMediaTypeDescription, getMediaTypeFromQuizType, MEDIA_TYPE_LABELS } from "@/lib/mediaTypes";
import type { QuestionMediaType } from "@/lib/types";

type TopicWithQuizType = {
  id: string;
  title: string;
  description: string;
  quizTypeId: string;
  quizType: {
    id?: string;
    type: string;
    name?: string;
  };
};

type QuestionFormProps = {
  topics: TopicWithQuizType[];
  question?: Question;
  initialTopicId?: string;
  lockedTopicId?: string;
  onSaved?: (payload: { id?: string; topicCardId?: string }) => void;
};

export function QuestionForm({ topics, question, initialTopicId, lockedTopicId, onSaved }: QuestionFormProps) {
  const router = useRouter();
  const [topicCardId, setTopicCardId] = useState(lockedTopicId ?? question?.topicCardId ?? initialTopicId ?? topics[0]?.id ?? "");
  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === topicCardId), [topics, topicCardId]);
  const expectedMediaType = selectedTopic ? getMediaTypeFromQuizType(selectedTopic.quizType.type) : "image";
  const [mediaType, setMediaType] = useState<QuestionMediaType>((question?.mediaType as QuestionMediaType | undefined) ?? expectedMediaType);
  const [answer, setAnswer] = useState(question?.answer ?? "");
  const [mediaFilePath, setMediaFilePath] = useState(question?.mediaFilePath ?? "");
  const [audioStart, setAudioStart] = useState(question?.audioStart?.toString() ?? "0");
  const [audioEnd, setAudioEnd] = useState(question?.audioEnd?.toString() ?? "");
  const [audioPreviewSrc, setAudioPreviewSrc] = useState<string | null>(null);
  const [audioUploadState, setAudioUploadState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [videoStart, setVideoStart] = useState(question?.videoStart?.toString() ?? "0");
  const [videoEnd, setVideoEnd] = useState(question?.videoEnd?.toString() ?? "10");
  const [sortOrder] = useState(question?.sortOrder?.toString() ?? "0");
  const [videoReady, setVideoReady] = useState(mediaType !== "video" || !mediaFilePath);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadKind = mediaType === "image" ? "image" : mediaType === "audio" ? "audio" : "video";
  const mediaMismatch = Boolean(question && selectedTopic && question.topicCardId === topicCardId && question.mediaType !== expectedMediaType);
  const audioEditorSrc = mediaType === "audio" ? audioPreviewSrc ?? mediaFilePath : "";

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
    if (mediaType === "audio" && audioUploadState.loading) {
      setError("Дождитесь завершения фоновой загрузки аудио перед сохранением вопроса.");
      return;
    }
    if (mediaType === "audio" && audioUploadState.error) {
      setError(audioUploadState.error);
      return;
    }
    if (mediaType === "audio" && !mediaFilePath) {
      setError("Дождитесь загрузки аудиофайла перед сохранением вопроса.");
      return;
    }
    setLoading(true);
    setError(null);
    const response = await fetch(question ? `/api/questions/${question.id}` : "/api/questions", {
      method: question ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicCardId,
        title: question?.title ?? null,
        answer,
        mediaType,
        mediaFilePath,
        sortOrder,
        audioStart: mediaType === "audio" ? audioStart : null,
        audioEnd: mediaType === "audio" ? audioEnd : null,
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
    if (onSaved) {
      onSaved(payload);
      return;
    }
    router.push(`/admin/topics/${payload.topicCardId ?? topicCardId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="apple-card w-full min-w-0 overflow-hidden p-4 md:p-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
        <div className="grid min-w-0 content-start gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {lockedTopicId && selectedTopic ? (
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-muted">Выбранная тема</span>
                <div className={`rounded-[18px] border p-3 ${getCategoryCardClassName(selectedTopic.quizType.type)}`}>
                  <div className="text-sm font-bold text-foreground">{selectedTopic.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{selectedTopic.description}</p>
                </div>
              </div>
            ) : (
              <label>
                <span className="mb-1.5 block text-xs font-semibold text-muted">Тема</span>
                <select
                  className="input text-sm"
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
            )}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted">Тип медиа</span>
              <div className={`rounded-[18px] border p-3 ${selectedTopic ? getCategoryCardClassName(selectedTopic.quizType.type) : "border-black/[0.06] bg-primary/[0.06]"}`}>
                <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${selectedTopic ? getCategoryBadgeClassName(selectedTopic.quizType.type) : "border-primary/20 bg-primary/10 text-primary"}`}>
                  Тип медиа: {MEDIA_TYPE_LABELS[mediaType]}
                </div>
                {selectedTopic && (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {getMediaTypeDescription(getCategoryDisplayName(selectedTopic.quizType.type), expectedMediaType)}
                  </p>
                )}
                {mediaMismatch && (
                  <p className="mt-2 text-xs leading-5 text-warning">
                    У этого существующего вопроса тип медиа отличается от категории темы. При смене темы тип будет выбран автоматически.
                  </p>
                )}
              </div>
            </div>
          </div>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-muted">Правильный ответ</span>
            <input className="input text-sm" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
          </label>
        </div>

        <aside className="grid min-w-0 content-start gap-4">
          <div className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Медиафайл</span>
            <MediaUploadField
              kind={uploadKind}
              value={mediaFilePath}
              onChange={setMediaFilePath}
              onLocalPreviewChange={mediaType === "audio" ? setAudioPreviewSrc : undefined}
              onUploadStateChange={mediaType === "audio" ? setAudioUploadState : undefined}
            />
          </div>

          {mediaType === "audio" && (
            <div className="grid gap-3">
              {audioEditorSrc && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs leading-5 text-emerald-800">
                  Фрагмент выбирается на timeline ниже и сохраняется автоматически как start/end. Ручные поля начала и конца больше не нужны.
                </div>
              )}
              {!audioEditorSrc && (
                <div className="rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 text-xs leading-5 text-muted">
                  Загрузите аудиофайл, чтобы сразу открыть waveform и выбрать стартовый фрагмент.
                </div>
              )}
            </div>
          )}

          {mediaType === "video" && !mediaFilePath && (
            <div className="rounded-2xl border border-black/[0.06] bg-black/[0.03] p-4 text-xs leading-5 text-muted">
              Загрузите mp4-файл, чтобы открыть таймлайн и выбрать фрагмент для проигрывания в квизе.
            </div>
          )}
        </aside>
      </div>

      {mediaType === "audio" && audioEditorSrc && (
        <div className="mt-6 min-w-0">
          <AudioWaveformEditor
            questionId={question?.id}
            src={audioEditorSrc}
            initialStart={Number(audioStart) || question?.audioStart || 0}
            initialEnd={audioEnd ? Number(audioEnd) : question?.audioEnd}
            uploadStatus={audioUploadState.loading ? "uploading" : audioUploadState.error ? "error" : mediaFilePath ? "done" : "idle"}
            uploadError={audioUploadState.error}
            onRangeChange={({ start, end }) => {
              setAudioStart(start.toString());
              setAudioEnd(end.toString());
            }}
            onSaved={() => router.refresh()}
          />
        </div>
      )}

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
      <div className="mt-5 flex justify-end border-t border-black/[0.06] pt-4">
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
          <Save size={18} />
          {loading ? "Сохраняю..." : "Сохранить вопрос"}
        </button>
      </div>
    </form>
  );
}
