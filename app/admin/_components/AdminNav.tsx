"use client";

import { Home, LayoutDashboard, Library, ListChecks, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Главная", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Вопросы", icon: ListChecks },
  { href: "/admin/topics", label: "Управлять темами", icon: Library },
  { href: "/", label: "Перейти на сайт", icon: Home, exact: true },
  { href: "/admin/profile", label: "Профиль", icon: UserRound }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} className={`btn btn-ghost ${active ? "bg-primary/10 text-primary" : ""}`} href={item.href}>
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
      <form action="/api/admin/logout" method="post">
        <button className="btn btn-ghost" type="submit">
          <LogOut size={17} />
          Выйти
        </button>
      </form>
    </nav>
  );
}
