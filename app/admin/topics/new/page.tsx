import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { TopicForm } from "@/app/admin/_components/TopicForm";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { prisma } from "@/lib/prisma";

export default async function NewTopicPage() {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const quizTypes = await prisma.quizType.findMany({ orderBy: { type: "asc" } });

  return (
    <AdminLayout>
      <CinemaBackground />
      <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.04em] text-foreground">Новая тема</h1>
      <TopicForm quizTypes={quizTypes} />
    </AdminLayout>
  );
}
