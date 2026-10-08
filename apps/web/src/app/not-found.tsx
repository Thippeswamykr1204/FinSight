import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-20 text-center">
      <p className="eyebrow">A little off course · 404</p>
      <h2 className="mt-5 font-display text-5xl italic">
        Let’s find your way back.
      </h2>
      <p className="mt-5 text-sm text-[var(--ink-soft)]">
        That page does not exist. Your financial picture is right where you left
        it.
      </p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Return to overview</Link>
      </Button>
    </section>
  );
}
