import Link from "next/link";
import { listNeighborhoods, listStores } from "@/lib/services/storeService";
import { StoreCard } from "./StoreCard";
import { StoresMap } from "./StoresMap";

export const metadata = {
  title: "Disquerías en AMBA",
  description:
    "Dónde comprar vinilos en Buenos Aires: disquerías de CABA y Gran Buenos Aires, con dirección, horarios y contacto.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; neighborhood?: string }>;
}) {
  const { q, neighborhood } = await searchParams;
  const [stores, neighborhoods] = await Promise.all([
    listStores({ q, neighborhood }),
    listNeighborhoods(),
  ]);

  const mapPins = stores.map((store) => ({
    slug: store.slug,
    name: store.name,
    addressLine: store.addressLine,
    neighborhood: store.neighborhood,
    lat: store.lat,
    lng: store.lng,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Disquerías</h1>
        <p className="mt-1 text-sm text-room-dim">
          Dónde comprar vinilos en CABA y Gran Buenos Aires.
        </p>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, barrio o dirección"
          className="min-w-0 flex-1 rounded-lg border border-room-rule bg-room-surface px-3 py-2 text-sm text-room-fg"
        />
        <select
          name="neighborhood"
          defaultValue={neighborhood ?? ""}
          className="rounded-lg border border-room-rule bg-room-surface px-3 py-2 text-sm text-room-fg"
        >
          <option value="">Todos los barrios</option>
          {neighborhoods.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-room-accent px-4 py-2 text-sm font-medium text-room-on-accent hover:opacity-90"
        >
          Buscar
        </button>
      </form>

      {stores.length === 0 ? (
        <p className="text-sm text-room-dim">
          No encontramos disquerías con ese filtro.{" "}
          <Link href="/stores" className="underline hover:text-room-accent">
            Ver todas
          </Link>
          .
        </p>
      ) : (
        <>
          <StoresMap stores={mapPins} />
          <ul className="flex flex-col gap-3">
            {stores.map((store) => (
              <StoreCard key={store.slug} store={store} />
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-room-dim">
        Mapa: OpenFreeMap · datos parciales de{" "}
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
