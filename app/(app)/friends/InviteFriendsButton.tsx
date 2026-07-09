"use client";

import { useState } from "react";

export function InviteFriendsButton({ profileUrl }: { profileUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (navigator.share) {
      try {
        await navigator.share({ url: profileUrl });
        return;
      } catch {
        // fall through to clipboard copy
      }
    }
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
    >
      {copied ? "Link copied!" : "Invite friends"}
    </button>
  );
}
