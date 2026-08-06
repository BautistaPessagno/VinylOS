"use client";

import { useState } from "react";

const DEFAULT_CLASS_NAME =
  "w-fit rounded-lg border border-zinc-300 px-4 py-2.5 text-base font-medium transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:active:bg-zinc-800";

/**
 * Share a URL via the Web Share API when available, otherwise copy it to the
 * clipboard and briefly show "Link copied!" on the button.
 */
export function ShareLinkButton({
  url,
  label,
  title,
  className = DEFAULT_CLASS_NAME,
}: {
  url: string;
  label: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (navigator.share) {
      try {
        await navigator.share(title ? { url, title } : { url });
        return;
      } catch {
        // fall through to clipboard copy (user cancel or unsupported payload)
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {copied ? "Link copied!" : label}
    </button>
  );
}
