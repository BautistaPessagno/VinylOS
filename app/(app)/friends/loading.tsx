export default function FriendsLoading() {
  return (
    <div className="flex flex-col gap-8" aria-label="Cargando amigos">
      <div className="h-8 w-32 rounded sheen" />
      <div className="flex max-w-2xl gap-2">
        <div className="h-11 flex-1 rounded sheen" />
        <div className="h-11 w-24 rounded sheen" />
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex max-w-3xl flex-col gap-3">
          <div className="h-5 w-28 rounded sheen" />
          {Array.from({ length: 3 }, (_, row) => (
            <div
              key={row}
              className="flex items-center gap-3 rounded-lg border border-room-rule p-3"
            >
              <div className="h-10 w-10 rounded-full sheen" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-32 rounded sheen" />
                <div className="h-3 w-24 rounded sheen" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
