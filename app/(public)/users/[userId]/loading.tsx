export default function UserProfileLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-label="Loading profile">
      <div className="flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-8 w-56 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-28 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-2 flex gap-2">
          <div className="h-6 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="h-8 w-48 rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="aspect-square w-full rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
}
