import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { DeleteButton } from "@/app/admin/_components/DeleteButton";
import { TopicForm } from "@/app/admin/_components/TopicForm";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { prisma } from "@/lib/prisma";

export default async function EditTopicPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const [quizTypes, topic] = await Promise.all([
    prisma.quizType.findMany({ orderBy: { type: "asc" } }),
    prisma.topicCard.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } }
    })
  ]);
  if (!topic) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-foreground">Редактирование темы</h1>
          <p className="mt-2 text-muted">{topic.title}</p>
        </div>
        <Link href={`/admin/topics/${topic.id}/questions/new`} className="btn btn-primary">
          <Plus size={18} />
          Добавить вопрос
        </Link>
      </div>
      <TopicForm quizTypes={quizTypes} topic={topic} />
      <section className="mt-8">
        <h2 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-foreground">Вопросы</h2>
        <div className="space-y-3">
          {topic.questions.map((question, index) => (
            <div key={question.id} className="apple-card flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
                  #{index + 1} · {question.mediaType}
                </div>
                <Link href={`/admin/questions/${question.id}`} className="mt-1 block text-xl font-bold tracking-[-0.02em] text-foreground hover:text-primary">
                  {question.title || question.answer}
                </Link>
                <p className="mt-1 max-w-xl truncate text-sm text-muted">{question.mediaFilePath}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/questions/${question.id}`} className="btn btn-ghost">
                  Редактировать
                </Link>
                <DeleteButton endpoint={`/api/questions/${question.id}`} />
              </div>
            </div>
          ))}
          {topic.questions.length === 0 && <div className="apple-card p-6 text-muted">Вопросов пока нет.</div>}
        </div>
      </section>
    </AdminLayout>
  );
}
