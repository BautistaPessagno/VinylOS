"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="max-w-md text-room-dim">
        No pudimos cargar esta página. Puede ser un fallo puntual de un servicio
        de música externo; reintentar suele solucionarlo.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="min-h-11 rounded-lg bg-room-accent px-5 py-2.5 font-medium text-room-on-accent hover:opacity-90 active:opacity-90"
      >
        Reintentar
      </button>
      {error.digest && (
        <p className="text-xs text-room-dim">Error reference: {error.digest}</p>
      )}
    </div>
  );
}
