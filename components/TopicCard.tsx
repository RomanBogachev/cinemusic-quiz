"use client";

import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";
import Link from "next/link";

type TopicCardProps = {
  id: string;
  title: string;
  description: string;
  coverImage?: string | null;
  questionCount?: number;
  index?: number;
};

export function TopicCard({ id, title, description, coverImage, questionCount, index = 0 }: TopicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.42 }}
    >
      <Link
        href={`/topic/${id}`}
        className="group relative block overflow-hidden rounded-[24px] border border-black/[0.06] bg-white/85 shadow-soft backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-floating"
      >
        <div className="aspect-[16/8] w-full overflow-hidden bg-cinema-graphite">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-white to-success/10">
              <Clapperboard className="text-primary/55" size={54} strokeWidth={1.4} />
            </div>
          )}
        </div>
        <div className="p-6 text-center">
          <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-primary/70">
            {questionCount ?? 0} вопросов
          </div>
          <h3 className="text-center text-2xl font-bold leading-tight tracking-[-0.03em] text-foreground">{title}</h3>
          <p className="mx-auto mt-3 min-h-[3.5rem] max-w-sm text-center text-sm leading-6 text-muted">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}
