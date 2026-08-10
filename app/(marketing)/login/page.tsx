import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

export const metadata: Metadata = {
  title: "Iniciar sesión",
  // Crawlable so this is actually seen, but never a search result itself.
  robots: { index: false, follow: true },
};

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
  // instead of a bare login form. Profiles are publicly readable; login is for actions.
  const isInviteLink = callbackURL.startsWith("/users/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {isInviteLink && (
          <p className="rounded-lg border border-room-rule bg-room-surface p-4 text-center text-sm text-room-dim">
            Te han invitado a una colección de vinilos en VinylOS. Inicia sesión o
            crea una cuenta gratis para seguir, guardar y coleccionar.
          </p>
        )}
        <AuthForm callbackURL={callbackURL} initialMode={initialMode} />
      </div>
    </div>
  );
}
