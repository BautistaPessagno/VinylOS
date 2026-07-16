"use client"; // Error boundaries must be Client Components

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    // global-error replaces the root layout, so it must render its own html/body.
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ maxWidth: "28rem", color: "#71717a" }}>
          VinylOS hit an unexpected error. Trying again usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          style={{
            minHeight: "2.75rem",
            borderRadius: "0.5rem",
            background: "#000",
            color: "#fff",
            padding: "0.625rem 1.25rem",
            fontWeight: 500,
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
            Error reference: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
