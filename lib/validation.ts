import { z } from "zod";

export const mediaTypeSchema = z.enum(["image", "audio", "video"]);

export const topicSchema = z.object({
  title: z.string().trim().min(2, "Название слишком короткое"),
  description: z.string().trim().min(2, "Описание слишком короткое"),
  quizTypeId: z.string().min(1, "Выберите тип категории"),
  coverImage: z.string().trim().optional().nullable()
});

const questionBaseSchema = z.object({
    topicCardId: z.string().min(1),
    title: z.string().trim().optional().nullable(),
    answer: z.string().trim().min(1, "Ответ обязателен"),
    mediaType: mediaTypeSchema,
    mediaFilePath: z.string().trim().min(1, "Медиафайл обязателен"),
    audioStart: z.coerce.number().min(0).optional().nullable(),
    audioEnd: z.coerce.number().min(0).optional().nullable(),
    audioOnePath: z.string().trim().optional().nullable(),
    audioThreePath: z.string().trim().optional().nullable(),
    audioFivePath: z.string().trim().optional().nullable(),
    audioTenPath: z.string().trim().optional().nullable(),
    videoStart: z.coerce.number().min(0).optional().nullable(),
    videoEnd: z.coerce.number().min(0).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional()
  });

function refineQuestionTiming(value: Partial<z.infer<typeof questionBaseSchema>>, ctx: z.RefinementCtx) {
  if (value.mediaType === "audio" && value.audioStart == null) {
    ctx.addIssue({ code: "custom", path: ["audioStart"], message: "Укажите старт аудио" });
  }
  if (value.mediaType === "video") {
    if (value.videoStart == null) {
      ctx.addIssue({ code: "custom", path: ["videoStart"], message: "Укажите старт видео" });
    }
    if (value.videoEnd == null) {
      ctx.addIssue({ code: "custom", path: ["videoEnd"], message: "Укажите конец видео" });
    }
    if (value.videoStart != null && value.videoEnd != null && value.videoEnd <= value.videoStart) {
      ctx.addIssue({ code: "custom", path: ["videoEnd"], message: "Конец должен быть больше старта" });
    }
    if (value.videoStart != null && value.videoEnd != null && value.videoEnd - value.videoStart < 0.5) {
      ctx.addIssue({ code: "custom", path: ["videoEnd"], message: "Фрагмент должен длиться не меньше 0.5 сек" });
    }
  }
}

export const questionSchema = questionBaseSchema
  .superRefine((value, ctx) => {
    refineQuestionTiming(value, ctx);
  });

export const questionUpdateSchema = questionBaseSchema.partial().superRefine((value, ctx) => {
  refineQuestionTiming(value, ctx);
});

export const uploadKindSchema = z.enum(["image", "audio", "video", "cover"]);

export const quizKindSchema = z.enum(["photo", "music", "video"]);
