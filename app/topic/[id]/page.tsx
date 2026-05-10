import Link from "next/link";
import { notFound } from "next/navigation";
import { CinemaBackground } from "@/components/CinemaBackground";
import { QuestionPlayer } from "@/components/QuestionPlayer";
import { prisma } from "@/lib/prisma";
import type { QuestionMediaType } from "@/lib/types";

function isQuestionMediaType(value: string): value is QuestionMediaType {
  return value === "image" || value === "audio" || value === "video";
}

export default async function TopicPage({ params }: { params: { id: string } }) {
  const topic = await prisma.topicCard.findUnique({
    where: { id: params.id },
    include: {
      quizType: true,
      questions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
    }
  });

  if (!topic) notFound();

  const questions = topic.questions
    .filter((question) => isQuestionMediaType(question.mediaType))
    .map((question) => ({ ...question, mediaType: question.mediaType as QuestionMediaType }));

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-white md:px-10 md:py-8">
      <CinemaBackground variant="theater" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <Link href={`/category/${topic.quizType.type}`} className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-100/70 transition hover:text-amber-100">
          ← К темам
        </Link>
        <div className="mt-7">
          <QuestionPlayer topicTitle={topic.title} questions={questions} />
        </div>
      </div>
    </main>
  );
}
