import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { QuestionsTable } from "@/app/admin/_components/LatestQuestionsTable";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";

export default function AdminQuestionsPage() {
  if (!isAdminAuthenticated()) redirect("/admin");

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Вопросы</h1>
          <p className="mt-1 text-sm text-muted">Все вопросы квиза с быстрым просмотром, редактированием и удалением.</p>
        </div>
        <Link href="/admin/questions/new" className="btn btn-primary">
          <Plus size={18} />
          Добавить новый вопрос
        </Link>
      </div>
      <QuestionsTable showHeader={false} />
    </AdminLayout>
  );
}
