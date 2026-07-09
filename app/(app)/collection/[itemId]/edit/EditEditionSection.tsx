"use client";

import { useState, useTransition } from "react";
import { changeItemEditionAction } from "../../actions";
import { EditionPicker } from "../../EditionPicker";

/** Advanced, opt-in control for swapping an owned item to a different vinyl pressing. */
export function EditEditionSection({
  itemId,
  masterId,
}: {
  itemId: number;
  masterId: number;
}) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handlePick(discogsReleaseId: number) {
    setError(null);
    setPendingId(discogsReleaseId);
    startTransition(async () => {
      try {
        await changeItemEditionAction(itemId, discogsReleaseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change edition");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <EditionPicker
        masterId={masterId}
        onPick={handlePick}
        pendingId={pendingId}
        label="Advanced: change edition"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
