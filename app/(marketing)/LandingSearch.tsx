"use client";

import { ViewTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/search/searchQuery";

/**
 * The landing page's call to action. Typing is a lower commitment than
 * navigating, so the search field replaces what used to be an "Explore records"
 * button. Submitting carries the query to /explore, and the bar itself is named
 * for a view transition so it travels with the visitor instead of being
 * replaced by Explore's copy of it.
 *
 * The form still has a real action/method, so a submit works without JS — it
 * just navigates instead of morphing.
 */
export function LandingSearch({ genres }: { genres: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore");
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <ViewTransition name="vinyl-search" share="vinyl-search">
        <form
          action="/explore"
          onSubmit={handleSubmit}
          role="search"
          className="flex w-full max-w-lg items-center gap-3 rounded-full border border-room-rule bg-room-surface px-5 py-3.5 focus-within:border-room-accent"
        >
          <label htmlFor="landing-search" className="sr-only">
            Busca artistas, discos y canciones
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5 shrink-0 text-room-dim"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            id="landing-search"
            name="q"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={MAX_SEARCH_QUERY_LENGTH}
            placeholder="Search artists, records, and songs"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-room-fg outline-none placeholder:text-room-dim"
          />
        </form>
      </ViewTransition>

      {/* For visitors who don't know what to type. */}
      <div className="no-scrollbar -mx-6 flex snap-x gap-2 overflow-x-auto px-6">
        {genres.map((genre) => (
          <Link
            key={genre}
            href={`/explore?genre=${encodeURIComponent(genre)}`}
            className="shrink-0 snap-start rounded-full border border-room-rule px-3.5 py-1.5 text-sm capitalize text-room-dim transition hover:border-room-accent hover:text-room-accent"
          >
            {genre}
          </Link>
        ))}
      </div>
    </div>
  );
}
