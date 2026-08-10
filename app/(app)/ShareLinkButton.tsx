"use client";

import { useState } from "react";

const DEFAULT_CLASS_NAME =
  "w-fit rounded-lg border border-room-rule px-4 py-2.5 text-base font-medium transition-colors hover:bg-room-sunk active:bg-room-sunk";

/**
 * Share a URL via the Web Share API when available, otherwise copy it to the
 * clipboard and briefly show "¡Enlace copiado!" on the button.
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
      {copied ? "¡Enlace copiado!" : label}
    </button>
  );
}
