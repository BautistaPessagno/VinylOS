"use client";

import { useId, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useUsernameSuggestions } from "@/lib/useUsernameSuggestions";
import { SignInButton } from "./SignInButton";

type Mode = "signin" | "signup";

const inputClass =
  "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950";

export function AuthForm({ callbackURL }: { callbackURL: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const suggestionsListId = useId();
  // Suggest existing usernames as you type, but not while the identifier is
  // clearly an email address.
  const suggestQuery = mode === "signin" ? identifier : username;
  const suggestions = useUsernameSuggestions(
    suggestQuery.includes("@") ? "" : suggestQuery,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: email.trim(),
          username: username.trim(),
          name: name.trim() || username.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message ?? "Could not create your account.");
          return;
        }
      } else {
        const value = identifier.trim();
        const { error: signInError } = value.includes("@")
          ? await authClient.signIn.email({ email: value, password })
          : await authClient.signIn.username({ username: value, password });
        if (signInError) {
          setError(signInError.message ?? "Invalid credentials.");
          return;
        }
      }
      // Full navigation so the server picks up the freshly-set session cookie.
      window.location.href = callbackURL;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to VinylOS" : "Create your VinylOS account"}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track your collection and follow other collectors.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {mode === "signin" ? (
          <label className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400">Email or username</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              list={suggestionsListId}
              autoComplete="username"
              required
              className={inputClass}
            />
          </label>
        ) : (
          <>
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
            <label className="flex flex-col gap-1">
              <span className="text-zinc-600 dark:text-zinc-400">
                Display name <span className="text-zinc-400">(optional)</span>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </label>
          </>
        )}

        <datalist id={suggestionsListId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>

        <label className="flex flex-col gap-1">
          <span className="text-zinc-600 dark:text-zinc-400">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            className={inputClass}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-black px-6 py-3 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {pending
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "signin" ? "New to VinylOS? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="flex justify-center">
        <SignInButton callbackURL={callbackURL} />
      </div>
    </div>
  );
}
