import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/** Validates the session server-side. Don't rely on proxy.ts alone (CVE-2025-29927). */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}
