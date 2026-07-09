"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Inline prompt shown in the account menu for accounts without a username
 * (e.g. legacy Google sign-ins). Lets them claim a handle so the app can show
 * `@username` instead of falling back to their display name.
 */
export function SetUsernamePrompt() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: updateError } = await authClient.updateUser({
        username: username.trim(),
        displayUsername: username.trim(),
      });
      if (updateError) {
        setError(updateError.message ?? "Could not set username.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-600 underline hover:text-black dark:text-zinc-400"
      >
        Set a username
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
        autoComplete="username"
        required
        minLength={3}
        maxLength={30}
        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
