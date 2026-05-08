export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 py-8 md:px-10 md:py-12 ${className}`}>{children}</div>;
}
