import { AdminLayout } from "@/components/AdminLayout";
import { AdminLoginForm } from "@/app/admin/_components/AdminLoginForm";
import { LatestQuestionsTable } from "@/app/admin/_components/LatestQuestionsTable";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  if (!isAdminAuthenticated()) {
    return (
      <main className="min-h-screen px-5 py-8">
        <CinemaBackground />
        <AdminLoginForm />
      </main>
    );
  }

  await ensureCategories();
  const [topics, questions] = await Promise.all([prisma.topicCard.count(), prisma.question.count()]);

  return (
    <AdminLayout>
      <CinemaBackground />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="apple-card p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">Темы</div>
          <div className="mt-1 text-5xl font-extrabold tracking-[-0.04em] text-foreground">{topics}</div>
        </div>
        <div className="apple-card p-5">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">Вопросы</div>
          <div className="mt-1 text-5xl font-extrabold tracking-[-0.04em] text-foreground">{questions}</div>
        </div>
      </section>
      <LatestQuestionsTable />
    </AdminLayout>
  );
}
