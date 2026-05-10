import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { DeleteButton } from "@/app/admin/_components/DeleteButton";
import { TopicForm } from "@/app/admin/_components/TopicForm";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { getCategoryBadgeClassName } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function EditTopicPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const [quizTypes, topic] = await Promise.all([
    prisma.quizType.findMany({ orderBy: { type: "asc" } }),
    prisma.topicCard.findUnique({
      where: { id: params.id },
      include: { quizType: true, questions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
    })
  ]);
  if (!topic) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Редактирование темы</h1>
          <p className="mt-1 text-sm text-muted">{topic.title}</p>
        </div>
        <Link href={`/admin/topics/${topic.id}/questions/new`} className="btn btn-primary">
          <Plus size={18} />
          Добавить вопрос
        </Link>
      </div>
      <TopicForm quizTypes={quizTypes} topic={topic} />
      <section className="mt-6">
        <h2 className="mb-3 text-2xl font-bold tracking-[-0.03em] text-foreground">Вопросы</h2>
        <div className="space-y-3">
          {topic.questions.map((question, index) => (
            <div key={question.id} className="apple-card flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
              <div>
                <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(topic.quizType.type)}`}>
                  #{index + 1} · {question.mediaType}
                </div>
                <Link href={`/admin/questions/${question.id}`} className="mt-1 block text-lg font-bold tracking-[-0.02em] text-foreground hover:text-primary">
                  {question.answer || question.title || "Без названия"}
                </Link>
                <p className="mt-0.5 max-w-xl truncate text-xs text-muted">{question.mediaFilePath}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/questions/${question.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warning transition hover:bg-warning/10" title="Редактировать" aria-label="Редактировать">
                  <Pencil size={18} />
                </Link>
                <DeleteButton endpoint={`/api/questions/${question.id}`} iconOnly confirmText="Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить." />
              </div>
            </div>
          ))}
          {topic.questions.length === 0 && <div className="apple-card p-5 text-sm text-muted">Вопросов пока нет.</div>}
        </div>
      </section>
    </AdminLayout>
  );
}
