"use client";

import { Eye, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCategoryDisplayName } from "@/lib/categories";

type LatestQuestion = {
  id: string;
  title: string | null;
  answer: string | null;
  mediaType: string;
  mediaFilePath: string | null;
  topicCard: {
    id: string;
    title: string;
    quizType: {
      type: string;
      name: string;
    };
  };
};

type QuestionsResponse = {
  items: LatestQuestion[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type QuestionsTableProps = {
  title?: string;
  description?: string;
  limit?: number;
};

export function QuestionsTable({ title = "Последние добавленные вопросы", description, limit = 10 }: QuestionsTableProps) {
  const [data, setData] = useState<QuestionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions?page=${page}&limit=${limit}&sort=createdAt:desc`, { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось загрузить вопросы");
      setData((await response.json()) as QuestionsResponse);
    } catch {
      setError("Не удалось загрузить вопросы");
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  async function deleteQuestion(id: string) {
    if (!confirm("Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось удалить вопрос");
      const remainingItems = (data?.items.length ?? 0) - 1;
      if (remainingItems <= 0 && page > 1) {
        setPage((value) => value - 1);
      } else {
        await loadQuestions();
      }
    } catch {
      setError("Не удалось удалить вопрос");
    } finally {
      setDeletingId(null);
    }
  }

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const firstShown = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastShown = Math.min(page * limit, total);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          <p className="mt-1 text-sm text-muted">Показано {firstShown}-{lastShown} из {total}</p>
        </div>
        <div className="text-sm font-semibold text-muted">Страница {page} из {totalPages}</div>
      </div>

      <div className="apple-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full border-collapse text-left">
            <thead className="border-b border-black/[0.06] bg-black/[0.025] text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-4 font-bold">Image Preview</th>
                <th className="px-5 py-4 font-bold">Название фильма</th>
                <th className="px-5 py-4 font-bold">Тема</th>
                <th className="px-5 py-4 font-bold">Категория</th>
                <th className="px-5 py-4 text-right font-bold">Управления</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">Загружаем вопросы...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-danger">{error}</td>
                </tr>
              )}
              {!loading && !error && data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">Пока нет добавленных вопросов</td>
                </tr>
              )}
              {!loading && !error && data?.items.map((question) => (
                <tr key={question.id} className="transition hover:bg-primary/[0.04]">
                  <td className="px-5 py-4">
                    {question.mediaType === "image" && question.mediaFilePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={question.mediaFilePath} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-soft" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-black/[0.04] text-xs font-semibold text-muted">
                        {question.mediaType}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-foreground">{question.answer || "Без названия"}</td>
                  <td className="px-5 py-4 text-muted">{question.topicCard.title}</td>
                  <td className="px-5 py-4 text-muted">{getCategoryDisplayName(question.topicCard.quizType.type)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link href={`/topic/${question.topicCard.id}`} title="Просмотр" aria-label="Просмотр" className="rounded-full p-2 text-primary transition hover:bg-primary/10">
                        <Eye size={18} />
                      </Link>
                      <Link href={`/admin/questions/${question.id}`} title="Редактировать" aria-label="Редактировать" className="rounded-full p-2 text-warning transition hover:bg-warning/10">
                        <Pencil size={18} />
                      </Link>
                      <button
                        type="button"
                        title="Удалить"
                        aria-label="Удалить"
                        disabled={deletingId === question.id}
                        onClick={() => void deleteQuestion(question.id)}
                        className="rounded-full p-2 text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-black/[0.06] px-5 py-4 text-sm text-muted md:flex-row md:items-center">
          <span>Показано {firstShown}-{lastShown} из {total}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Назад
            </button>
            <span className="px-2 font-semibold">Страница {page} из {totalPages}</span>
            <button type="button" className="btn btn-ghost" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
              Вперёд
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestQuestionsTable() {
  return <QuestionsTable title="Последние добавленные вопросы" />;
}
