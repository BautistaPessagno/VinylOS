"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { SetUsernamePrompt } from "./SetUsernamePrompt";
import { Avatar } from "./Avatar";

const NAV_LINKS = [
  { href: "/collection", label: "Collection" },
  { href: "/friends", label: "Friends" },
  { href: "/wrapped", label: "Wrapped" },
  { href: "/recommendations", label: "Recommendations" },
];

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
}: {
  name: string;
  handle?: string | null;
  image?: string | null;
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
            href="/collection/add"
            className="hidden rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 sm:inline-block dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            + Add
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center"
              aria-label="Account menu"
            >
              <Avatar name={name} image={image} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <p className="truncate text-sm font-medium">{name}</p>
                {handle ? (
                  <p className="truncate text-xs text-zinc-500">@{handle}</p>
                ) : (
                  <div className="mt-2">
                    <SetUsernamePrompt />
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-zinc-600 hover:text-black dark:hover:text-red-500"
                  >
                    Settings
                  </Link>
                  <SignOutButton />
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
            href="/collection/add"
            onClick={() => setMobileOpen(false)}
            className="self-start rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm dark:bg-white dark:text-black"
          >
            + Add
          </Link>
        </nav>
      )}
    </header>
  );
}
