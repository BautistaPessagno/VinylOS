"use client";

import { useId, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useUsernameSuggestions } from "@/lib/useUsernameSuggestions";
import { SignInButton } from "./SignInButton";

type Mode = "signin" | "signup";

const inputClass =
  "rounded border border-room-rule px-3 py-2";

export function AuthForm({
  callbackURL,
  initialMode = "signin",
}: {
  callbackURL: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
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
          setError(signUpError.message ?? "No se pudo crear tu cuenta.");
          return;
        }
      } else {
        const value = identifier.trim();
        const { error: signInError } = value.includes("@")
          ? await authClient.signIn.email({ email: value, password })
          : await authClient.signIn.username({ username: value, password });
        if (signInError) {
          setError(signInError.message ?? "Credenciales incorrectas.");
          return;
        }
      }
      // Full navigation so the server picks up the freshly-set session cookie.
      window.location.href = callbackURL;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Inicia sesión en VinylOS" : "Crea tu cuenta de VinylOS"}
        </h1>
        <p className="text-sm text-room-dim">
          Registra tu colección y sigue a otros coleccionistas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
        {mode === "signin" ? (
          <label className="flex flex-col gap-1">
            <span className="text-room-dim">Email o nombre de usuario</span>
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
              <span className="text-room-dim">Email</span>
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
              <span className="text-room-dim">Nombre de usuario</span>
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
              <span className="text-room-dim">
                Nombre visible <span className="text-room-dim">(opcional)</span>
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
          <span className="text-room-dim">Contraseña</span>
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

        {error && <p className="text-sm text-room-danger">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-room-accent px-6 py-3 text-room-on-accent hover:opacity-90 disabled:opacity-50"
        >
          {pending
            ? mode === "signin"
              ? "Iniciando sesión…"
              : "Creando cuenta…"
            : mode === "signin"
              ? "Iniciar sesión"
              : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-room-dim">
        {mode === "signin" ? "¿Nuevo en VinylOS? " : "¿Ya tienes cuenta? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium underline"
        >
          {mode === "signin" ? "Crear una cuenta" : "Iniciar sesión"}
        </button>
      </p>

      <div className="flex items-center gap-3 text-xs text-room-dim">
        <span className="h-px flex-1 bg-room-sunk" />
        o
        <span className="h-px flex-1 bg-room-sunk" />
      </div>

      <div className="flex justify-center">
        <SignInButton callbackURL={callbackURL} />
      </div>
    </div>
  );
}
