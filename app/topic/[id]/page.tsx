import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthRequiredCard } from "@/components/AuthRequiredCard";
import { CinemaBackground } from "@/components/CinemaBackground";
import { QuestionPlayer } from "@/components/QuestionPlayer";
import { getCurrentAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { QuestionMediaType } from "@/lib/types";

function isQuestionMediaType(value: string): value is QuestionMediaType {
  return value === "image" || value === "audio" || value === "video";
}

export default async function TopicPage({ params }: { params: { id: string } }) {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return (
      <main className="relative min-h-screen overflow-hidden px-5 py-8 text-white md:px-10">
        <CinemaBackground variant="theater" />
        <AuthRequiredCard />
      </main>
    );
  }

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
    <main className="relative min-h-screen overflow-hidden text-white">
      <CinemaBackground variant="theater" />
      <div className="relative z-10 min-h-screen px-4 py-4 md:px-8">
        <Link href={`/category/${topic.quizType.type}`} className="absolute left-4 top-4 z-30 text-sm font-semibold uppercase tracking-[0.18em] text-amber-100/70 transition hover:text-amber-100 md:left-8">
          ← К темам
        </Link>
        <QuestionPlayer topicTitle={topic.title} questions={questions} />
      </div>
    </main>
  );
}
