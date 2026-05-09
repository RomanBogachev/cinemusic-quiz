import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { DeleteButton } from "@/app/admin/_components/DeleteButton";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { getCategoryDisplayName } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminTopicsPage() {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const topics = await prisma.topicCard.findMany({
    include: { quizType: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-foreground">Темы</h1>
          <p className="mt-2 text-muted">Создавайте темы и наполняйте их вопросами.</p>
        </div>
        <Link href="/admin/topics/new" className="btn btn-primary">
          <Plus size={18} />
          Новая тема
        </Link>
      </div>
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className="apple-card flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary/70">{getCategoryDisplayName(topic.quizType.type)}</div>
              <Link href={`/admin/topics/${topic.id}`} className="mt-1 block text-2xl font-bold tracking-[-0.03em] text-foreground hover:text-primary">
                {topic.title}
              </Link>
              <p className="mt-1 text-sm text-muted">{topic._count.questions} вопросов</p>
            </div>
            <div className="flex gap-2">
              <Link className="btn btn-ghost" href={`/topic/${topic.id}`}>
                Открыть
              </Link>
              <Link className="btn btn-ghost" href={`/admin/topics/${topic.id}`}>
                Редактировать
              </Link>
              <DeleteButton endpoint={`/api/topics/${topic.id}`} />
            </div>
          </div>
        ))}
        {topics.length === 0 && <div className="apple-card p-6 text-muted">Тем пока нет.</div>}
      </div>
    </AdminLayout>
  );
}
