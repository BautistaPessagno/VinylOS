"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { SetUsernamePrompt } from "./SetUsernamePrompt";
import { Avatar } from "./Avatar";

const NAV_LINKS = [
  { href: "/collection", label: "Collection" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/friends", label: "Friends" },
  { href: "/recommendations", label: "Discover" },
];

const SEARCH_HREF = "/recommendations?tab=explore&focus=search";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

/** Simple stroke icons for the mobile bottom tab bar. */
const TAB_ICONS: Record<string, React.ReactNode> = {
  "/collection": (
    // Stacked records / library
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  ),
  "/wishlist": (
    // Heart
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M12 20.5S4 15 4 9.5A4.5 4.5 0 0 1 12 6.6a4.5 4.5 0 0 1 8 2.9c0 5.5-8 11-8 11Z" />
    </svg>
  ),
  "/friends": (
    // Two people
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.6" />
      <path d="M17.5 14.4a6.5 6.5 0 0 1 4 5.6" />
    </svg>
  ),
  "/recommendations": (
    // Compass / discover
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  ),
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "text-sm font-medium text-red-500 underline decoration-2 underline-offset-4"
                : "text-sm text-zinc-600 hover:text-red-500 active:text-red-500 dark:text-zinc-300"
            }
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

/** Fixed bottom tab bar shown on mobile instead of a hamburger drawer. */
function BottomTabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] active:opacity-70 ${
                isActive
                  ? "font-medium text-red-500"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {TAB_ICONS[href]}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Click-toggled account menu (works on touch, unlike hover) with outside-tap and
 * Escape dismissal. Holds Profile / Settings / Sign out on every screen size.
 */
function AccountMenu({
  name,
  handle,
  userId,
  image,
}: {
  name: string;
  handle?: string | null;
  userId: string;
  image?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "block rounded px-2 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 active:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:active:bg-zinc-800";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex items-center rounded-full p-1.5 hover:bg-zinc-100 active:bg-zinc-100 dark:hover:bg-zinc-800 dark:active:bg-zinc-800"
      >
        <Avatar name={name} image={image} />
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-full z-50 pt-2">
          <div className="w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <p className="truncate text-sm font-medium">{name}</p>
            {handle ? (
              <p className="truncate text-xs text-zinc-500">@{handle}</p>
            ) : (
              <div className="mt-2">
                <SetUsernamePrompt />
              </div>
            )}
            <div className="mt-3 flex flex-col border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <Link
                href={`/users/${userId}`}
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                Profile
              </Link>
              <Link
                href={`/users/${userId}?view=settings`}
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                Settings
              </Link>
              <SignOutButton className={itemClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppNav({
  name,
  handle,
  image,
  userId,
}: {
  name: string;
  handle?: string | null;
  image?: string | null;
  userId: string;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/collection" className="font-semibold">
            VinylOS
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <NavLinks pathname={pathname} />
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={SEARCH_HREF}
            aria-label="Search records and artists"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 transition-colors hover:text-red-500 active:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:border sm:border-zinc-300 sm:hover:border-red-500 dark:text-zinc-200 sm:dark:border-zinc-700"
          >
            <SearchIcon />
          </Link>

          <AccountMenu name={name} handle={handle} userId={userId} image={image} />
        </div>
      </div>

      <BottomTabBar pathname={pathname} />
    </header>
  );
}
