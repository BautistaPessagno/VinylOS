"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TOAST_MESSAGES,
  isToastCode,
  type ToastCode,
  type ToastMessage,
  type ToastVariant,
} from "@/lib/toast/messages";

const TOAST_DURATION_MS = 4000;

type ActiveToast = { id: number; message: string; variant: ToastVariant };

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
      const resolved =
        typeof toast === "string" && isToastCode(toast) ? TOAST_MESSAGES[toast] : toast;
      if (typeof resolved === "string") return;

      const id = nextId.current++;
      setToasts((current) => [...current, { id, ...resolved }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
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
              toast.variant === "success"
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
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
