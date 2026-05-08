import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

export function Card({ className = "", hoverable, ...props }: CardProps) {
  return (
    <div
      className={`apple-card ${hoverable ? "transition duration-200 hover:-translate-y-0.5 hover:shadow-floating" : ""} ${className}`}
      {...props}
    />
  );
}
