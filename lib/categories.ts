import type { CategoryMeta, QuizTypeSlug } from "@/lib/types";

export const CATEGORY_META: CategoryMeta[] = [
  {
    type: "photo",
    name: "УГАДАЙ ПО ФОТО",
    displayName: "Фото",
    description: "Кадры, силуэты и детали, которые вспоминаются за секунду до ответа.",
    icon: "image",
    accent: "from-sky-500/25 via-cyan-600/15 to-black",
    badgeClassName: "border-sky-400/30 bg-sky-500/15 text-sky-700",
    cardClassName: "border-sky-400/25 bg-sky-50/45",
    iconClassName: "text-sky-600"
  },
  {
    type: "music",
    name: "УГАДАЙ ПО МУЗЫКЕ",
    displayName: "Музыка",
    description: "Саундтреки и темы: от одной секунды до уверенного узнавания.",
    icon: "music",
    accent: "from-violet-500/25 via-fuchsia-600/15 to-black",
    badgeClassName: "border-violet-400/30 bg-violet-500/15 text-violet-700",
    cardClassName: "border-violet-400/25 bg-violet-50/45",
    iconClassName: "text-violet-600"
  },
  {
    type: "video",
    name: "УГАДАЙ ПО ВИДЕО",
    displayName: "Видео",
    description: "Короткие сцены, клипы и фрагменты для домашнего киноэкрана.",
    icon: "video",
    accent: "from-amber-500/25 via-orange-600/15 to-black",
    badgeClassName: "border-amber-400/35 bg-amber-500/15 text-amber-700",
    cardClassName: "border-amber-400/30 bg-amber-50/55",
    iconClassName: "text-amber-600"
  }
];

export function getCategoryMeta(type: string): CategoryMeta | undefined {
  return CATEGORY_META.find((category) => category.type === type);
}

export function getCategoryDisplayName(type: string): string {
  return getCategoryMeta(type)?.displayName ?? "Неизвестно";
}

export function getCategoryBadgeClassName(type: string): string {
  return getCategoryMeta(type)?.badgeClassName ?? "border-black/[0.08] bg-black/[0.04] text-muted";
}

export function getCategoryCardClassName(type: string): string {
  return getCategoryMeta(type)?.cardClassName ?? "border-black/[0.06] bg-white/80";
}

export function getCategoryIconClassName(type: string): string {
  return getCategoryMeta(type)?.iconClassName ?? "text-muted";
}

export function isQuizType(value: string): value is QuizTypeSlug {
  return ["photo", "music", "video"].includes(value);
}
