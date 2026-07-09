"use client";

import { useEffect, useState } from "react";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

/**
 * Debounced typeahead of existing usernames from the public `/api/usernames`
 * endpoint. Shared by the login form and the friends search so both offer the
 * same autocomplete. Returns [] until at least {@link MIN_QUERY_LENGTH} chars
 * are typed.
 */
export function useUsernameSuggestions(query: string): string[] {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();
    // All setState happens inside this deferred callback (never synchronously in
    // the effect body) to avoid cascading renders.
    const timeout = setTimeout(async () => {
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/usernames?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { usernames?: unknown };
        setSuggestions(
          Array.isArray(data.usernames)
            ? data.usernames.filter((v): v is string => typeof v === "string")
            : [],
        );
      } catch {
        // Ignore aborts and transient network errors — suggestions are best-effort.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return suggestions;
}
