import Link from "next/link";

export function AuthRequiredCard() {
  return (
    <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center px-4 py-12 text-center">
      <div className="w-full rounded-[32px] border border-amber-100/18 bg-black/68 p-7 text-white shadow-[0_28px_110px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl md:p-10">
        <div className="mx-auto mb-5 inline-flex rounded-full border border-amber-100/20 bg-amber-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-100/80">
          Cinemusic Quiz
        </div>
        <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">Требуется авторизация</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-amber-50/72 md:text-lg">
          Для просмотра и запуска квизов войдите в админку. Игра предназначена для оффлайн-режима с ведущим.
        </p>
        <Link
          href="/admin/login"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-amber-100/30 bg-amber-300 px-7 text-sm font-extrabold uppercase tracking-[0.14em] text-slate-950 shadow-[0_16px_42px_rgba(251,191,36,0.26)] transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/45 active:translate-y-0"
        >
          Войти
        </Link>
      </div>
    </section>
  );
}
