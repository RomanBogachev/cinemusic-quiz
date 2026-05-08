"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-5 backdrop-blur-sm">
      <div className="apple-card w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-foreground">{title}</h2>
            {description && <p className="mt-1 text-muted">{description}</p>}
          </div>
          <button aria-label="Закрыть" className="btn btn-ghost h-10 w-10 p-0" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
