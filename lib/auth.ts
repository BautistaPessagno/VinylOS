import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  user: {
    // No email-sending infra exists yet, so email changes apply immediately
    // instead of going through a verification link.
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    // No sendDeleteAccountVerification configured, so deletion is immediate
    // once the settings-page confirmation modal accepts it.
    deleteUser: {
      enabled: true,
    },
  },
  // Settings-page account deletion has no password/email-token step for
  // Google accounts, so don't require a "fresh" session for it — the
  // type-your-username confirmation modal is the safeguard instead.
  session: {
    freshAge: 0,
  },
  // `username()` adds unique `username` + `displayUsername` columns to the user
  // table and enables sign-in by username. `nextCookies()` must stay last so it
  // can set cookies from server actions after the other plugins run.
  plugins: [username(), nextCookies()],
});
