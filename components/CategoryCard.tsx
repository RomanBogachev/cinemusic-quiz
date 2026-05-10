"use client";

import { motion } from "framer-motion";
import { ImageIcon, Music2, Video } from "lucide-react";
import Link from "next/link";
import type { CategoryMeta } from "@/lib/types";

const icons = {
  image: ImageIcon,
  music: Music2,
  video: Video
};

export function CategoryCard({ category, index }: { category: CategoryMeta; index: number }) {
  const Icon = icons[category.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
    >
      <Link
        href={`/category/${category.type}`}
        className="group relative block min-h-[310px] overflow-hidden rounded-[28px] border border-amber-100/20 bg-black/60 shadow-[0_24px_90px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-amber-100/30 hover:shadow-[0_34px_110px_rgba(0,0,0,0.62),0_0_42px_rgba(255,209,139,0.14)]"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${category.accent} opacity-70`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_12%,rgba(255,244,210,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.22))]" />
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-amber-200/10 blur-2xl transition group-hover:bg-amber-200/20" />
        <div className="relative flex h-full min-h-[310px] flex-col justify-between p-7 md:p-8">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-[0_16px_38px_rgba(0,0,0,0.28)] backdrop-blur-md ${category.iconClassName}`}>
            <Icon size={32} strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="max-w-[11ch] text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] text-white [text-shadow:0_10px_34px_rgba(0,0,0,0.65)] md:text-5xl">
              {category.displayName}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-amber-50/70">{category.description}</p>
          </div>
          <div className="mt-7 flex items-center text-sm font-bold uppercase tracking-[0.18em] text-amber-200">
            Выбрать
            <span className="ml-3 transition group-hover:translate-x-2">→</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
