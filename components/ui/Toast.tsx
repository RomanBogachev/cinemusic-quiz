export function Toast({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "error" }) {
  const color = tone === "success" ? "text-success" : tone === "error" ? "text-danger" : "text-foreground";
  return <div className={`apple-glass rounded-2xl px-4 py-3 shadow-floating ${color}`}>{children}</div>;
}
