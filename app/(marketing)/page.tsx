import Link from "next/link";
import { Turntable } from "./Turntable";
import { LandingSearch } from "./LandingSearch";
import { listRecentReleaseCovers } from "@/lib/services/collectionService";
import { listExploreGenres } from "@/lib/services/exploreService";
import authRedirects from "@/lib/authRedirects";
import { JsonLd } from "@/app/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

const { getSafeAuthCallbackPath } = authRedirects;

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "es",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: absoluteUrl("/explore?q={search_term_string}"),
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(next);
  const loginHref =
    callbackURL === "/collection" ? "/login" : `/login?next=${encodeURIComponent(callbackURL)}`;
  const signupHref =
    callbackURL === "/collection"
      ? "/login?mode=signup"
      : `/login?mode=signup&next=${encodeURIComponent(callbackURL)}`;

  const covers = await listRecentReleaseCovers(12);

  return (
    <div className="flex flex-1 flex-col items-center gap-12 px-6 py-6 sm:py-8">
      <JsonLd data={websiteJsonLd} />
      <header className="flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-room-fg"
        >
          VinylOS
        </Link>
        <nav aria-label="Acciones de cuenta" className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href={loginHref}
            className="rounded-full px-3 py-2 text-sm text-room-dim transition hover:text-room-fg"
          >
            Iniciar sesión
          </Link>
          <Link
            href={signupHref}
            className="rounded-full border border-room-rule px-3 py-2 text-sm text-room-fg transition hover:border-room-accent hover:text-room-accent"
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Cada disco que tienes,{" "}
          <em className="text-room-accent">hasta la edición exacta.</em>
        </h1>
        <p className="max-w-md text-room-dim">
          Busca entre miles de discos, sigue lo que escuchan tus amigos y mira tu
          año en vinilo.
        </p>
        <LandingSearch genres={listExploreGenres()} />
        <Link
          href="/explore"
          className="rounded-full bg-room-accent px-7 py-3 font-medium text-room-on-accent transition hover:opacity-90"
        >
          Explorar discos
        </Link>
      </div>

      <Turntable covers={covers} />

      <hr className="strobe-rule w-full max-w-2xl border-0" />
    </div>
  );
}
