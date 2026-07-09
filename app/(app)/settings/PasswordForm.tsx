"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setPending(true);
    try {
      const { error: passwordError } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (passwordError) {
        setError(passwordError.message ?? "Could not change your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      <h2 className="text-lg font-medium">Password</h2>

      <label className="flex flex-col gap-1">
        <span className="text-zinc-600 dark:text-zinc-400">Current password</span>
        <input
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-zinc-600 dark:text-zinc-400">New password</span>
        <input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && !error && (
        <p className="text-sm text-green-600 dark:text-green-500">Password changed.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
