import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="p-8 text-center">
      <Inbox className="mx-auto text-muted" size={34} />
      <h2 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-foreground">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-muted">{description}</p>}
    </Card>
  );
}
