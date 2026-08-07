import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/services/storeService";

// Deduped across generateMetadata and the page render within one request.
const getStoreCached = cache(getStoreBySlug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreCached(slug);
  if (!store) return { title: "Disquería no encontrada" };

  const title = `${store.name} — Disquería en ${store.neighborhood}`;
  const description = `${store.name}, ${store.addressLine}, ${store.neighborhood}. Dónde comprar vinilos en Buenos Aires.`;
  return { title, description, openGraph: { title, description } };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreCached(slug);
  if (!store) notFound();

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/stores" className="text-sm text-room-dim hover:text-room-accent">
        ← Disquerías
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        <p className="mt-1 text-room-dim">
          {store.addressLine} · {store.neighborhood}, {store.city}
        </p>
      </div>

      {store.openingHours && (
        <section>
          <h2 className="text-sm font-medium">Horarios</h2>
          <p className="mt-1 text-sm text-room-dim">{store.openingHours}</p>
        </section>
      )}

      {(store.tags?.length ?? 0) > 0 && (
        <ul className="flex flex-wrap gap-1.5">
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

      <div className="flex flex-wrap gap-2">
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-room-accent px-4 py-2 text-sm font-medium text-room-on-accent hover:opacity-90"
        >
          Cómo llegar
        </a>
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="rounded-lg border border-room-rule px-4 py-2 text-sm text-room-fg hover:text-room-accent"
          >
            {store.phone}
          </a>
        )}
        {store.website && (
          <a
            href={store.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-room-rule px-4 py-2 text-sm text-room-fg hover:text-room-accent"
          >
            Sitio web
          </a>
        )}
        {store.instagram && (
          <a
            href={`https://instagram.com/${store.instagram}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-room-rule px-4 py-2 text-sm text-room-fg hover:text-room-accent"
          >
            @{store.instagram}
          </a>
        )}
      </div>

      <p className="text-xs text-room-dim">
        Datos parciales de{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-room-accent"
        >
          © OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  );
}
