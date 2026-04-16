import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, indicatorClassName, ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div
        ref={ref}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-700", className)}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            percentage >= 100
              ? "bg-red-500"
              : percentage >= 80
              ? "bg-amber-500"
              : "bg-emerald-500",
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
