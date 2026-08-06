import Link from "next/link";
import { Turntable } from "./Turntable";
import { LandingSearch } from "./LandingSearch";
import { listRecentReleaseCovers } from "@/lib/services/collectionService";
import { listExploreGenres } from "@/lib/services/exploreService";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

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
    <div className="flex flex-1 flex-col items-center gap-12 px-6 py-12">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-room-dim">
          VinylOS
        </p>
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Every record you own,{" "}
          <em className="text-room-accent">down to the pressing.</em>
        </h1>
        <p className="max-w-md text-room-dim">
          Search a few thousand records, follow what your friends are spinning,
          and see your year in vinyl.
        </p>
        <LandingSearch genres={listExploreGenres()} />
      </div>

      <Turntable covers={covers} />

      <hr className="strobe-rule w-full max-w-2xl border-0" />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={signupHref}
          className="rounded-full bg-room-accent px-6 py-3 text-room-on-accent transition hover:opacity-90"
        >
          Sign up
        </Link>
        <Link
          href={loginHref}
          className="rounded-full px-4 py-3 text-room-dim transition hover:text-room-fg"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
