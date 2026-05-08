import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Загрузка" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl bg-white/70 p-6 text-muted">
      <Loader2 className="animate-spin" size={20} />
      {label}
    </div>
  );
}
