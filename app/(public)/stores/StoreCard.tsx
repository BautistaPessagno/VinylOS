import Link from "next/link";
import type { StoreListItem } from "@/lib/services/storeService";

export function StoreCard({ store }: { store: StoreListItem }) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;

  return (
    <li className="rounded-xl border border-room-rule bg-room-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/stores/${store.slug}`}
            className="font-medium text-room-fg hover:text-room-accent"
          >
            {store.name}
          </Link>
          <p className="mt-0.5 truncate text-sm text-room-dim">
            {store.addressLine} · {store.neighborhood}
          </p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-room-rule px-3 py-1.5 text-sm text-room-fg hover:text-room-accent"
        >
          Cómo llegar
        </a>
      </div>

      {store.openingHours && (
        <p className="mt-2 text-sm text-room-dim">{store.openingHours}</p>
      )}

      {(store.tags?.length ?? 0) > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {store.tags?.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-room-sunk px-2 py-0.5 text-xs text-room-dim"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
