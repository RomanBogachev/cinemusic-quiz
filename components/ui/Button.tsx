import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "media" | "mediaPrimary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const variants = {
  primary: "bg-primary text-white border-primary/20 hover:bg-[#006DE5]",
  secondary: "bg-black/[0.05] text-foreground border-black/[0.06] hover:bg-black/[0.08]",
  ghost: "bg-transparent text-primary border-transparent hover:bg-primary/10",
  danger: "bg-danger/10 text-danger border-danger/10 hover:bg-danger/15",
  media: "media-control-button",
  mediaPrimary: "media-control-button media-control-button-primary"
};

const sizes = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-12 px-6 text-lg"
};

export function Button({ className = "", variant = "secondary", size = "md", loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98] focus-visible:apple-focus disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
}
