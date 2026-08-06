import { createHmac, timingSafeEqual } from "node:crypto";

export const PENDING_EXPLORE_ACTION_COOKIE = "vinylos.pending-explore-action";
export const PENDING_EXPLORE_ACTION_MAX_AGE_SECONDS = 10 * 60;

export type PendingExploreActionKind = "collection" | "wishlist";

export type PendingExploreAction = {
  version: 1;
  kind: PendingExploreActionKind;
  artist: string;
  album: string;
  returnTo: string;
  expiresAt: number;
};

type PendingExploreActionInput = Omit<
  PendingExploreAction,
  "version" | "expiresAt"
>;

const MAX_FIELD_LENGTH = 300;
const LOCAL_ORIGIN = "https://vinylos.local";

function isBoundedText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= MAX_FIELD_LENGTH
  );
}

function isExploreReturnPath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }
  try {
    const url = new URL(value, LOCAL_ORIGIN);
    return url.origin === LOCAL_ORIGIN && url.pathname === "/explore";
  } catch {
    return false;
  }
}

function isValidAction(
  value: unknown,
  now: number,
): value is PendingExploreAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Partial<PendingExploreAction>;
  return (
    action.version === 1 &&
    (action.kind === "collection" || action.kind === "wishlist") &&
    isBoundedText(action.artist) &&
    isBoundedText(action.album) &&
    isExploreReturnPath(action.returnTo) &&
    typeof action.expiresAt === "number" &&
    Number.isFinite(action.expiresAt) &&
    action.expiresAt > now
  );
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodePendingExploreAction(
  input: PendingExploreActionInput,
  secret: string,
  now = Date.now(),
): string {
  const action: PendingExploreAction = {
    version: 1,
    ...input,
    expiresAt: now + PENDING_EXPLORE_ACTION_MAX_AGE_SECONDS * 1_000,
  };
  if (!secret || !isValidAction(action, now)) {
    throw new Error("Invalid pending Explore action");
  }

  const payload = Buffer.from(JSON.stringify(action)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function decodePendingExploreAction(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): PendingExploreAction | null {
  if (!token || !secret) return null;
  const [payload, receivedSignature, extra] = token.split(".");
  if (!payload || !receivedSignature || extra) return null;

  const expectedSignature = signature(payload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return isValidAction(value, now) ? value : null;
  } catch {
    return null;
  }
}
