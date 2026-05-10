"use client";

import { Eye, FileQuestion, ImageIcon, Music, Pencil, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCategoryBadgeClassName, getCategoryDisplayName } from "@/lib/categories";

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
  showHeader?: boolean;
};

function MediaPlaceholder({ mediaType }: { mediaType: string }) {
  const Icon = mediaType === "video" ? Video : mediaType === "audio" ? Music : mediaType === "image" ? ImageIcon : FileQuestion;
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.035] text-muted">
      <Icon size={18} />
    </div>
  );
}

export function QuestionsTable({ title = "Последние добавленные вопросы", description, limit = 10, showHeader = true }: QuestionsTableProps) {
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
    <section className={showHeader ? "mt-6" : "mt-0"}>
      {showHeader && (
        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            <p className="mt-1 text-xs text-muted">Показано {firstShown}-{lastShown} из {total}</p>
          </div>
          <div className="text-xs font-semibold text-muted">Страница {page} из {totalPages}</div>
        </div>
      )}

      <div className="apple-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-black/[0.025] text-[11px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Preview</th>
                <th className="px-4 py-3 font-bold">Ответ</th>
                <th className="px-4 py-3 font-bold">Тема</th>
                <th className="px-4 py-3 font-bold">Категория</th>
                <th className="px-4 py-3 text-right font-bold">Управление</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">Загружаем вопросы...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-danger">{error}</td>
                </tr>
              )}
              {!loading && !error && data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">Пока нет добавленных вопросов</td>
                </tr>
              )}
              {!loading && !error && data?.items.map((question) => (
                <tr key={question.id} className="transition hover:bg-primary/[0.04]">
                  <td className="px-4 py-2.5">
                    {question.mediaType === "image" && question.mediaFilePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={question.mediaFilePath} alt="" className="h-12 w-12 rounded-xl object-cover shadow-soft" />
                    ) : (
                      <MediaPlaceholder mediaType={question.mediaType} />
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{question.answer || "Без названия"}</td>
                  <td className="px-4 py-2.5 text-muted">{question.topicCard.title}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(question.topicCard.quizType.type)}`}>
                      {getCategoryDisplayName(question.topicCard.quizType.type)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Link href={`/topic/${question.topicCard.id}`} title="Просмотр" aria-label="Просмотр" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition hover:bg-primary/10">
                        <Eye size={18} />
                      </Link>
                      <Link href={`/admin/questions/${question.id}`} title="Редактировать" aria-label="Редактировать" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warning transition hover:bg-warning/10">
                        <Pencil size={18} />
                      </Link>
                      <button
                        type="button"
                        title="Удалить"
                        aria-label="Удалить"
                        disabled={deletingId === question.id}
                        onClick={() => void deleteQuestion(question.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-black/[0.06] px-4 py-3 text-sm text-muted md:flex-row md:items-center">
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
