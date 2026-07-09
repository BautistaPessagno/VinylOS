<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Database migrations

In dev, only run `pnpm db:push`. Never run `pnpm db:migrate` (or apply schema changes directly to any database) — the user runs migrations against prod themselves. Running `db:migrate` outside of dev has previously caused drift between the migrations journal and the database state.
