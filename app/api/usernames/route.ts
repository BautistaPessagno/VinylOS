import { NextResponse } from "next/server";
import { and, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user as users } from "@/lib/db/schema";

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

/**
 * Public typeahead of existing usernames, used by the login form and the
 * friends search. Returns only public handles (`displayUsername`) — never
 * emails or names. Requires >= 2 typed chars and caps results to limit the
 * username-enumeration surface this pre-auth endpoint inherently exposes.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ usernames: [] });
  }

  const pattern = `${query}%`;
  const rows = await db
    .select({
      username: users.username,
      displayUsername: users.displayUsername,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.username),
        or(ilike(users.username, pattern), ilike(users.displayUsername, pattern)),
      ),
    )
    .orderBy(sql`length(${users.username})`)
    .limit(RESULT_LIMIT);

  const usernames = rows
    .map((row) => row.displayUsername ?? row.username)
    .filter((value): value is string => Boolean(value));

  return NextResponse.json({ usernames });
}
