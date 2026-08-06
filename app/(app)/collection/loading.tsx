export default function CollectionLoading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading collection">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 rounded sheen" />
        <div className="h-11 w-36 rounded-lg sheen" />
      </div>
      <div className="h-11 w-full max-w-md rounded sheen" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded border border-room-rule p-3">
            <div className="aspect-square w-full rounded sheen" />
            <div className="h-4 w-3/4 rounded sheen" />
            <div className="h-3 w-1/2 rounded sheen" />
          </div>
        ))}
      </div>
    </div>
  );
}
