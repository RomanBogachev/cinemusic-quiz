export type QuizTypeSlug = "photo" | "music" | "video";
export type QuestionMediaType = "image" | "audio" | "video";
export type QuizKindType = QuizTypeSlug;

export type CategoryMeta = {
  type: QuizTypeSlug;
  name: string;
  displayName: string;
  description: string;
  icon: "image" | "music" | "video";
  accent: string;
};

export type ApiError = {
  error: string;
};
