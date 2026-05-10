import Link from "next/link";
import { notFound } from "next/navigation";
import { CinemaBackground } from "@/components/CinemaBackground";
import { TopicCard } from "@/components/TopicCard";
import { getCategoryMeta, isQuizType } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function CategoryPage({ params }: { params: { type: string } }) {
  if (!isQuizType(params.type)) notFound();
  const meta = getCategoryMeta(params.type);
  if (!meta) notFound();

  const topics = await prisma.topicCard.findMany({
    where: { quizType: { type: params.type } },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 text-white md:px-10">
      <CinemaBackground variant="theater" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-100/70 transition hover:text-amber-100">
          ← На главную
        </Link>
        <header className="mb-10 mt-8">
          <h1 className="text-5xl font-extrabold leading-none tracking-[-0.04em] text-white [text-shadow:0_12px_46px_rgba(0,0,0,0.75)] md:text-7xl">
            {meta.displayName}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-amber-50/70">{meta.description}</p>
        </header>
        {topics.length === 0 ? (
          <div className="rounded-[28px] border border-amber-100/15 bg-black/55 p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl">
            <h2 className="text-3xl font-bold text-white">Пока нет карточек</h2>
            <p className="mt-3 text-amber-50/70">Создайте первую тему в админке.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                id={topic.id}
                title={topic.title}
                description={topic.description}
                coverImage={topic.coverImage}
                questionCount={topic._count.questions}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
