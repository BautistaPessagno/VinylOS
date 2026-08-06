"use client";

import { useEffect, useRef } from "react";
import { completePendingExploreAction } from "@/app/(app)/recommendations/actions";
import { SubmitButton } from "@/app/(app)/SubmitButton";

export function CompleteExploreActionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={completePendingExploreAction}>
      <SubmitButton
        pendingText="Finishing…"
        className="rounded-full bg-room-accent px-5 py-2.5 text-sm font-medium text-room-on-accent hover:opacity-90 disabled:opacity-50"
      >
        Finish action
      </SubmitButton>
    </form>
  );
}
