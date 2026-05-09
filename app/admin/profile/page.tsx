import { redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";

export default function AdminProfilePage() {
  if (!isAdminAuthenticated()) redirect("/admin");

  return (
    <AdminLayout>
      <CinemaBackground />
      <section className="apple-card p-6 md:p-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-foreground">Профиль</h1>
          <p className="mt-3 text-muted">
            Сейчас пароль администратора задаётся переменной окружения <code className="rounded-lg bg-black/[0.06] px-2 py-1">ADMIN_PASSWORD</code>.
          </p>
          <div className="mt-6 rounded-3xl border border-black/[0.06] bg-black/[0.03] p-5 text-sm leading-6 text-muted">
            Чтобы сменить пароль, обновите <code>ADMIN_PASSWORD</code> в окружении или `.env`, затем перезапустите контейнер. Полноценная смена пароля из интерфейса потребует хранения hash пароля в базе или отдельном конфиге.
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
