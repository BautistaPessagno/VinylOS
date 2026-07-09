import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInButton } from "./SignInButton";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(next);
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(callbackURL);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">VinylOS</h1>
      <p className="max-w-md text-zinc-600">
        Track your vinyl collection, see your stats, and find what to buy next.
      </p>
      <SignInButton callbackURL={callbackURL} />
    </div>
  );
}
