export default function DashboardLoading() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading your overview</span>
      <div className="h-10 w-60 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
      <div className="grid gap-5 md:grid-cols-[1.6fr,1fr]">
        <div className="surface h-96 animate-pulse" />
        <div className="surface h-96 animate-pulse" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="surface h-32 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
