import { CategoryCard } from "@/components/CategoryCard";
import { CinemaBackground } from "@/components/CinemaBackground";
import { CATEGORY_META } from "@/lib/categories";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 text-white md:px-10">
      <CinemaBackground variant="theater" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center">
        <div className="mx-auto mb-14 w-full max-w-6xl text-center">
          <div className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-amber-200/80">Домашний квиз</div>
          <h1 className="text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] text-white [text-shadow:0_12px_46px_rgba(0,0,0,0.75)] md:text-7xl">
            Квиз для вечера с друзьями
          </h1>
          <p className="mx-auto mt-7 max-w-4xl text-lg leading-8 text-amber-50/70 md:text-xl">
            Выберите формат, откройте тематическую карточку и показывайте вопросы на ноутбуке или телевизоре. Ответ раскрывается только по команде ведущего.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {CATEGORY_META.map((category, index) => (
            <CategoryCard key={category.type} category={category} index={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
