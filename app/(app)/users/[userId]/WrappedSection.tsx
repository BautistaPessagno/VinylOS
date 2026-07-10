import type { WrappedStats } from "@/lib/services/wrappedService";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-zinc-200 p-4">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <div className="h-2 flex-1 rounded bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-2 rounded bg-green-500"
          style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-zinc-500">{count}</span>
    </div>
  );
}

export function WrappedSection({ stats }: { stats: WrappedStats }) {
  if (stats.totalRecords === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Your Wrapped</h2>
        <p className="text-zinc-500">Add some records to your collection to see your stats.</p>
      </div>
    );
  }

  const maxGenreCount = Math.max(...stats.genreDistribution.map((g) => g.count), 1);
  const maxCountryCount = Math.max(...stats.countryDistribution.map((c) => c.count), 1);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Your Wrapped</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total records" value={stats.totalRecords.toString()} />
        <StatCard
          label="Favorite decade"
          value={stats.topDecade ? `${stats.topDecade.decade}s` : "—"}
        />
        <StatCard label="Top label" value={stats.topLabel?.label ?? "—"} />
        <StatCard label="Top artist" value={stats.topArtist?.artist ?? "—"} />
      </div>

      {stats.genreDistribution.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Genres</h3>
          {stats.genreDistribution.map((g) => (
            <Bar key={g.genre} label={g.genre} count={g.count} max={maxGenreCount} />
          ))}
        </div>
      )}

      {stats.countryDistribution.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Countries</h3>
          {stats.countryDistribution.map((c) => (
            <Bar key={c.country} label={c.country} count={c.count} max={maxCountryCount} />
          ))}
        </div>
      )}
    </div>
  );
}
