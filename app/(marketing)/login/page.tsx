import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(next);
  const initialMode = mode === "signup" ? "signup" : "signin";
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(callbackURL);

  // Shared "Invite friends" links point at /users/:id — give the invitee context
  // instead of a bare login form.
  const isInviteLink = callbackURL.startsWith("/users/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {isInviteLink && (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            You&apos;ve been invited to see a vinyl collection on VinylOS. Log in or
            create a free account to view it.
          </p>
        )}
        <AuthForm callbackURL={callbackURL} initialMode={initialMode} />
      </div>
    </div>
  );
}
