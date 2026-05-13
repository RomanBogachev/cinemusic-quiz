"use client";

import { Home, LayoutDashboard, Library, ListChecks, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/admin",
    label: "Главная",
    icon: LayoutDashboard,
    exact: true,
    className: "border-sky-200 bg-sky-500/12 text-sky-700 hover:border-sky-300 hover:bg-sky-500/18 focus-visible:ring-sky-300/35",
    activeClassName: "border-sky-400 bg-sky-500 text-white shadow-[0_10px_28px_rgba(14,165,233,0.22)]"
  },
  {
    href: "/admin/questions",
    label: "Вопросы",
    icon: ListChecks,
    className: "border-violet-200 bg-violet-500/12 text-violet-700 hover:border-violet-300 hover:bg-violet-500/18 focus-visible:ring-violet-300/35",
    activeClassName: "border-violet-400 bg-violet-600 text-white shadow-[0_10px_28px_rgba(124,58,237,0.22)]"
  },
  {
    href: "/admin/topics",
    label: "Управлять темами",
    icon: Library,
    className: "border-emerald-200 bg-emerald-500/12 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-500/18 focus-visible:ring-emerald-300/35",
    activeClassName: "border-emerald-400 bg-emerald-600 text-white shadow-[0_10px_28px_rgba(16,185,129,0.22)]"
  },
  {
    href: "/",
    label: "Перейти на сайт",
    icon: Home,
    exact: true,
    external: true,
    className: "border-amber-200 bg-amber-400/18 text-amber-800 hover:border-amber-300 hover:bg-amber-400/28 focus-visible:ring-amber-300/40",
    activeClassName: "border-amber-400 bg-amber-500 text-white shadow-[0_10px_28px_rgba(245,158,11,0.22)]"
  },
  {
    href: "/admin/profile",
    label: "Администраторы",
    icon: UserRound,
    className: "border-fuchsia-200 bg-fuchsia-500/12 text-fuchsia-700 hover:border-fuchsia-300 hover:bg-fuchsia-500/18 focus-visible:ring-fuchsia-300/35",
    activeClassName: "border-fuchsia-400 bg-fuchsia-600 text-white shadow-[0_10px_28px_rgba(192,38,211,0.22)]"
  }
];

export function AdminNav() {
  const pathname = usePathname();
  const baseButtonClassName =
    "inline-flex items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition duration-180 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4";

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const linkClassName = `${baseButtonClassName} ${active ? item.activeClassName : item.className}`;
        return (
          <Link
            key={item.href}
            className={linkClassName}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
          >
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
      <form action="/api/admin/logout" method="post">
        <button
          className={`${baseButtonClassName} border-rose-200 bg-rose-500/12 text-rose-700 hover:border-rose-300 hover:bg-rose-500/18 focus-visible:ring-rose-300/35`}
          type="submit"
        >
          <LogOut size={17} />
          Выйти
        </button>
      </form>
    </nav>
  );
}
