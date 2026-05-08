"use client";

import type { QuizType, TopicCard } from "@prisma/client";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MediaUploadField } from "@/components/MediaUploadField";

type TopicFormProps = {
  quizTypes: QuizType[];
  topic?: TopicCard;
};

export function TopicForm({ quizTypes, topic }: TopicFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [quizTypeId, setQuizTypeId] = useState(topic?.quizTypeId ?? quizTypes[0]?.id ?? "");
  const [coverImage, setCoverImage] = useState(topic?.coverImage ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(topic ? `/api/topics/${topic.id}` : "/api/topics", {
      method: topic ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description, quizTypeId, coverImage: coverImage || null })
    });
    const payload = (await response.json()) as { id?: string; error?: string };
    setLoading(false);
    if (!response.ok || !payload.id) {
      setError(payload.error ?? "Не удалось сохранить");
      return;
    }
    router.push(`/admin/topics/${payload.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="apple-card max-w-3xl p-6">
      <div className="grid gap-5">
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Тип категории</span>
          <select className="input" value={quizTypeId} onChange={(event) => setQuizTypeId(event.target.value)}>
            {quizTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Название</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold text-muted">Описание</span>
          <textarea className="input min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} required />
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold text-muted">Обложка</span>
          <MediaUploadField kind="cover" value={coverImage} onChange={setCoverImage} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <button type="submit" className="btn btn-primary mt-6" disabled={loading}>
        <Save size={18} />
        {loading ? "Сохраняю..." : "Сохранить"}
      </button>
    </form>
  );
}
