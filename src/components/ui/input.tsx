import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500/50",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
