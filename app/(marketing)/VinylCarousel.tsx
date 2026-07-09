type Cover = { releaseId: number; title: string; coverUrl: string };
const MIN_MARQUEE_ITEMS = 16;

function VinylDisc({ cover }: { cover: Cover | null }) {
  return (
    <div className="relative h-28 w-28 shrink-0 rounded-full bg-zinc-900 shadow-md animate-spin-slow sm:h-36 sm:w-36">
      <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_2px,transparent_4px)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-zinc-200 sm:h-16 sm:w-16">
          {cover?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.coverUrl} alt={cover.title} className="h-full w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Horizontally-scrolling strip of recent covers on spinning vinyl discs. Purely decorative. */
export function VinylCarousel({ covers }: { covers: Cover[] }) {
  let segment: Array<Cover | null> = Array.from({ length: MIN_MARQUEE_ITEMS }, () => null);

  if (covers.length > 0) {
    segment = [...covers];
    while (segment.length < MIN_MARQUEE_ITEMS) {
      segment.push(...covers);
    }
  }

  return (
    <div className="w-full overflow-hidden py-4" aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((segmentIndex) => (
          <div key={segmentIndex} className="flex shrink-0 gap-6 pr-6">
            {segment.map((cover, i) => (
              <VinylDisc
                key={cover ? `${segmentIndex}-${cover.releaseId}-${i}` : `${segmentIndex}-${i}`}
                cover={cover}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
