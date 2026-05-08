"use client";

import { motion } from "framer-motion";

export function ImageViewer({ src, title }: { src: string; title?: string | null }) {
  return (
    <div className="relative h-full min-h-[60vh] bg-black/70 p-3">
      <motion.img
        key={src}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        src={src}
        alt={title ?? "Вопрос"}
        className="mx-auto h-full max-h-[72vh] min-h-[60vh] w-full rounded-[20px] object-contain"
      />
    </div>
  );
}
