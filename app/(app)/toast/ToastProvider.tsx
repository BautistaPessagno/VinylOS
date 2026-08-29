"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  TOAST_MESSAGES,
  isToastCode,
  type ToastAction,
  type ToastCode,
  type ToastMessage,
  type ToastVariant,
} from "@/lib/toast/messages";

const TOAST_DURATION_MS = 4000;
/** Longer when there's a link to take: the toast has to outlive the reading of it. */
const TOAST_WITH_ACTION_DURATION_MS = 7000;

type ActiveToast = {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

type ToastContextValue = {
  showToast: (toast: ToastCode | ToastMessage) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastCode | ToastMessage) => {
      const resolved: ToastMessage | null =
        typeof toast === "string"
          ? isToastCode(toast)
            ? TOAST_MESSAGES[toast]
            : null
          : toast;
      if (!resolved) return;

      const id = nextId.current++;
      setToasts((current) => [...current, { id, ...resolved }]);
      setTimeout(
        () => dismiss(id),
        resolved.action ? TOAST_WITH_ACTION_DURATION_MS : TOAST_DURATION_MS,
      );
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 sm:bottom-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg transition-opacity motion-reduce:transition-none ${
              /* Opaque surface with a coloured edge, rather than a tinted fill: a
                 toast floats over arbitrary content, so a translucent wash would
                 take whatever is underneath with it. */
              toast.variant === "success"
                ? "border-room-accent-2 bg-room-surface text-room-fg"
                : "border-room-danger bg-room-surface text-room-fg"
            }`}
          >
            <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="flex-1">{toast.message}</span>
              {/* Staying put is the default; this is the opt-in way out. */}
              {toast.action && (
                <Link
                  href={toast.action.href}
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 font-medium text-room-accent underline underline-offset-2 active:opacity-70"
                >
                  {toast.action.label}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-m-2.5 shrink-0 p-2.5 text-lg leading-none opacity-60 transition-opacity hover:opacity-100 active:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
