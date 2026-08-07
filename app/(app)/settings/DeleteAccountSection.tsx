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
  const confirmValue = username || "delete my account";

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
        setError(deleteError.message ?? "Could not delete your account.");
        return;
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-room-danger/40 p-4">
      <h2 className="text-lg font-medium text-room-danger">Danger zone</h2>
      <p className="text-sm text-room-dim">
        Deleting your account permanently removes your collection, follows, and
        profile. This cannot be undone.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-room-danger px-4 py-2 text-sm font-medium text-room-danger transition-colors hover:bg-room-danger hover:text-room-on-danger"
      >
        Delete account
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
              Delete your account?
            </h3>
            <p className="mt-2 text-sm text-room-dim">
              This is permanent. Type{" "}
              <span className="font-mono font-semibold">{confirmValue}</span> to
              confirm.
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || confirmText !== confirmValue}
                  className="rounded-lg bg-room-danger px-4 py-2 text-sm font-medium text-room-on-danger transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
