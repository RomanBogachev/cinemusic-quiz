import type { QuestionMediaType, QuizTypeSlug } from "@/lib/types";

export const MEDIA_TYPE_LABELS: Record<QuestionMediaType, string> = {
  image: "Фото",
  audio: "Аудио",
  video: "Видео"
};

export function getMediaTypeFromQuizType(quizType: string): QuestionMediaType {
  switch (quizType as QuizTypeSlug | string) {
    case "photo":
    case "image":
    case "guess_photo":
      return "image";
    case "music":
    case "audio":
    case "guess_music":
      return "audio";
    case "video":
    case "movie":
    case "guess_video":
      return "video";
    default:
      return "image";
  }
}

export function getMediaTypeDescription(quizTypeName: string, mediaType: QuestionMediaType) {
  return `Эта тема относится к категории «${quizTypeName}», поэтому тип вопроса — ${MEDIA_TYPE_LABELS[mediaType].toLowerCase()}.`;
}
