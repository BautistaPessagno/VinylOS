export default function ArtistLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-label="Loading artist">
      <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-6 rounded-2xl bg-zinc-100 p-6 sm:flex-row sm:items-center dark:bg-zinc-900">
        <div className="h-36 w-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 w-64 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-16 max-w-2xl rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="aspect-[3/4] rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
