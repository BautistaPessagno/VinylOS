import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-zinc-500">
        That record seems to be missing from the crate. It may have been removed, or
        the link is wrong.
      </p>
      <Link
        href="/collection"
        className="min-h-11 rounded-lg bg-black px-5 py-2.5 font-medium text-white hover:bg-zinc-800 active:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:active:bg-zinc-200"
      >
        Back to your collection
      </Link>
    </div>
  );
}
