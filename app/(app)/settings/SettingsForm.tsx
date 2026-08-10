"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useUsernameSuggestions } from "@/lib/useUsernameSuggestions";

const inputClass =
  "rounded border border-room-rule px-3 py-2";

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
          setError(profileError.message ?? "No se pudo actualizar tu perfil.");
          return;
        }
      }

      const trimmedEmail = email.trim();
      if (trimmedEmail !== initialEmail) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: trimmedEmail,
        });
        if (emailError) {
          setError(emailError.message ?? "No se pudo actualizar tu email.");
          return;
        }
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
      <h2 className="text-lg font-medium">Perfil</h2>

      <label className="flex flex-col gap-1">
        <span className="text-room-dim">Nombre visible</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
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
      <datalist id={suggestionsListId}>
        {suggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

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

      {error && <p className="text-sm text-room-danger">{error}</p>}
      {success && !error && (
        <p className="text-sm text-room-accent-2">Guardado.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-room-accent px-4 py-2 text-sm font-medium text-room-on-accent shadow-sm transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
