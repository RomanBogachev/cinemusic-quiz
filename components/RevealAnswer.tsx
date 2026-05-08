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
      <button type="button" className="media-control-button media-control-button-primary w-full sm:w-auto" onClick={() => setShown((value) => !value)}>
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
            <div className="rounded-3xl border border-primary/12 bg-primary/5 p-6 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-foreground shadow-soft">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
