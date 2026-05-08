export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary ${className}`}>
      {children}
    </span>
  );
}
