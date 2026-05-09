import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";
import { getCategoryDisplayName } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function NewQuestionTopicPickerPage() {
  if (!isAdminAuthenticated()) redirect("/admin");

  const topics = await prisma.topicCard.findMany({
    include: { quizType: true, _count: { select: { questions: true } } },
    orderBy: { title: "asc" }
  });

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-foreground">Добавить новый вопрос</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Выберите тему. Тип медиа для вопроса будет выбран автоматически по категории темы.
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="apple-card p-6 text-muted">
          Тем пока нет. Сначала создайте тему в разделе управления темами.
        </div>
      ) : (
        <div className="grid gap-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/admin/topics/${topic.id}/questions/new`}
              className="apple-card flex flex-col justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-floating md:flex-row md:items-center"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">{getCategoryDisplayName(topic.quizType.type)}</div>
                <div className="mt-1 text-2xl font-bold tracking-[-0.03em] text-foreground">{topic.title}</div>
                <p className="mt-1 text-sm text-muted">{topic._count.questions} вопросов</p>
              </div>
              <span className="btn btn-primary w-full md:w-auto">
                <Plus size={18} />
                Добавить вопрос
              </span>
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
