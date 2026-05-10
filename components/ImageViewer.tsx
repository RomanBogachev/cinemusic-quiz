"use client";

import { motion } from "framer-motion";

export function ImageViewer({ src, title }: { src: string; title?: string | null }) {
  return (
    <div className="relative h-full overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_center,rgba(255,241,207,0.06),rgba(0,0,0,0.96)_62%)]">
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%,rgba(0,0,0,0.24))]" />
      <motion.img
        key={src}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        src={src}
        alt={title ?? "Вопрос"}
        className="relative mx-auto h-full w-full rounded-[18px] object-contain shadow-[0_22px_70px_rgba(0,0,0,0.58)]"
      />
    </div>
  );
}
