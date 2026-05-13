import { redirect } from "next/navigation";
import { QuestionsFlow } from "@/app/admin/_components/QuestionsFlow";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { prisma } from "@/lib/prisma";

const categoryOrder: Record<string, number> = {
  photo: 0,
  video: 1,
  music: 2
};

export default async function AdminQuestionsPage() {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const [categories, topics] = await Promise.all([
    prisma.quizType.findMany({ orderBy: { type: "asc" } }),
    prisma.topicCard.findMany({ include: { quizType: true }, orderBy: { title: "asc" } })
  ]);

  const serializedCategories = categories
    .map((category) => ({ id: category.id, type: category.type, name: category.name }))
    .sort((left, right) => (categoryOrder[left.type] ?? 99) - (categoryOrder[right.type] ?? 99));
  const serializedTopics = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    coverImage: topic.coverImage,
    quizTypeId: topic.quizTypeId,
    quizType: {
      id: topic.quizType.id,
      type: topic.quizType.type,
      name: topic.quizType.name
    }
  }));

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Вопросы</h1>
          <p className="mt-1 text-sm text-muted">Выберите тип вопроса, затем тему и добавьте медиа-вопрос.</p>
        </div>
      </div>
      <QuestionsFlow categories={serializedCategories} topics={serializedTopics} />
    </AdminLayout>
  );
}
