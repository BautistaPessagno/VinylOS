export default function UserProfileLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading profile">
      <div className="flex flex-col gap-2 border-b border-room-rule pb-6">
        <div className="h-4 w-16 rounded sheen" />
        <div className="h-8 w-56 max-w-full rounded sheen" />
        <div className="h-4 w-28 rounded sheen" />
        <div className="mt-2 flex gap-2">
          <div className="h-6 w-20 rounded sheen" />
        </div>
      </div>
      <div className="h-8 w-48 rounded sheen" />
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
