import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// pg-connection-string treats sslmode=prefer/require/verify-ca as aliases for
// verify-full today but warns because that will change in a future major version.
// Pin to verify-full explicitly so behavior stays the same and the warning goes away.
const connectionString = process.env.DATABASE_URL?.replace(
  /([?&]sslmode=)(prefer|require|verify-ca)\b/,
  "$1verify-full"
);

const pool = new Pool({ connectionString });
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
