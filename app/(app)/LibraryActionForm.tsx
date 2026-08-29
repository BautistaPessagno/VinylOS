"use client";

import { useActionState, useEffect } from "react";
import type { LibraryActionResult } from "@/lib/toast/messages";
import { SubmitButton } from "./SubmitButton";
import { useToast } from "./toast/ToastProvider";

export type LibraryAction = (
  previous: LibraryActionResult | null,
  formData: FormData,
) => Promise<LibraryActionResult>;

/**
 * Add-to-collection / add-to-wishlist button that keeps the user where they are.
 *
 * The action returns a toast code instead of redirecting, so the click is confirmed in
 * place and the toast carries the optional link to the collection or wishlist. Once the
 * record is in the target list the button retires itself and the slot states the fact,
 * so the same action can't be fired twice at something already in that state.
 *
 * Still a real <form action>, so it keeps working before hydration.
 */
export function LibraryActionForm({
  action,
  fields,
  label,
  inListLabel,
  pendingText,
  inList = false,
  className,
  inListClassName,
  formClassName,
}: {
  action: LibraryAction;
  /** Hidden inputs the action reads, e.g. `{ releaseId: 12 }`. */
  fields: Record<string, string | number>;
  label: string;
  /** Shown instead of the button once the record is in the list. */
  inListLabel: string;
  pendingText: string;
  /** Server-known state at render time; the action's result takes over after a click. */
  inList?: boolean;
  className?: string;
  inListClassName?: string;
  formClassName?: string;
}) {
  const { showToast } = useToast();
  const [result, formAction] = useActionState(action, null);

  useEffect(() => {
    if (result) showToast(result.toast);
  }, [result, showToast]);

  if (inList || result?.inList) {
    return (
      <span className={inListClassName ?? className}>{inListLabel}</span>
    );
  }

  return (
    <form action={formAction} className={formClassName}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton pendingText={pendingText} className={className}>
        {label}
      </SubmitButton>
    </form>
  );
}
