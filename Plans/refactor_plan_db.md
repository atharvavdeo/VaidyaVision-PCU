# Refactor Plan Against Current DB Workflow

## Purpose
Use this workflow whenever an agent needs to refactor or update a plan stored in a `.md` file based on the current database state.

The goal is to prevent plans from drifting away from the actual schema, relations, available tables, and existing data model conventions already present in the codebase.

---

## Core Rule

Before changing any plan, the agent must first understand the current database implementation.

The agent must:
1. inspect the current DB schema files
2. inspect related DB access code and APIs if needed
3. compare the existing plan against the real DB state
4. identify mismatches, outdated assumptions, and missing dependencies
5. rewrite the plan so it reflects the current database reality

The agent must not blindly extend a plan based on assumptions.

---

## Primary Inputs

- the target `.md` plan file that needs refactoring
- the current DB schema files(That you will find yourself from the codebase)
- relevant migration files if present
- relevant API routes, repositories, services, or query layers

---

## Files To Inspect First

At minimum, inspect:

- `lib/db/schema.ts`
- `lib/db/index.ts`
- migration or drizzle folders if present
- any seed files if they affect understanding of how the DB is used
- relevant API routes under `app/api/`
- Any other DB files that you may come accross in the ENTIRE codebase

If the plan references features like notes, prescriptions, files, appointments, reports, medications, messages, or voice data, the agent must also inspect the related endpoints and UI pages before updating the plan.

---

## Refactor Workflow

### Step 1: Read the plan fully
Read the target `.md` plan file and extract:
- proposed entities
- proposed tables
- proposed fields
- proposed API expectations
- proposed workflows
- proposed dependencies

### Step 2: Read the current DB state
Inspect the current database schema and determine:
- what tables already exist
- what fields already exist
- what relations already exist
- what data types and enums are already being used
- what naming conventions are currently used
- what parts of the plan are already supported
- what parts of the plan would require schema changes

### Step 3: Compare plan vs DB
For every DB-related statement in the plan, classify it into one of these categories:

- `already supported`
- `partially supported`
- `missing from schema`
- `conflicts with current schema`
- `duplicates an existing concept`
- `needs migration`

The agent must explicitly identify conflicts such as:
- plan proposes a new table that duplicates current behavior
- plan assumes fields that do not exist
- plan assumes relations that are not modeled
- plan assumes a different naming pattern than the current DB
- plan assumes a backend architecture inconsistent with the real code

### Step 4: Refactor the plan
Update the plan so that:
- existing DB structures are reused wherever possible
- conflicting assumptions are corrected
- missing items are clearly marked as new schema work
- migrations are called out explicitly where required
- new work is grouped into realistic phases
- API and UI work is tied to real entities, not imaginary ones

### Step 5: Preserve intent while correcting implementation
Do not throw away the product intent of the plan unless it is impossible or unsafe.

Instead:
- preserve the feature goal
- adjust the technical plan to match the actual DB
- mark optional enhancements separately from required schema changes

### Step 6: Produce a summary of changes
When the refactor is complete, include:
- what was outdated in the original plan
- what was kept
- what had to change because of the DB
- what new schema work is required
- what no longer needs to be built because it already exists

---

## Required Output Structure

When updating a plan, the agent should produce the revised `.md` content with these sections where applicable:

1. `Current DB Reality`
2. `Conflicts In Original Plan`
3. `Refactored Plan`
4. `Required Schema Changes`
5. `No-Change Areas`
6. `Implementation Notes`

If the existing plan is already aligned with the DB, the agent should say so explicitly and only make small corrections if needed.

---

## Mandatory Rules

- Do not invent tables or fields without first checking whether an equivalent already exists.
- Do not assume docs are accurate if the code disagrees.
- Prefer the actual schema over README claims.
- Prefer current route implementations over older architecture notes.
- If a plan references outdated backend technology, update the plan to the currently implemented stack.
- If the DB is only partially prepared for a feature, split the plan into:
  - work supported by current schema
  - work requiring schema refactor

---

## Decision Rules

### If the plan proposes something already present
Do not repeat it as new work.
Mark it as existing capability and update downstream steps accordingly.

### If the plan proposes something that partially exists
Refactor the plan to extend the existing structure instead of replacing it.

### If the plan conflicts with the current schema
Update the plan to reflect one of:
- adapt feature to current schema by adding explicit migration step and replacing conflicting assumption with the real model

### If the DB naming differs from the plan
Use the naming convention already established in the schema unless there is a strong reason to standardize during a migration.

---

## Example Conflict Types

- plan says `medications` table exists, but only `prescriptions` exists
- plan assumes patient notes are stored on `reports`, but notes are actually on `scans`
- plan proposes a `patient_documents` table while a general `files` or `attachments` model already exists
- plan assumes conversations are per appointment, but schema models them per patient-doctor pair
- plan expects draft and signed report version history, but schema only stores one report row

---

## Suggested Agent Prompt

Use the following prompt when refactoring a plan:

```text
You are refactoring a project plan based on the current database reality.

Your task is to update the target Markdown plan so it matches the real database schema and related API usage in the codebase.

Follow this workflow exactly:
1. Read the target plan fully.
2. Inspect the current DB schema and related DB access code.
3. Compare the plan against the actual DB structures.
4. Identify all conflicts, duplicates, missing schema assumptions, and outdated architecture assumptions.
5. Rewrite the plan so it preserves the product goal but aligns with the current schema.
6. Clearly separate:
   - what already exists
   - what partially exists
   - what requires schema changes
   - what should be removed from the plan because it duplicates current functionality

Important rules:
- Prefer code over docs when they disagree.
- Do not invent schema details.
- Reuse existing tables and relations whenever possible.
- If new schema work is required, state it explicitly.
- If the current DB blocks part of the plan, say so clearly.

Output a revised Markdown plan with concise, implementation-ready sections.
```

---

## Final Check Before Saving

Before finalizing the updated plan, the agent must verify:
- every DB-related claim in the revised plan maps to a real schema element or an explicit schema change task
- no outdated architecture assumptions remain
- no duplicate tables or concepts are proposed unnecessarily
- the plan is still aligned with the intended product outcome

