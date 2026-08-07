/** Streaming placeholder shown while recommendations load (and generate on first visit). */
export function RecommendationsSkeleton() {
  return (
    <div
      aria-hidden
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded border border-room-rule p-3"
        >
          <div className="aspect-square w-full rounded sheen" />
          <div className="h-4 w-3/4 rounded sheen" />
          <div className="h-3 w-1/2 rounded sheen" />
        </div>
      ))}
    </div>
  );
}
