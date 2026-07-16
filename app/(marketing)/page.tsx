import Link from "next/link";
import { VinylCarousel } from "./VinylCarousel";
import { listRecentReleaseCovers } from "@/lib/services/collectionService";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

const VALUE_PROPS = [
  "Track every record you own, down to the pressing.",
  "See yearly stats with Wrapped.",
  "Follow friends and browse their collections.",
];

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

  const covers = await listRecentReleaseCovers(16);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 py-12">
      <VinylCarousel covers={covers} />

      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">VinylOS</h1>
        <p className="max-w-md text-zinc-600">
          Track your vinyl collection, see your stats, and find what to buy next.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-500">
          {VALUE_PROPS.map((prop) => (
            <li key={prop}>{prop}</li>
          ))}
        </ul>
        <div className="flex gap-3">
          {/* Sign up is the primary CTA; Log in is the quieter secondary. */}
          <Link
            href={signupHref}
            className="rounded-full bg-black px-6 py-3 text-white hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
          >
            Sign up
          </Link>
          <Link
            href={loginHref}
            className="rounded-full border border-zinc-300 px-6 py-3 hover:border-zinc-500 active:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
          >
            Log in
          </Link>
        </div>
      </div>

      <VinylCarousel covers={[...covers].reverse()} />
    </div>
  );
}
