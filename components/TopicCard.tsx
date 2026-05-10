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
        className="group relative block overflow-hidden rounded-[24px] border border-amber-100/15 bg-black/60 shadow-[0_24px_90px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-amber-100/30 hover:shadow-[0_34px_110px_rgba(0,0,0,0.62),0_0_42px_rgba(255,209,139,0.14)]"
      >
        <div className="aspect-[16/8] w-full overflow-hidden bg-cinema-graphite">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,216,145,0.16),rgba(67,81,122,0.14)_42%,rgba(0,0,0,0.74))]">
              <Clapperboard className="text-amber-100/70" size={54} strokeWidth={1.4} />
            </div>
          )}
        </div>
        <div className="p-6 text-center">
          <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-amber-200/80">
            {questionCount ?? 0} вопросов
          </div>
          <h3 className="text-center text-2xl font-bold leading-tight tracking-[-0.03em] text-white">{title}</h3>
          <p className="mx-auto mt-3 min-h-[3.5rem] max-w-sm text-center text-sm leading-6 text-amber-50/70">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}
