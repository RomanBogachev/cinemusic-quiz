import { redirect } from "next/navigation";
import { AdminUsersManager } from "@/app/admin/_components/AdminUsersManager";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";

export default function AdminProfilePage() {
  if (!isAdminAuthenticated()) redirect("/admin");

  return (
    <AdminLayout>
      <CinemaBackground />
      <section className="mb-5">
        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-foreground">Пользователи админки</h1>
        <p className="mt-2 text-muted">Все пользователи имеют доступ администратора. Пароли хранятся в PostgreSQL только как bcrypt hash.</p>
      </section>
      <AdminUsersManager />
    </AdminLayout>
  );
}
