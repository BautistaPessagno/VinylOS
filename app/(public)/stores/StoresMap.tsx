"use client";

import { useEffect, useRef } from "react";

/** Minimal fields the map needs — keeps the client payload small. */
export type MapStorePin = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  lat: number;
  lng: number;
};

const LIGHT_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function createMarkerElement(name: string): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", name);
  el.style.cssText = [
    "width:16px",
    "height:16px",
    "padding:0",
    "border-radius:9999px",
    "border:2px solid var(--room-on-accent, #fff)",
    "background:var(--room-accent, #be3a21)",
    "box-shadow:0 1px 4px rgba(0,0,0,0.35)",
    "cursor:pointer",
  ].join(";");
  return el;
}

function popupHtml(store: MapStorePin): string {
  const href = `/stores/${encodeURIComponent(store.slug)}`;
  // Inline styles: popups live outside React and the app stylesheet.
  return [
    `<div style="font:14px/1.4 system-ui,sans-serif;color:#16141b;max-width:220px">`,
    `<a href="${href}" style="font-weight:600;color:#be3a21;text-decoration:none">${escapeHtml(store.name)}</a>`,
    `<p style="margin:4px 0 0;color:#5c5669;font-size:12px">${escapeHtml(store.addressLine)} · ${escapeHtml(store.neighborhood)}</p>`,
    `</div>`,
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * MapLibre map of store pins. Tiles from OpenFreeMap (OSM data, free, no API key) —
 * not tile.openstreetmap.org (app usage prohibited) and not Google Maps JS.
 */
export function StoresMap({
  stores,
  className,
}: {
  stores: MapStorePin[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable key so filter changes rebuild the map without identity thrash.
  const pinsKey = stores.map((s) => `${s.slug}:${s.lat}:${s.lng}`).join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container || stores.length === 0) return;

    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    const markers: import("maplibre-gl").Marker[] = [];

    (async () => {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) return;

      const nextMap = new maplibregl.Map({
        container,
        style: prefersDark() ? DARK_STYLE : LIGHT_STYLE,
        center: [stores[0].lng, stores[0].lat],
        zoom: stores.length === 1 ? 14 : 11,
        attributionControl: { compact: true },
      });
      if (cancelled) {
        nextMap.remove();
        return;
      }
      map = nextMap;
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      const bounds = new maplibregl.LngLatBounds();
      for (const store of stores) {
        bounds.extend([store.lng, store.lat]);
        const marker = new maplibregl.Marker({
          element: createMarkerElement(store.name),
        })
          .setLngLat([store.lng, store.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 18, maxWidth: "240px" }).setHTML(
              popupHtml(store),
            ),
          )
          .addTo(map);
        markers.push(marker);
      }

      if (stores.length > 1) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
      }

      map.resize();
    })();

    return () => {
      cancelled = true;
      for (const marker of markers) marker.remove();
      map?.remove();
    };
    // pinsKey captures store identity; stores is read for the same snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional pin fingerprint
  }, [pinsKey]);

  if (stores.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa de disquerías"
      className={
        className ??
        "h-72 w-full overflow-hidden rounded-xl border border-room-rule sm:h-96"
      }
    />
  );
}
