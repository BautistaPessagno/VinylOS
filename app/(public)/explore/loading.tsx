/**
 * Every genre switch hits Last.fm, so without this the page sat blank while it
 * did. The shape is known — chips over a grid — so this is a skeleton, not a
 * spinner.
 */
export default function ExploreLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="sheen h-8 w-32 rounded" />
      <div className="mx-auto h-13 w-full max-w-3xl sheen rounded-2xl" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sheen h-9 w-20 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="sheen aspect-square w-full rounded" />
            <div className="sheen h-4 w-3/4 rounded" />
            <div className="sheen h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
