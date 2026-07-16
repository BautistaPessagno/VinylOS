"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-3.5 w-3.5 animate-spin motion-reduce:hidden"
    >
      <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Submit button for server-action forms: disables itself and shows a spinner while
 * the action is pending so slow networks don't invite double-taps. Must be rendered
 * inside the <form> whose status it reports.
 */
export function SubmitButton({
  className,
  children,
  pendingText,
}: {
  className?: string;
  children: ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${className ?? ""}`}
    >
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/**
 * Destructive-action button with a two-tap confirm step: the first tap arms it
 * (label swaps to `confirmLabel`), a second tap within 4s actually submits.
 * Disarms automatically so a stray tap can't linger as a loaded gun.
 */
export function ConfirmSubmitButton({
  className,
  children,
  confirmLabel,
  pendingText,
}: {
  className?: string;
  children: ReactNode;
  confirmLabel: string;
  pendingText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed) return;
    const timeout = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timeout);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(true)}
        className={`inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${className ?? ""}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-1.5 font-medium disabled:opacity-60 ${className ?? ""}`}
    >
      {pending && <Spinner />}
      {pending && pendingText ? pendingText : confirmLabel}
    </button>
  );
}
