# get_db_condition.md
## Agent Workflow: Inspect Codebase and Produce DB_CONDITION.md

### Purpose

This workflow is run by an agent before any plan refactor.
Its only job is to inspect the real codebase and write a `DB_CONDITION.md` file
that captures everything about the current database state that the refactor
workflow in `refactor_plan_db.md` needs to do its job accurately.

Run this workflow first. Feed the output `DB_CONDITION.md` into the refactor agent.
Do not skip this step. Do not assume DB state from memory or docs.

---

### What the Agent Must Do

Inspect the codebase. Write `DB_CONDITION.md`. Nothing else.

Do not refactor any plan. Do not modify any source files.
Do not produce summaries, commentary, or explanations outside the output file.

---

### Files To Inspect (in order)

Work through these in sequence. Do not skip a file if it exists.

```
1.  lib/db/schema.ts                         ← primary source of truth
2.  lib/db/index.ts                          ← connection setup, ORM config
3.  drizzle.config.ts                        ← driver, DB path, migration output dir
4.  drizzle/                                 ← all migration SQL files (read every .sql file)
5.  scripts/seed.ts                          ← understand default/test data shape
6.  app/api/**/route.ts                      ← every API route (read all)
7.  lib/db/*.ts                              ← any other DB access helpers or repos
8.  backend/core/database.py                 ← if Python backend exists
9.  backend/models/schema.py                 ← if Python ORM models exist
10. backend/routers/*.py                     ← to verify which fields are actually queried
11. Any other file containing DB queries, inserts, or schema references
```

If a file does not exist, skip it and note it as absent.

---

### Extraction Rules

#### For every table found, extract:

- table name (exact, as defined in schema)
- every column name (exact)
- data type of each column
- default value if any
- nullable or not nullable
- primary key column(s)
- unique constraints
- index definitions if any
- foreign key relations (which column → which table.column)

#### For every enum or custom type found, extract:

- enum name
- all possible values

#### For the overall schema, extract:

- ORM being used (Drizzle, SQLAlchemy, raw SQL, etc.)
- database engine (SQLite, PostgreSQL, MySQL)
- database file path or connection string pattern
- migration tool and migration folder location
- naming convention in use (snake_case, camelCase, or mixed)

#### For API routes, extract only:

- which tables each route reads from or writes to
- which fields are inserted or updated (not the full route logic)
- any field that is written in the API but does not exist in the schema (flag it)
- any field that exists in the schema but is never used in any route (flag it)

---

### Output Format

Write the output as `DB_CONDITION.md` using exactly this structure.
Do not add sections not listed here.
Do not omit a section even if it is empty — write "none" in that case.

---

```markdown
# DB_CONDITION.md
## Current Database State

### Meta

- ORM: <value>
- Database engine: <value>
- Database path or connection string pattern: <value>
- Migration tool: <value>
- Migration folder: <value>
- Naming convention: <value>

---

### Tables

Repeat the block below for every table. Do not merge tables.

#### `<table_name>`

| Column | Type | Nullable | Default | PK | FK |
|--------|------|----------|---------|----|----|
| <col>  | <type> | yes/no | <val or none> | yes/no | <table.col or none> |

Enums used in this table: <list or none>
Indexes: <list or none>
Unique constraints: <list or none>

---

### Enums

#### `<enum_name>`
Values: `<val1>`, `<val2>`, ...

---

### Relations Map

List every foreign key relation in one place for quick reference.

| From table | From column | To table | To column | Relation type |
|------------|-------------|----------|-----------|---------------|
| <table>    | <col>       | <table>  | <col>     | many-to-one / one-to-many / one-to-one |

---

### API Route → Table Usage

| Route | Method | Tables Read | Tables Written | Notes |
|-------|--------|-------------|----------------|-------|
| <path> | GET/POST/etc | <tables> | <tables> | <any flags> |

---

### Schema Gaps Found

Fields written by API routes that do not exist in the schema:

| Route | Field | Issue |
|-------|-------|-------|
| <path> | <field> | written but not in schema |

Fields in schema never read or written by any route:

| Table | Column | Note |
|-------|--------|------|
| <table> | <col> | exists in schema, unused in all routes |

---

### Files Inspected

| File | Status |
|------|--------|
| lib/db/schema.ts | found / not found |
| lib/db/index.ts | found / not found |
| drizzle.config.ts | found / not found |
| drizzle/*.sql | found N files / not found |
| scripts/seed.ts | found / not found |
| app/api/**/route.ts | found N files / not found |
| backend/core/database.py | found / not found |
| backend/models/schema.py | found / not found |
| backend/routers/*.py | found N files / not found |

---

### Notes

Any observations that do not fit the above sections go here.
Keep this section short. Flag only things that will affect plan refactoring.
```

---

### Completion Rule

The workflow is complete when `DB_CONDITION.md` has been written and every table
in the schema has a corresponding block in the output file.

Do not stop early. Do not skip tables.
If a section has no findings, write "none" — do not omit the section.
