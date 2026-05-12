import { notFound, redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
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
      include: { quizType: true }
    })
  ]);
  if (!topic) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Редактирование темы</h1>
          <p className="mt-1 text-sm text-muted">Измените название, описание или обложку темы.</p>
        </div>
      </div>
      <TopicForm quizTypes={quizTypes} topic={topic} />
    </AdminLayout>
  );
}
