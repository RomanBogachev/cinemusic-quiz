import type { CategoryMeta, QuizTypeSlug } from "@/lib/types";

export const CATEGORY_META: CategoryMeta[] = [
  {
    type: "photo",
    name: "УГАДАЙ ПО ФОТО",
    displayName: "Фото",
    description: "Кадры, силуэты и детали, которые вспоминаются за секунду до ответа.",
    icon: "image",
    accent: "from-amber-500/25 via-rose-700/20 to-black"
  },
  {
    type: "music",
    name: "УГАДАЙ ПО МУЗЫКЕ",
    displayName: "Музыка",
    description: "Саундтреки и темы: от одной секунды до уверенного узнавания.",
    icon: "music",
    accent: "from-yellow-400/20 via-orange-700/20 to-black"
  },
  {
    type: "video",
    name: "УГАДАЙ ПО ВИДЕО",
    displayName: "Видео",
    description: "Короткие сцены, клипы и фрагменты для домашнего киноэкрана.",
    icon: "video",
    accent: "from-red-500/20 via-amber-700/15 to-black"
  }
];

export function getCategoryMeta(type: string): CategoryMeta | undefined {
  return CATEGORY_META.find((category) => category.type === type);
}

export function getCategoryDisplayName(type: string): string {
  return getCategoryMeta(type)?.displayName ?? "Неизвестно";
}

export function isQuizType(value: string): value is QuizTypeSlug {
  return ["photo", "music", "video"].includes(value);
}
