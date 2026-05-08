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
        className="group relative block min-h-[310px] overflow-hidden rounded-[28px] border border-black/[0.06] bg-white/80 shadow-soft backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-floating"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,122,255,0.12),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,245,247,0.76))]" />
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/15" />
        <div className="relative flex h-full min-h-[310px] flex-col justify-between p-7 md:p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-primary shadow-soft">
            <Icon size={32} strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="max-w-[11ch] text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] text-foreground md:text-5xl">
              {category.name}
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-muted">{category.description}</p>
          </div>
          <div className="mt-7 flex items-center text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Выбрать
            <span className="ml-3 transition group-hover:translate-x-2">→</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
