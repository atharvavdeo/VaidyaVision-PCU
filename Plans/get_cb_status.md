# get_cb_status — Codebase Status Generator

## Purpose

Use this workflow whenever an agent needs to produce or refresh a `CODEBASE_STATUS.md` file for the VaidyaVision repository. The output file gives any agent enough context to understand what the codebase contains, what is already built, what is in progress, and what the exact DB and API surface looks like — without having to read every source file from scratch.

---

## When to Run This

- Before starting any new implementation plan
- Before refactoring any existing plan
- When onboarding a new agent to the repository
- After any migration, schema change, or major route addition
- Whenever a plan references DB tables, columns, or API endpoints that may have changed

---

## Inputs Required

To produce an accurate `CODEBASE_STATUS.md`, the agent must inspect the following files in order:

```
Priority 1 — Schema and DB (always inspect first):
  lib/db/schema.ts
  lib/db/index.ts
  drizzle.config.ts
  drizzle/*.sql

Priority 2 — Backend API surface:
  backend/main.py
  backend/core/config.py
  backend/core/database.py
  backend/core/auth.py
  backend/models/types.py
  backend/routers/*.py         (all router files)

Priority 3 — Frontend:
  frontend/lib/api/client.ts
  frontend/lib/api/*.ts        (all api client files)
  frontend/app/                (directory listing, not full file reads)

Priority 4 — Active plans and status docs:
  VAIDYAVISION_RESTRUCTURING_PLAN.md  (if present)
  DB_CONDITION.md                     (if present)
  Any *_Implementation_Plan.md files  (if present)

Priority 5 — Supporting config:
  backend/requirements.txt
  frontend/package.json
  voice-agent/requirements.txt        (if present)
  .env.example files
```

---

## Output

Write the result to `CODEBASE_STATUS.md` at the repository root.

The file must be structured exactly as shown in the **Required Output Sections** below.

---

## Required Output Sections

The `CODEBASE_STATUS.md` must always contain these sections, populated from the inspected files:

1. `## Repository Overview` — tech stack, directory structure, port map
2. `## Database Reality` — ORM, engine, path, naming conventions, full table inventory
3. `## API Surface` — every confirmed route with method, path, auth, tables touched
4. `## Authentication` — how auth works end to end
5. `## Frontend Pages` — confirmed page routes with data dependencies
6. `## Active Implementation Plans` — what is in progress, what is complete, what is planned
7. `## Known Schema Gaps` — columns that exist but are unused, tables with no routes
8. `## Agent Quick-Reference` — critical facts an agent must not get wrong

---

## Mandatory Rules

- Prefer code over documents when they conflict.
- Prefer `lib/db/schema.ts` over any migration SQL file for column names and types.
- Never assume a table, column, or route exists without inspecting the source.
- If a source file is not accessible, note it explicitly in the status doc as `[NOT INSPECTED]`.
- Mark every item as one of: `confirmed`, `planned`, `partial`, or `unknown`.

---

## Suggested Agent Prompt

```text
You are generating a CODEBASE_STATUS.md file for the VaidyaVision repository.

Your task is to inspect the codebase files listed in get_cb_status.md and produce
a complete, accurate status document that any agent can use as a starting context.

Follow this workflow exactly:
1. Read lib/db/schema.ts — extract every table, column, type, and relation.
2. Read backend/routers/*.py — extract every route, method, and DB operation.
3. Read frontend/lib/api/*.ts — extract the frontend API surface.
4. Read any active *_Implementation_Plan.md files — extract what is planned vs built.
5. Produce CODEBASE_STATUS.md using the required section structure.

Rules:
- Use schema.ts as the authority on DB structure.
- Use router files as the authority on API routes.
- Mark anything you could not confirm as [NOT INSPECTED] or [UNCONFIRMED].
- Do not invent details.
```
