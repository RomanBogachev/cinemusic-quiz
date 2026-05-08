"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({ endpoint, redirectTo }: { endpoint: string; redirectTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm("Удалить без восстановления?")) return;
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
    <button type="button" onClick={() => void remove()} disabled={loading} className="btn btn-ghost text-red-200">
      <Trash2 size={17} />
      {loading ? "Удаляю..." : "Удалить"}
    </button>
  );
}
