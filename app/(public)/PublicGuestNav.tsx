"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Minimal header for signed-out visitors on public pages.
 * No account menu, bottom tabs, or search — only brand, Explore, and auth CTAs.
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
    <header className="border-b border-room-rule">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          VinylOS
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/explore"
            className="rounded-lg px-2 py-2 text-sm text-room-fg hover:text-room-accent active:text-room-accent sm:px-3"
          >
            Explorar
          </Link>
          <Link
            href={loginHref}
            className="rounded-lg px-3 py-2 text-sm text-room-fg hover:text-room-accent active:text-room-accent"
          >
            Iniciar sesión
          </Link>
          <Link
            href={signupHref}
            className="rounded-lg bg-room-accent px-3 py-2 text-sm font-medium text-room-on-accent hover:opacity-90 active:opacity-90"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </header>
  );
}
