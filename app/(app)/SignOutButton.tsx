"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.push("/") },
        })
      }
      className={`text-left ${className ?? "text-sm text-zinc-600 hover:text-black"}`}
    >
      Sign out
    </button>
  );
}
