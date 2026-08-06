const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const;

/**
 * A spinning record, for waits whose shape we can't predict — a search in
 * flight, a form submitting, a Discogs release resolving. Where we do know the
 * shape that's coming, use a `.sheen` skeleton instead; never both for one wait.
 */
export function VinylSpinner({
  size = "md",
  label = "Loading",
  decorative = false,
}: {
  size?: keyof typeof SIZES;
  label?: string;
  /**
   * For spinners inside a control that already announces its own busy state — a
   * bare `role="status"` there would be folded into the control's accessible
   * name, so the button would read as "Saving… Loading".
   */
  decorative?: boolean;
}) {
  return (
    <span
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "status", "aria-label": label })}
      className={`vinyl-spinner ${SIZES[size]}`}
    />
  );
}
