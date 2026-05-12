import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { DeleteButton } from "@/app/admin/_components/DeleteButton";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureCategories } from "@/lib/ensureCategories";
import { getCategoryBadgeClassName, getCategoryCardClassName, getCategoryDisplayName } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminTopicsPage() {
  if (!isAdminAuthenticated()) redirect("/admin");
  await ensureCategories();
  const topics = await prisma.topicCard.findMany({
    include: { quizType: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Темы</h1>
          <p className="mt-1 text-sm text-muted">Создавайте, редактируйте и удаляйте темы квиза.</p>
        </div>
        <Link href="/admin/topics/new" className="btn btn-primary">
          <Plus size={18} />
          Новая тема
        </Link>
      </div>
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className={`apple-card flex flex-col justify-between gap-4 overflow-hidden border p-4 md:flex-row md:items-center ${getCategoryCardClassName(topic.quizType.type)}`}>
            <div className="flex min-w-0 items-center gap-3">
              {topic.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topic.coverImage} alt="" className="h-14 w-24 rounded-2xl object-cover shadow-soft" />
              ) : (
                <div className={`h-14 w-24 rounded-2xl border ${getCategoryBadgeClassName(topic.quizType.type)}`} />
              )}
              <div className="min-w-0">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(topic.quizType.type)}`}>
                  {getCategoryDisplayName(topic.quizType.type)}
                </span>
                <Link href={`/admin/topics/${topic.id}`} className="mt-1 block truncate text-xl font-bold tracking-[-0.03em] text-foreground hover:text-primary">
                  {topic.title}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">{topic.description}</p>
              </div>
            </div>
            <div className="flex gap-2 self-end md:self-auto">
              <Link className="inline-flex h-9 w-9 items-center justify-center rounded-full text-warning transition hover:bg-warning/10" href={`/admin/topics/${topic.id}`} title="Редактировать" aria-label="Редактировать">
                <Pencil size={18} />
              </Link>
              <DeleteButton endpoint={`/api/topics/${topic.id}`} iconOnly />
            </div>
          </div>
        ))}
        {topics.length === 0 && <div className="apple-card p-5 text-sm text-muted">Тем пока нет.</div>}
      </div>
    </AdminLayout>
  );
}
