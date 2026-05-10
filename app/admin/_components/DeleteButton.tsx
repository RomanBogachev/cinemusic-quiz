"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteButtonProps = {
  endpoint: string;
  redirectTo?: string;
  iconOnly?: boolean;
  confirmText?: string;
};

export function DeleteButton({ endpoint, redirectTo, iconOnly = false, confirmText = "Удалить без восстановления?" }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm(confirmText)) return;
    setLoading(true);
    await fetch(endpoint, { method: "DELETE" });
    setLoading(false);
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={loading}
      title="Удалить"
      aria-label="Удалить"
      className={iconOnly
        ? "inline-flex h-9 w-9 items-center justify-center rounded-full text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
        : "btn btn-ghost text-danger"}
    >
      <Trash2 size={iconOnly ? 18 : 17} />
      {!iconOnly && (loading ? "Удаляю..." : "Удалить")}
    </button>
  );
}
