"use client";

import type { Question, TopicCard } from "@prisma/client";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AudioWaveformEditor } from "@/components/AudioWaveformEditor";
import { MediaUploadField } from "@/components/MediaUploadField";
import type { QuestionMediaType } from "@/lib/types";

type QuestionFormProps = {
  topics: TopicCard[];
  question?: Question;
  initialTopicId?: string;
};

export function QuestionForm({ topics, question, initialTopicId }: QuestionFormProps) {
  const router = useRouter();
  const [topicCardId, setTopicCardId] = useState(question?.topicCardId ?? initialTopicId ?? topics[0]?.id ?? "");
  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === topicCardId), [topics, topicCardId]);
  const defaultMedia = selectedTopic?.quizTypeId ? undefined : "image";
  const [mediaType, setMediaType] = useState<QuestionMediaType>((question?.mediaType as QuestionMediaType | undefined) ?? (defaultMedia as QuestionMediaType) ?? "image");
  const [title, setTitle] = useState(question?.title ?? "");
  const [answer, setAnswer] = useState(question?.answer ?? "");
  const [mediaFilePath, setMediaFilePath] = useState(question?.mediaFilePath ?? "");
  const [audioStart, setAudioStart] = useState(question?.audioStart?.toString() ?? "0");
  const [videoStart, setVideoStart] = useState(question?.videoStart?.toString() ?? "0");
  const [videoEnd, setVideoEnd] = useState(question?.videoEnd?.toString() ?? "10");
  const [sortOrder, setSortOrder] = useState(question?.sortOrder?.toString() ?? "0");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadKind = mediaType === "image" ? "image" : mediaType === "audio" ? "audio" : "video";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <form onSubmit={submit} className={`apple-card p-6 ${mediaType === "audio" ? "max-w-5xl" : "max-w-3xl"}`}>
      <div className="grid gap-5">
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Карточка</span>
          <select className="input" value={topicCardId} onChange={(event) => setTopicCardId(event.target.value)}>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Тип медиа</span>
          <select className="input" value={mediaType} onChange={(event) => setMediaType(event.target.value as QuestionMediaType)}>
            <option value="image">Фото</option>
            <option value="audio">Музыка</option>
            <option value="video">Видео</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Заголовок вопроса</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Необязательно" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Правильный ответ</span>
          <input className="input" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold text-muted">Медиафайл</span>
          <MediaUploadField kind={uploadKind} value={mediaFilePath} onChange={setMediaFilePath} />
        </div>
        {mediaType === "audio" && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-muted">Начало, сек</span>
                <input className="input" type="number" min="0" step="0.001" value={audioStart} onChange={(event) => setAudioStart(event.target.value)} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-muted">Конец, сек</span>
                <input className="input" type="number" min="0" step="0.001" value={question?.audioEnd?.toString() ?? ""} readOnly />
              </label>
            </div>
            {question && mediaFilePath ? (
              <AudioWaveformEditor
                questionId={question.id}
                src={mediaFilePath}
                initialStart={question.audioStart}
                initialEnd={question.audioEnd}
                onSaved={() => router.refresh()}
              />
            ) : (
              <div className="rounded-3xl border border-black/[0.06] bg-black/[0.03] p-5 text-sm text-muted">
                Сначала сохраните аудиовопрос, затем откройте его редактирование и нарежьте фрагменты во встроенном waveform-редакторе.
              </div>
            )}
          </div>
        )}
        {mediaType === "video" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold text-muted">videoStart, сек</span>
              <input className="input" type="number" min="0" step="0.1" value={videoStart} onChange={(event) => setVideoStart(event.target.value)} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-muted">videoEnd, сек</span>
              <input className="input" type="number" min="0" step="0.1" value={videoEnd} onChange={(event) => setVideoEnd(event.target.value)} />
            </label>
          </div>
        )}
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Порядок</span>
          <input className="input" type="number" min="0" step="1" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
        </label>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary mt-6" disabled={loading}>
        <Save size={18} />
        {loading ? "Сохраняю..." : "Сохранить вопрос"}
      </button>
    </form>
  );
}
