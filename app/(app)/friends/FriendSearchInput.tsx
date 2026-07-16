"use client";

import { useId, useState } from "react";
import { useUsernameSuggestions } from "@/lib/useUsernameSuggestions";

/**
 * Search input for the "Find collectors" form. Keeps the plain GET-form submit
 * (results are still rendered server-side by the friends page) while offering a
 * live `<datalist>` autocomplete of existing usernames as you type.
 */
export function FriendSearchInput({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const listId = useId();
  const suggestions = useUsernameSuggestions(value);

  return (
    <>
      <input
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        list={listId}
        autoComplete="off"
        placeholder="Search by name or username"
        className="min-h-11 min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-base sm:text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </>
  );
}
