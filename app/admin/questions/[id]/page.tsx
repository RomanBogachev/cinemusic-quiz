import { notFound, redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { QuestionForm } from "@/app/admin/_components/QuestionForm";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditQuestionPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) redirect("/admin");
  const [question, topics] = await Promise.all([
    prisma.question.findUnique({ where: { id: params.id } }),
    prisma.topicCard.findMany({ include: { quizType: true }, orderBy: { title: "asc" } })
  ]);
  if (!question) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <h1 className="mb-5 text-3xl font-extrabold tracking-[-0.04em] text-foreground">Редактирование вопроса</h1>
      <QuestionForm topics={topics} question={question} />
    </AdminLayout>
  );
}
