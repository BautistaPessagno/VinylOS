import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VinylOS",
    short_name: "VinylOS",
    description:
      "Registra tu colección de vinilos, mira tus estadísticas y descubre qué comprar después.",
    start_url: "/collection",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
