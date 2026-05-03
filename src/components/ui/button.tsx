import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "button-glow inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium",
        variant === "primary" && "bg-ink text-white hover:bg-slate-900",
        variant === "secondary" && "bg-amber-100 text-amber-950 hover:bg-amber-200",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
        props.disabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    />
  );
}

