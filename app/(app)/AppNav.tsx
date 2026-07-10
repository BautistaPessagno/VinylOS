"use client";

import { useState } from "react";
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

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "text-sm font-medium text-red-500 underline decoration-2 underline-offset-4"
                : "text-sm text-zinc-600 hover:text-red-500"
            }
          >
            {label}
          </Link>
        );
      })}
    </>
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

        <div className="flex items-center gap-4">
          <Link
            href={SEARCH_HREF}
            aria-label="Search records and artists"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:border-red-500 hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:inline-flex dark:border-zinc-700 dark:text-zinc-200"
          >
            <SearchIcon />
          </Link>

          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <Link
              href={`/users/${userId}`}
              className="flex items-center"
              aria-label="Your profile"
            >
              <Avatar name={name} image={image} />
            </Link>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 pt-2">
                <div className="w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="truncate text-sm font-medium">{name}</p>
                  {handle ? (
                    <p className="truncate text-xs text-zinc-500">@{handle}</p>
                  ) : (
                    <div className="mt-2">
                      <SetUsernamePrompt />
                    </div>
                  )}
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    <SignOutButton />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-600 hover:text-red-500 sm:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-4 border-t border-zinc-200 px-6 py-4 sm:hidden dark:border-zinc-800">
          <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          <Link
            href={SEARCH_HREF}
            onClick={() => setMobileOpen(false)}
            aria-label="Search records and artists"
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-red-500"
          >
            <SearchIcon />
            Search
          </Link>
        </nav>
      )}
    </header>
  );
}
