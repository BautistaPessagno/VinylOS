"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TOAST_PARAM, isToastCode } from "@/lib/toast/messages";
import { useToast } from "./ToastProvider";

/**
 * Reads the `?toast=<code>` flash param left by a redirecting server action, shows the
 * matching toast once, then strips the param from the URL so a refresh doesn't repeat it.
 */
export function FlashToaster() {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef<string | null>(null);

  const code = searchParams.get(TOAST_PARAM);

  useEffect(() => {
    if (!code || handled.current === code) return;
    handled.current = code;

    if (isToastCode(code)) showToast(code);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(TOAST_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [code, pathname, router, searchParams, showToast]);

  return null;
}
