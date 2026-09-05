export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden h-screen bg-surface ring-1 ring-hairline lg:block" />
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-hairline bg-surface/95 px-5 backdrop-blur">
          <div className="h-4 w-40 animate-pulse rounded bg-canvas" />
          <div className="h-7 w-44 animate-pulse rounded-md bg-canvas" />
        </header>

        <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 py-6">
          <div className="animate-pulse space-y-5" aria-label="Loading bookings">
            <div className="rounded-lg bg-surface p-5 shadow-ambient ring-1 ring-hairline">
              <div className="h-4 w-48 rounded bg-canvas" />
              <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="h-12 rounded bg-canvas" />
                <div className="h-12 rounded bg-canvas" />
                <div className="h-12 rounded bg-canvas" />
                <div className="h-12 rounded bg-canvas" />
              </div>
            </div>
            <div className="h-4 w-64 rounded bg-canvas" />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="h-64 rounded-lg bg-surface ring-1 ring-hairline" />
              <div className="h-64 rounded-lg bg-surface ring-1 ring-hairline" />
            </div>
            <div className="h-72 rounded-lg bg-surface ring-1 ring-hairline" />
            <div className="h-56 rounded-lg bg-surface ring-1 ring-hairline" />
          </div>
        </main>
      </div>
    </div>
  );
}
