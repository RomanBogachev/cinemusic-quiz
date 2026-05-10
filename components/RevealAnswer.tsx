"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

export function RevealAnswer({ answer, resetKey }: { answer: string; resetKey: string | number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
  }, [resetKey]);

  return (
    <div className="w-full">
      <button
        type="button"
        className="media-control-button w-full !border-amber-200/70 !bg-[linear-gradient(135deg,rgba(255,210,125,0.96),rgba(255,126,66,0.94))] !text-black shadow-[0_16px_48px_rgba(255,145,65,0.32),0_8px_30px_rgba(0,0,0,0.35)] sm:w-auto"
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        {shown ? "Скрыть ответ" : "Показать ответ"}
      </button>
      <AnimatePresence initial={false}>
        {shown && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            className="mt-5 overflow-hidden"
          >
            <div className="rounded-3xl border border-amber-100/30 bg-black/60 p-6 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-amber-50 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_38px_rgba(255,195,104,0.16)] backdrop-blur-xl">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
