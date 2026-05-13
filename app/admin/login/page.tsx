import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/app/admin/_components/AdminLoginForm";
import { CinemaBackground } from "@/components/CinemaBackground";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLoginPage() {
  if (isAdminAuthenticated()) redirect("/admin");

  const adminCount = await prisma.adminUser.count();

  return (
    <main className="min-h-screen px-5 py-8">
      <CinemaBackground />
      <AdminLoginForm setupMode={adminCount === 0} />
    </main>
  );
}
