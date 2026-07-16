export default function FriendsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-label="Loading friends">
      <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex max-w-2xl gap-2">
        <div className="h-11 flex-1 rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-11 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex max-w-3xl flex-col gap-3">
          <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          {Array.from({ length: 3 }, (_, row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
