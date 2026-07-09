"use client";

import { useState } from "react";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  image,
  size = "h-8 w-8",
  textSize = "text-xs",
}: {
  name: string;
  image?: string | null;
  size?: string;
  textSize?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        onError={() => setFailed(true)}
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-zinc-200 ${textSize} font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200`}
    >
      {initials(name) || "?"}
    </span>
  );
}
