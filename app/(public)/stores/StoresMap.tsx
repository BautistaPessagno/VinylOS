"use client";

import { useEffect, useRef } from "react";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/** Minimal fields the map needs — keeps the client payload small. */
export type MapStorePin = {
  slug: string;
  name: string;
  addressLine: string;
  neighborhood: string;
  lat: number;
  lng: number;
};

/**
 * Raster basemap via CARTO CDN (OSM data). Free for reasonable traffic with
 * attribution — more reliable than remote vector style URLs that can fail to
 * paint tiles while still leaving the MapLibre chrome and HTML markers working.
 */
function basemapStyle(dark: boolean): StyleSpecification {
  const tiles = dark
    ? [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ]
    : [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ];

  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: "carto",
        type: "raster",
        source: "carto",
      },
    ],
  };
}

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
 * MapLibre map of store pins. Basemap: CARTO free raster tiles (OSM-derived).
 * Not tile.openstreetmap.org (app usage prohibited) and not Google Maps JS.
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
      if (cancelled || !containerRef.current) return;

      const nextMap = new maplibregl.Map({
        container,
        style: basemapStyle(prefersDark()),
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

      const placeMarkers = () => {
        if (!map || cancelled) return;
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
      };

      // Wait for style/tiles so the canvas has a real size before fitting bounds.
      if (map.loaded()) placeMarkers();
      else map.once("load", placeMarkers);
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
