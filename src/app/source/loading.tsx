export default function Loading() {
  return (
    <div className="space-y-5" aria-label="Loading bookings">
      <div className="rounded-lg bg-surface p-5 shadow-ambient ring-1 ring-hairline">
        <div className="h-4 w-48 animate-pulse rounded bg-canvas" />
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="h-12 animate-pulse rounded bg-canvas" />
          <div className="h-12 animate-pulse rounded bg-canvas" />
          <div className="h-12 animate-pulse rounded bg-canvas" />
          <div className="h-12 animate-pulse rounded bg-canvas" />
        </div>
      </div>

      <div className="h-4 w-64 animate-pulse rounded bg-canvas" />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-surface ring-1 ring-hairline" />
        <div className="h-64 animate-pulse rounded-lg bg-surface ring-1 ring-hairline" />
      </div>

      <div className="h-72 animate-pulse rounded-lg bg-surface ring-1 ring-hairline" />

      <div className="h-56 animate-pulse rounded-lg bg-surface ring-1 ring-hairline" />
    </div>
  );
}
