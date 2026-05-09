import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { AdminNav } from "@/app/admin/_components/AdminNav";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="apple-glass mb-8 flex flex-col justify-between gap-4 rounded-[28px] p-5 shadow-soft md:flex-row md:items-center">
          <Link href="/admin" className="flex items-center gap-3 text-xl font-bold text-foreground">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Clapperboard size={24} />
            </span>
            Админка квиза
          </Link>
          <AdminNav />
        </header>
        {children}
      </div>
    </main>
  );
}
