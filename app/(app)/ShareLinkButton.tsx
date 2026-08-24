"use client";

import { useRef, useState } from "react";

const DEFAULT_CLASS_NAME =
  "w-fit rounded-lg border border-room-rule px-4 py-2.5 text-base font-medium transition-colors hover:bg-room-sunk active:bg-room-sunk";

type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareOrCopyLink(
  url: string,
  title: string | undefined,
  apis: {
    share?: (data: ShareData) => Promise<void>;
    writeText?: (text: string) => Promise<void>;
    legacyCopy?: (text: string) => boolean;
  },
): Promise<ShareResult> {
  if (apis.share) {
    try {
      await apis.share(title ? { url, title } : { url });
      return "shared";
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
      ) {
        return "cancelled";
      }
    }
  }
  if (apis.writeText) {
    try {
      await apis.writeText(url);
      return "copied";
    } catch {
      // Some webviews expose Clipboard API but deny writes. Try the compatible fallback.
    }
  }
  try {
    return apis.legacyCopy?.(url) ? "copied" : "failed";
  } catch {
    return "failed";
  }
}

export function copyTextWithSelection(
  text: string,
  copyDocument: Pick<Document, "body" | "createElement" | "execCommand"> = document,
): boolean {
  const field = copyDocument.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  copyDocument.body.appendChild(field);
  try {
    field.select();
    return copyDocument.execCommand("copy");
  } finally {
    field.remove();
  }
}

export async function runShareOnce(
  lock: { current: boolean },
  operation: () => Promise<ShareResult>,
): Promise<ShareResult | "ignored"> {
  if (lock.current) return "ignored";
  lock.current = true;
  try {
    return await operation();
  } finally {
    lock.current = false;
  }
}

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
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [pending, setPending] = useState(false);
  const shareLock = useRef(false);

  async function handleClick() {
    const result = await runShareOnce(shareLock, async () => {
      setPending(true);
      try {
        return await shareOrCopyLink(url, title, {
          share: navigator.share?.bind(navigator),
          writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
          legacyCopy: copyTextWithSelection,
        });
      } finally {
        setPending(false);
      }
    });
    if (result === "ignored" || (result !== "copied" && result !== "failed")) return;
    setStatus(result);
    setTimeout(() => setStatus("idle"), 2000);
  }

  const buttonLabel =
    pending
      ? "Compartiendo…"
      : status === "copied"
        ? "¡Enlace copiado!"
        : status === "failed"
          ? "No se pudo copiar"
          : label;
  const statusMessage =
    status === "copied" ? "Enlace copiado" : status === "failed" ? "No se pudo copiar" : "";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        disabled={pending}
        aria-busy={pending}
      >
        {buttonLabel}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </>
  );
}
