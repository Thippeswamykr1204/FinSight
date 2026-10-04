import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-950">
      <p className="text-7xl font-black text-slate-700">404</p>
      <h2 className="text-xl font-semibold text-slate-200">Page not found</h2>
      <p className="text-sm text-slate-400">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
