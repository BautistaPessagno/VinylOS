"use client";

import { ShareLinkButton } from "../ShareLinkButton";

export function InviteFriendsButton({ profileUrl }: { profileUrl: string }) {
  return (
    <ShareLinkButton
      url={profileUrl}
      label="Invitar amigos"
      title="Únete a mí en VinylOS"
      className="w-fit rounded bg-room-accent px-4 py-2 text-sm text-room-on-accent"
    />
  );
}
