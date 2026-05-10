import { ArrowLeft, Edit3, FileQuestion, Music, Video } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminLayout } from "@/components/AdminLayout";
import { CinemaBackground } from "@/components/CinemaBackground";
import { getCategoryBadgeClassName, getCategoryDisplayName } from "@/lib/categories";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function MediaPreview({ mediaType, mediaFilePath }: { mediaType: string; mediaFilePath: string }) {
  if (mediaType === "image") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-black shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaFilePath} alt="" className="max-h-[68vh] w-full object-contain" />
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className="overflow-hidden rounded-[28px] border border-black/[0.06] bg-black shadow-soft">
        <video src={mediaFilePath} controls className="max-h-[68vh] w-full bg-black" />
      </div>
    );
  }

  if (mediaType === "audio") {
    return (
      <div className="apple-card flex min-h-[260px] flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Music size={30} />
        </div>
        <audio src={mediaFilePath} controls className="w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="apple-card flex min-h-[260px] flex-col items-center justify-center gap-4 p-8 text-center text-muted">
      <FileQuestion size={34} />
      <p>Неподдерживаемый тип медиа</p>
    </div>
  );
}

export default async function QuestionPreviewPage({ params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) redirect("/admin");

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: { topicCard: { include: { quizType: true } } }
  });
  if (!question) notFound();

  return (
    <AdminLayout>
      <CinemaBackground />
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Link href="/admin/questions" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/75">
            <ArrowLeft size={16} />
            К вопросам
          </Link>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Просмотр вопроса</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{question.topicCard.title}</span>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(question.topicCard.quizType.type)}`}>
              {getCategoryDisplayName(question.topicCard.quizType.type)}
            </span>
          </div>
        </div>
        <Link href={`/admin/questions/${question.id}`} className="btn btn-primary">
          <Edit3 size={18} />
          Редактировать
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <MediaPreview mediaType={question.mediaType} mediaFilePath={question.mediaFilePath} />

        <aside className="apple-card h-fit space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Ответ</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-foreground">{question.answer || "Без названия"}</p>
          </div>
          {question.title && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Заголовок</p>
              <p className="mt-1 text-sm text-foreground">{question.title}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Медиа</p>
            <p className="mt-1 break-all text-sm text-muted">{question.mediaFilePath}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            {question.mediaType === "video" && <Video size={16} />}
            {question.mediaType === "audio" && <Music size={16} />}
            {question.mediaType !== "video" && question.mediaType !== "audio" && <FileQuestion size={16} />}
            <span>{question.mediaType}</span>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
