# VinylOS

Track your vinyl collection, see your stats ("Wrapped"), and discover what to buy
next. Built with Next.js (App Router), Neon Postgres, Drizzle ORM, and Better Auth.
Catalog data comes from the Discogs API, with Last.fm supplying charts and artist
metadata.

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io/) 10+
- A Postgres database (a free [Neon](https://neon.tech) branch works; any Postgres URL does)
- API credentials for [Discogs](https://www.discogs.com/settings/developers) and
  [Last.fm](https://www.last.fm/api/account/create)

## Getting started

```bash
pnpm install
cp .env.example .env   # or create .env by hand — see below
pnpm db:push           # sync the Drizzle schema to your database (dev workflow)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Put these in `.env` at the repo root:

```
# Postgres (Neon provisions these automatically on Vercel)
DATABASE_URL=            # pooled connection string, used by the app
DATABASE_URL_UNPOOLED=   # direct connection string, used for migrations

# Better Auth
BETTER_AUTH_SECRET=      # any long random string
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (optional — email/password works without it)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# External APIs — one project-wide key, not per-user
DISCOGS_CONSUMER_KEY=
DISCOGS_CONSUMER_SECRET=
DISCOGS_USER_AGENT=      # e.g. "VinylOS/1.0 +https://yourapp.example"
LASTFM_API_KEY=
```

### Database workflow

Schema lives in `lib/db/schema.ts` (plus the generated `lib/db/auth-schema.ts`).
In development, apply changes with:

```bash
pnpm db:push
```

Do **not** run `pnpm db:migrate` in dev — production migrations are applied
manually by the maintainer, and running migrate elsewhere causes journal drift.
`pnpm db:studio` opens Drizzle Studio to inspect data.

### Auth

Better Auth handles sessions (stored in Postgres via the Drizzle adapter) with
email/password and optional Google OAuth. After changing auth config in
`lib/auth.ts`, regenerate the auth schema with `pnpm auth:generate`.

## Scripts

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `pnpm dev`        | Start the dev server                          |
| `pnpm build`      | Production build                              |
| `pnpm lint`       | ESLint                                        |
| `pnpm test`       | Run the Node test runner (`*.test.mjs` files) |
| `pnpm db:push`    | Push schema changes to the database (dev)     |
| `pnpm db:studio`  | Open Drizzle Studio                           |

CI (GitHub Actions) runs lint, tests, and a production build on every PR.

## Project layout

```
app/(marketing)   public landing + login
app/(app)         authenticated app: collection, wishlist, friends, discover, profiles
lib/db            Drizzle schema + client
lib/discogs       Discogs API client (shared project key)
lib/lastfm        Last.fm API client
lib/services      collection / wishlist / friends / wrapped / recommendations
proxy.ts          fast unauthenticated redirect (not the security boundary)
```

See `TODO.md` for the architecture notes and roadmap.
