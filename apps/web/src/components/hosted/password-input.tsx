"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<ComponentPropsWithoutRef<"input">, "type">
>(function PasswordInput({ className, disabled, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <span className="relative block">
      <input
        {...props}
        ref={ref}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn(className, "w-full pr-12")}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-[var(--ink-soft)] transition-colors duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mint-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] motion-reduce:transition-none"
      >
        <Icon size={18} aria-hidden="true" />
      </button>
    </span>
  );
});
