"use client";

import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      onClick={() =>
        authClient.signIn.social({ provider: "google", callbackURL: "/collection" })
      }
      className="rounded-full bg-black px-6 py-3 text-white hover:bg-zinc-800"
    >
      Sign in with Google
    </button>
  );
}
