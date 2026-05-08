import { notFound, redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { QuestionForm } from "@/app/admin/_components/QuestionForm";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewQuestionPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) redirect("/admin");
  const [topic, topics] = await Promise.all([
    prisma.topicCard.findUnique({ where: { id: params.id } }),
    prisma.topicCard.findMany({ orderBy: { title: "asc" } })
  ]);
  if (!topic) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.04em] text-foreground">Новый вопрос</h1>
      <QuestionForm topics={topics} initialTopicId={topic.id} />
    </AdminLayout>
  );
}
