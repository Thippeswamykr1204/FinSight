"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, type ReactNode } from "react";

export function FinanceDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[85dvh] w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] border bg-[var(--surface)] p-6 shadow-xl">
          <Dialog.Title className="pr-8 text-xl font-semibold tracking-tight">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[var(--ink-soft)]">
            {description}
          </Dialog.Description>
          <Dialog.Close
            className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[var(--surface-muted)]"
            aria-label="Close dialog"
          >
            <X size={18} />
          </Dialog.Close>
          <div className="mt-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label id={id} className="grid gap-2 text-xs font-semibold">
      {label}
      {children}
    </label>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mb-5 mt-2 max-w-md text-sm text-[var(--ink-soft)]">
        {description}
      </p>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="page-title mt-3">{title}</h2>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}
export function FormError({ error }: { error: string }) {
  return error ? (
    <p
      role="alert"
      className="rounded-xl border border-red-400/40 bg-red-100/30 p-3 text-sm text-[var(--danger)]"
    >
      {error}
    </p>
  ) : null;
}
