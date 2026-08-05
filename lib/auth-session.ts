import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Session if present; null for anonymous visitors. Don't rely on proxy.ts alone (CVE-2025-29927). */
export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Validates the session server-side. Don't rely on proxy.ts alone (CVE-2025-29927). */
export async function requireSession() {
  const session = await getOptionalSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
