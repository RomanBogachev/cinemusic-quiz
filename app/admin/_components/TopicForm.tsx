"use client";

import type { QuizType, TopicCard } from "@prisma/client";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MediaUploadField } from "@/components/MediaUploadField";
import { getCategoryBadgeClassName, getCategoryCardClassName, getCategoryDisplayName } from "@/lib/categories";

type TopicFormProps = {
  quizTypes: QuizType[];
  topic?: TopicCard;
};

export function TopicForm({ quizTypes, topic }: TopicFormProps) {
  const router = useRouter();
  const isEditing = Boolean(topic);
  const [title, setTitle] = useState(topic?.title ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [quizTypeId, setQuizTypeId] = useState(topic?.quizTypeId ?? quizTypes[0]?.id ?? "");
  const [coverImage, setCoverImage] = useState(topic?.coverImage ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedQuizType = quizTypes.find((item) => item.id === quizTypeId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const payload = isEditing
      ? { title, description, coverImage: coverImage || null }
      : { title, description, quizTypeId, coverImage: coverImage || null };
    const response = await fetch(topic ? `/api/topics/${topic.id}` : "/api/topics", {
      method: topic ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json()) as { id?: string; error?: string };
    setLoading(false);
    if (!response.ok || !result.id) {
      setError(result.error ?? "Не удалось сохранить");
      return;
    }
    router.push(`/admin/topics/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="apple-card w-full p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-4">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-muted">Название</span>
            <input className="input text-sm" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-muted">Описание</span>
            <textarea className="input min-h-28 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} required />
          </label>
          {!isEditing && (
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-muted">Категория</span>
              <select className="input text-sm" value={quizTypeId} onChange={(event) => setQuizTypeId(event.target.value)} required>
                {quizTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getCategoryDisplayName(item.type)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedQuizType && (
            <div className={`rounded-2xl border p-3 ${getCategoryCardClassName(selectedQuizType.type)}`}>
              {isEditing && <div className="mb-2 text-xs font-semibold text-muted">Категория темы</div>}
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(selectedQuizType.type)}`}>
                {getCategoryDisplayName(selectedQuizType.type)}
              </span>
            </div>
          )}
          {isEditing && !selectedQuizType && (
            <div className="rounded-2xl border border-black/[0.06] bg-black/[0.03] p-3 text-sm text-muted">Категория не задана</div>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted">Обложка</span>
            <MediaUploadField kind="cover" value={coverImage} onChange={setCoverImage} />
          </div>
          <p className="text-xs leading-5 text-muted">Обложка будет сохранена в формате 16:9 и красиво отобразится в сетке тем.</p>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end border-t border-black/[0.06] pt-4">
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={loading}>
          <Save size={18} />
          {loading ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
