"use client";

import { ShareLinkButton } from "../ShareLinkButton";

export function InviteFriendsButton({ profileUrl }: { profileUrl: string }) {
  return (
    <ShareLinkButton
      url={profileUrl}
      label="Invite friends"
      title="Join me on VinylOS"
      className="w-fit rounded bg-black px-4 py-2 text-sm text-white"
    />
  );
}
