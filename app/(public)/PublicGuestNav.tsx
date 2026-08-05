"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Minimal header for signed-out visitors on public pages.
 * No account menu, bottom tabs, or search — only brand + auth CTAs.
 * Login/signup round-trip back to the page the visitor was viewing.
 */
export function PublicGuestNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const nextPath = search ? `${pathname}?${search}` : pathname;
  const next = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";
  const signupHref = next
    ? `/login?mode=signup&next=${encodeURIComponent(next)}`
    : "/login?mode=signup";

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          VinylOS
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={loginHref}
            className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:text-red-500 active:text-red-500 dark:text-zinc-200"
          >
            Log in
          </Link>
          <Link
            href={signupHref}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
