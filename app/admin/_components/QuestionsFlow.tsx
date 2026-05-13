"use client";

import { ImageIcon, Music, Plus, Video } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QuestionForm } from "@/app/admin/_components/QuestionForm";
import { QuestionsTable } from "@/app/admin/_components/LatestQuestionsTable";
import { getCategoryBadgeClassName, getCategoryCardClassName, getCategoryDisplayName } from "@/lib/categories";

type AdminCategory = {
  id: string;
  type: string;
  name: string;
};

type AdminTopic = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  quizTypeId: string;
  quizType: AdminCategory;
};

type QuestionsFlowProps = {
  categories: AdminCategory[];
  topics: AdminTopic[];
};

const categoryIcons = {
  photo: ImageIcon,
  video: Video,
  music: Music
};

const categoryOrder: Record<string, number> = {
  photo: 0,
  video: 1,
  music: 2
};

export function QuestionsFlow({ categories, topics }: QuestionsFlowProps) {
  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => (categoryOrder[left.type] ?? 99) - (categoryOrder[right.type] ?? 99)),
    [categories]
  );
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [formVersion, setFormVersion] = useState(0);
  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedCategory = sortedCategories.find((category) => category.type === selectedCategoryType);
  const filteredTopics = useMemo(
    () => topics.filter((topic) => topic.quizType.type === selectedCategoryType),
    [selectedCategoryType, topics]
  );
  const selectedTopic = filteredTopics.find((topic) => topic.id === selectedTopicId);

  function selectCategory(type: string) {
    setSelectedCategoryType(type);
    setSelectedTopicId("");
    setSuccessMessage(null);
    setFormVersion((value) => value + 1);
  }

  function selectTopic(topicId: string) {
    setSelectedTopicId(topicId);
    setSuccessMessage(null);
    setFormVersion((value) => value + 1);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-[-0.03em] text-foreground">1. Выберите тип вопроса</h2>
          <p className="mt-1 text-sm text-muted">Тип медиа будет зафиксирован по выбранной категории.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {sortedCategories.map((category) => {
            const Icon = categoryIcons[category.type as keyof typeof categoryIcons] ?? ImageIcon;
            const selected = selectedCategoryType === category.type;
            return (
              <button
                key={category.id}
                type="button"
                className={`apple-card border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-floating focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${getCategoryCardClassName(category.type)} ${selected ? "ring-4 ring-primary/20" : ""}`}
                onClick={() => selectCategory(category.type)}
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${getCategoryBadgeClassName(category.type)}`}>
                  <Icon size={21} />
                </div>
                <div className="text-2xl font-extrabold tracking-[-0.04em] text-foreground">{getCategoryDisplayName(category.type)}</div>
                <div className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(category.type)}`}>
                  {selected ? "Выбрано" : "Выбрать"}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCategory && (
        <section className="grid gap-3">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.03em] text-foreground">2. Выберите тему</h2>
              <p className="mt-1 text-sm text-muted">Показаны только темы категории «{getCategoryDisplayName(selectedCategory.type)}».</p>
            </div>
            <Link href="/admin/topics/new" className="btn btn-ghost">
              <Plus size={17} />
              Создать тему
            </Link>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="apple-card p-5 text-sm text-muted">
              В этой категории пока нет тем. Сначала создайте тему в разделе “Управлять темами”.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredTopics.map((topic) => {
                const selected = selectedTopicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    className={`apple-card flex gap-3 border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-floating focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${getCategoryCardClassName(topic.quizType.type)} ${selected ? "ring-4 ring-primary/20" : ""}`}
                    onClick={() => selectTopic(topic.id)}
                  >
                    {topic.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={topic.coverImage} alt="" className="h-16 w-28 shrink-0 rounded-2xl object-cover shadow-soft" />
                    ) : (
                      <div className={`h-16 w-28 shrink-0 rounded-2xl border ${getCategoryBadgeClassName(topic.quizType.type)}`} />
                    )}
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getCategoryBadgeClassName(topic.quizType.type)}`}>
                        {getCategoryDisplayName(topic.quizType.type)}
                      </span>
                      <div className="mt-1 truncate text-lg font-bold tracking-[-0.03em] text-foreground">{topic.title}</div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{topic.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {selectedTopic && (
        <section className="grid gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.03em] text-foreground">3. Добавьте вопрос</h2>
            <p className="mt-1 text-sm text-muted">Тема и тип медиа зафиксированы. После сохранения форма очистится для следующего вопроса.</p>
          </div>
          {successMessage && <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">{successMessage}</div>}
          <QuestionForm
            key={`${selectedTopic.id}-${formVersion}`}
            topics={[selectedTopic]}
            lockedTopicId={selectedTopic.id}
            onSaved={() => {
              setSuccessMessage("Вопрос сохранён.");
              setQuestionsRefreshKey((value) => value + 1);
              setFormVersion((value) => value + 1);
            }}
          />
          <QuestionsTable
            key={selectedTopic.id}
            topicId={selectedTopic.id}
            refreshKey={questionsRefreshKey}
            title="Вопросы выбранной темы"
            description={`Список вопросов темы «${selectedTopic.title}».`}
          />
        </section>
      )}
    </div>
  );
}
