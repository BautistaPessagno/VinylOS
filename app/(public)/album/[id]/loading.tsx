export default function AlbumLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading album">
      <div className="h-5 w-40 rounded sheen" />
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="aspect-square w-full max-w-xs shrink-0 rounded sheen" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-8 w-64 max-w-full rounded sheen" />
          <div className="h-6 w-48 max-w-full rounded sheen" />
          <div className="h-4 w-40 rounded sheen" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full sheen" />
            <div className="h-6 w-16 rounded-full sheen" />
          </div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="h-11 w-full rounded-lg sheen sm:w-36" />
            <div className="h-11 w-full rounded-lg sheen sm:w-24" />
          </div>
        </div>
      </div>
      <div className="flex max-w-2xl flex-col gap-2">
        <div className="h-6 w-40 rounded sheen" />
        <div className="h-20 rounded sheen" />
      </div>
    </div>
  );
}
