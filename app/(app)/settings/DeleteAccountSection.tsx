"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "rounded border border-room-rule bg-room-surface px-3 py-2";

export function DeleteAccountSection({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Accounts without a username (rare — e.g. legacy Google sign-ins that never
  // set one) confirm with a fixed phrase instead of an empty string.
  const confirmValue = username || "eliminar mi cuenta";

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function closeModal() {
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: deleteError } = await authClient.deleteUser({});
      if (deleteError) {
        setError(deleteError.message ?? "No se pudo eliminar tu cuenta.");
        return;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-room-danger/40 p-4">
      <h2 className="text-lg font-medium text-room-danger">Zona de riesgo</h2>
      <p className="text-sm text-room-dim">
        Eliminar tu cuenta borra de forma permanente tu colección, tus seguidos y
        tu perfil. Esta acción no se puede deshacer.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-room-danger px-4 py-2 text-sm font-medium text-room-danger transition-colors hover:bg-room-danger hover:text-room-on-danger"
      >
        Eliminar cuenta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-heading"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-room-rule bg-room-surface p-6 shadow-lg"
          >
            <h3 id="delete-account-heading" className="text-lg font-medium">
              ¿Eliminar tu cuenta?
            </h3>
            <p className="mt-2 text-sm text-room-dim">
              Esto es permanente. Escribe{" "}
              <span className="font-mono font-semibold">{confirmValue}</span>{" "}
              para confirmar.
            </p>

            <form onSubmit={handleDelete} className="mt-4 flex flex-col gap-3 text-sm">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                autoComplete="off"
                className={inputClass}
              />

              {error && <p className="text-sm text-room-danger">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-room-dim hover:text-room-fg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || confirmText !== confirmValue}
                  className="rounded-lg bg-room-danger px-4 py-2 text-sm font-medium text-room-on-danger transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Eliminando…" : "Eliminar cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
