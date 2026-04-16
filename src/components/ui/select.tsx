import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              "flex h-9 w-full appearance-none rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 pr-11 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500 focus:ring-red-500/50",
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
