import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input focus-visible:apple-focus ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input focus-visible:apple-focus ${className}`} {...props} />;
}
