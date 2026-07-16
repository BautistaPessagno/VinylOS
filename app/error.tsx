"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-zinc-500">
        We couldn&apos;t load this page. It might be a hiccup with an external music
        service — trying again usually fixes it.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="min-h-11 rounded-lg bg-black px-5 py-2.5 font-medium text-white hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
      >
        Try again
      </button>
      {error.digest && (
        <p className="text-xs text-zinc-400">Error reference: {error.digest}</p>
      )}
    </div>
  );
}
