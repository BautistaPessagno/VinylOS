"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useUsernameSuggestions } from "@/lib/useUsernameSuggestions";

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950";

export function SettingsForm({
  name: initialName,
  username: initialUsername,
  email: initialEmail,
}: {
  name: string;
  username: string;
  email: string;
}) {
  const router = useRouter();
  const suggestionsListId = useId();

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const suggestions = useUsernameSuggestions(username);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const trimmedName = name.trim();
      const trimmedUsername = username.trim();
      if (trimmedName !== initialName || trimmedUsername !== initialUsername) {
        const { error: profileError } = await authClient.updateUser({
          name: trimmedName,
          username: trimmedUsername,
          displayUsername: trimmedUsername,
        });
        if (profileError) {
          setError(profileError.message ?? "Could not update your profile.");
          return;
        }
      }

      const trimmedEmail = email.trim();
      if (trimmedEmail !== initialEmail) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: trimmedEmail,
        });
        if (emailError) {
          setError(emailError.message ?? "Could not update your email.");
          return;
        }
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      <h2 className="text-lg font-medium">Profile</h2>

      <label className="flex flex-col gap-1">
        <span className="text-zinc-600 dark:text-zinc-400">Display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-zinc-600 dark:text-zinc-400">Username</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          list={suggestionsListId}
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          className={inputClass}
        />
      </label>
      <datalist id={suggestionsListId}>
        {suggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

      <label className="flex flex-col gap-1">
        <span className="text-zinc-600 dark:text-zinc-400">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && !error && (
        <p className="text-sm text-green-600 dark:text-green-500">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
