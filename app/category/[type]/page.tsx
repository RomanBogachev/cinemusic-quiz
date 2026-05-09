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
    <main className="min-h-screen px-5 py-8 md:px-10">
      <CinemaBackground />
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary hover:text-primary/75">
          ← На главную
        </Link>
        <header className="mb-10 mt-8">
          <h1 className="text-5xl font-extrabold leading-none tracking-[-0.04em] text-foreground md:text-7xl">{meta.displayName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{meta.description}</p>
        </header>
        {topics.length === 0 ? (
          <div className="glass rounded-[28px] p-8 text-center">
            <h2 className="text-3xl font-bold text-foreground">Пока нет карточек</h2>
            <p className="mt-3 text-muted">Создайте первую тему в админке.</p>
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
