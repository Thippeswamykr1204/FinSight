"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700/50">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-400">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
