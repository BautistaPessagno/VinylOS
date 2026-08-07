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
        className="text-xs text-room-dim underline hover:text-room-fg"
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
        className="rounded border border-room-rule px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-room-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-room-accent px-2 py-1 text-xs text-room-on-accent disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
