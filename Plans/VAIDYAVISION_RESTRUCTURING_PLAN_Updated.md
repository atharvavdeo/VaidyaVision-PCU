# VaidyaVision — Full Repo Restructuring Plan (Refactored)
## Backend (FastAPI + Python) + Frontend (Next.js) Split

## Implementation Status (Repo-Aligned)

- Implemented in this repo:
    - Added top-level `backend/` scaffold with `core/`, `models/`, `routers/`, `main.py`, `requirements.txt`, and `.env.example`.
    - Copied `medical-ai-platform/ml-service/` to `backend/ml/`.
    - Copied SQLite file to `backend/data/vaidyavision.db`.
    - Copied uploads/heatmaps to `backend/public/`.
    - Implemented SQL-backed routers: `hospitals.py`, `memberships.py`, `cases.py`, `artifacts.py`, `patients.py`, `report_templates.py`.
    - Added transitional `bridge.py` router to proxy remaining route groups to existing Next API while full migration continues.
    - Added top-level `frontend/` split copy from `medical-ai-platform/`.
    - Updated `frontend/lib/db/index.ts` and `frontend/drizzle.config.ts` to use shared DB path (`../backend/data/vaidyavision.db`).
    - Added API client layer in `frontend/lib/api/` with `client.ts`, `hospitals.ts`, `memberships.ts`, `cases.ts`, `patients.ts`.

- Not yet completed in this repo:
    - Replacing every legacy `fetch("/api/..." )` usage in frontend pages/components with `frontend/lib/api/*` clients.
    - Deleting `frontend/app/api/` after all UI callers are switched.
    - Full 1:1 direct SQL migration of every legacy API route into backend routers (bridge currently covers legacy groups).

## Scope Expansion (Accepted After Workspace Review)

- Accepted and retained:
    - Newly added frontend role portals/pages/components (patient/pathologist flows, chat, appointments, reports, research, auth UI, layout modules).
    - Supporting frontend docs and UI-level modules introduced during split work.

- Cleanup-only exclusions (non-feature artifacts):
    - Remove duplicated SQLite files under `frontend/data/` (`vaidyavision.db`, `vaidyavision.db-shm`, `vaidyavision.db-wal`).
    - Keep `backend/data/vaidyavision.db` as the single split-architecture DB target.
    - Ignore runtime SQLite journal artifacts (`*.db-shm`, `*.db-wal`) repository-wide.

- Expanded migration commitments:
    - Preserve all accepted frontend additions while rewiring progressively from local Next `/api/*` calls to backend client endpoints.
    - Factor minor backend logic drift into router parity checks before bridge retirement.
    - Validate no feature regressions via backend compile checks + frontend build/type checks.

> **Refactored against DB_CONDITION.md** — Every router, Pydantic model, raw SQL query, and schema
> reference has been audited against the actual `lib/db/schema.ts` as documented in `DB_CONDITION.md`.
> The source of truth for the schema is `lib/db/schema.ts`, **not** `drizzle/0000_sour_logan.sql`
> (which is outdated and does not reflect the full schema).

---

## Table of Contents

1. [Current DB Reality](#1-current-db-reality)
2. [Conflicts In Original Plan](#2-conflicts-in-original-plan)
3. [Overview & Philosophy](#3-overview--philosophy)
4. [Database Strategy — Why Drizzle Stays in Frontend](#4-database-strategy--why-drizzle-stays-in-frontend)
5. [Target Directory Structure](#5-target-directory-structure)
6. [Phase 1 — Backend Implementation](#6-phase-1--backend-implementation)
   - 6.1 core/config.py
   - 6.2 core/database.py
   - 6.3 core/auth.py
   - 6.4 models/types.py (corrected against real schema)
   - 6.5 Router implementation pattern
   - 6.6 All routers — corrected implementations
   - 6.7 New routers required by real DB routes
   - 6.8 main.py
   - 6.9 requirements.txt
7. [Phase 2 — Frontend Implementation](#7-phase-2--frontend-implementation)
8. [Phase 3 — File Migration Checklist](#8-phase-3--file-migration-checklist)
9. [Phase 4 — Implementation Order](#9-phase-4--implementation-order)
10. [Phase 5 — Running the New Setup](#10-phase-5--running-the-new-setup)
11. [Required Schema Changes](#11-required-schema-changes)
12. [No-Change Areas](#12-no-change-areas)
13. [Future: Porting to PostgreSQL](#13-future-porting-to-postgresql)

---

## 1. Current DB Reality

**ORM / Engine:** Drizzle ORM (`drizzle-orm/better-sqlite3`) over SQLite.  
**Schema source of truth:** `lib/db/schema.ts` — the migration file `drizzle/0000_sour_logan.sql` is **outdated** and must not be used as a reference.  
**DB path:** `./data/vaidyavision.db` (or `path.join(process.cwd(), "data", "vaidyavision.db")`)  
**Column naming:** DB uses `snake_case`; TypeScript Drizzle fields use `camelCase`.

### Tables confirmed in `lib/db/schema.ts`

| Table | Key Notes |
|-------|-----------|
| `users` | roles: `patient`, `doctor`, `admin`, `pathologist`, `hospital_admin`. Columns: `clerk_id`, `role`, `name`, `email`, `image_url`, `specialty`, `hospital_id`, `age`, `gender`, `blood_type`, `medical_history`, `phone`, `is_onboarded`, `created_at` |
| `doctor_profiles` | `user_id`, `specialty`, `specialty_id`, `degree`, `experience`, `license_number`, `rating`, `total_consultations`, `total_scans_reviewed` |
| `scans` | `patient_id`, `doctor_id`, `image_url`, `modality` (`brain`/`lung`/`skin`/`ecg`), `status`, `priority`, `symptoms`, `triage_score`, `ai_diagnosis`, `ai_confidence`, `ai_uncertainty`, `heatmap_url`, `expert_used`, `doctor_notes`, `original_filename`, `uploaded_at`, `reviewed_at`, `hospital_id`, `case_id`, `source_artifact_id` |
| `reports` | `scan_id`, `patient_id`, `doctor_id`, `diagnosis`, `findings`, `recommendations`, `severity`, `status` (`draft`/`signed`), `language`, `template_id`, `signed_at`, `pdf_url`, `created_at`, `case_id` |
| `conversations` | `patient_id`, `doctor_id`, `last_message_at`, `created_at`, `hospital_id` |
| `messages` | `conversation_id`, `sender_id`, `content`, `type` (`text`/`scan`/`report`), `created_at` |
| `appointments` | `patient_id`, `doctor_id`, `scheduled_at`, `type` (`initial`/`follow_up`/`emergency`/`review`), `notes`, `status`, `created_at`, `hospital_id` |
| `templates` | `name`, `structure_json`, `language` |
| `notifications` | `user_id`, `type` (8 enum values), `message`, `link`, `is_read`, `created_at` |
| `family_members` | `patient_id`, `relation`, `name` |
| `follow_ups` | `scan_id`, `patient_id`, `scheduled_for`, `type` (`email`/`call`), `status`, `created_at` |
| `voice_notes` | `scan_id`, `transcription`, `audio_url`, `created_at` |
| `prescriptions` | `patient_id`, `image_url`, `document_type`, `ocr_confidence`, `ocr_method`, `raw_text`, `cleaned_text`, `structured_data`, `prescribing_doctor`, `prescription_date`, `uploaded_at`, `hospital_id`, `case_id`, `source_artifact_id` |
| `medications` | `patient_id`, `prescription_id`, `doctor_id`, `drug_name`, `dosage`, `form`, `frequency`, `time_of_day`, `duration`, `start_date`, `end_date`, `instructions`, `is_active`, `added_by`, `created_at`, `updated_at` |
| `medication_logs` | `medication_id`, `patient_id`, `status`, `scheduled_time`, `taken_at`, `notes`, `log_date`, `created_at` |
| `exercise_routines` | `patient_id`, `doctor_id`, `name`, `type`, `description`, `frequency`, `duration_minutes`, `time_of_day`, `days_of_week`, `sets`, `reps`, `is_active`, `added_by`, `created_at` |
| `exercise_logs` | `routine_id`, `patient_id`, `status`, `duration_minutes`, `notes`, `log_date`, `completed_at`, `created_at` |
| `api_keys` | `user_id`, `name`, `key`, `prefix`, `environment`, `scopes`, `last_used_at`, `request_count`, `rate_limit`, `is_active`, `expires_at`, `created_at` |
| `hospitals` | `code`, `slug`, `name`, `type`, address fields, contact fields, branding fields, `is_active`, timestamps |
| `departments` | `hospital_id`, `code`, `name`, `is_active` |
| `specialties` | `code`, `name`, `department_group`, `is_diagnostic`, `is_active` |
| `hospital_memberships` | `user_id`, `hospital_id`, `department_id`, `specialty_id`, `membership_role`, `title`, `employee_code`, `license_number`, `status`, `is_primary`, `joined_at`, `created_at` |
| `patient_hospital_links` | `patient_id`, `hospital_id`, `mrn`, `primary_doctor_membership_id`, `status`, `created_at` |
| `cases` | `hospital_id`, `patient_id`, `created_by_user_id`, `created_by_membership_id`, `source_role`, `primary_specialty_id`, `primary_doctor_membership_id`, `title`, `presenting_complaint`, `internal_summary`, `status`, `priority`, `patient_visibility_status`, timestamps |
| `case_artifacts` | `case_id`, `hospital_id`, `patient_id`, `uploaded_by_user_id`, `uploaded_by_membership_id`, `artifact_type`, `processing_pipeline`, `file_url`, `thumbnail_url`, `mime_type`, `original_filename`, `size_bytes`, `modality_hint`, `status`, `processing_result_json`, `patient_visible`, `created_at` |
| `case_assignments` | `case_id`, `assigned_to_membership_id`, `assigned_by_user_id`, `specialty_id`, `assignment_type`, `reason`, `status`, `due_at`, timestamps |
| `care_teams` | `hospital_id`, `patient_id`, `name`, `is_active`, `created_at` |
| `care_team_members` | `care_team_id`, `membership_id`, `team_role`, `is_primary`, `created_at` |
| `hospital_report_templates` | `hospital_id`, `name`, `version`, `is_default`, `is_active`, branding fields, `section_schema_json`, `disclaimer_text`, `signature_config_json`, timestamps |
| `case_reports` | `case_id`, `hospital_id`, `template_id`, `authored_by_user_id`, `authored_by_membership_id`, `status`, `title`, `content_json`, `html_snapshot`, `pdf_url`, `patient_summary`, `released_medications_json`, timestamps |
| `case_report_versions` | `report_id`, `version_number`, `edited_by_user_id`, `edited_by_membership_id`, `content_json`, `html_snapshot`, `change_summary`, `created_at` |

### API Routes Confirmed Active (from DB_CONDITION.md)

The real codebase has **50 active API route files** including routes not covered in the original plan:

| Route group | Status in original plan |
|------------|------------------------|
| `/api/users/*` | covered |
| `/api/scans`, `/api/upload` | covered |
| `/api/reports`, `/api/reports/[id]` | covered |
| `/api/appointments` | covered |
| `/api/conversations`, `/api/conversations/[id]/messages` | covered |
| `/api/medications`, `/api/medications/log` | covered |
| `/api/exercises`, `/api/exercises/log` | covered |
| `/api/notifications` | covered |
| `/api/analytics` | covered |
| `/api/family` | covered |
| `/api/developer/keys` | covered |
| `/api/doctor/*` | covered |
| `/api/ai/*` | covered |
| `/api/send-report-email`, `/api/call-reminder`, `/api/twiml-*` | covered |
| `/api/schedule-followup` | covered |
| `/api/voice-notes` | covered |
| `/api/ocr`, `/api/ocr/save` | covered |
| `/api/research`, `/api/research/stats` | covered |
| **`/api/hospitals`** | **MISSING from original plan** |
| **`/api/hospitals/[id]/patients`** | **MISSING from original plan** |
| **`/api/memberships`** | **MISSING from original plan** |
| **`/api/cases` (CRUD + sub-routes)** | **MISSING from original plan** |
| **`/api/artifacts/upload`** | **MISSING from original plan** |
| **`/api/patients/hospitals`** | **MISSING from original plan** |
| **`/api/report-templates`** | **MISSING from original plan** |
| **`/api/ml-proxy`** | **MISSING from original plan** |

---

## 2. Conflicts In Original Plan

### CONFLICT 1 — `drizzle/0000_sour_logan.sql` used as column reference (WRONG)

**Original plan states:** "verify that the SQL column names in queries match those in `drizzle/0000_sour_logan.sql` exactly"

**DB Reality:** `DB_CONDITION.md` explicitly confirms: *"drizzle/0000_sour_logan.sql is older and does not reflect the current full schema in lib/db/schema.ts."*

**Fix:** All column name verification must use `lib/db/schema.ts` as the authority. The migration SQL is stale.

---

### CONFLICT 2 — Missing `users.specialty` column usage in `reports.py` JOINs

**Original plan uses:** `d.specialty as doctor_specialty` in every report JOIN against the `users` table.

**DB Reality:** `users.specialty` **exists** in the schema and is confirmed as a column (though flagged as unused by routes). The JOIN is valid but the column is always `NULL` in practice because routes never write to it. Doctor specialty is stored in `doctor_profiles.specialty`.

**Fix:** In `reports.py` and `doctor.py`, JOIN to `doctor_profiles` to get specialty rather than reading `users.specialty`, or accept that `doctor_specialty` will always be NULL when read from `users`. Mark this as a data quality note rather than a schema bug.

---

### CONFLICT 3 — `users.role` enum is broader than the plan assumes

**Original plan role validation:** Only checks for `doctor | patient | admin`.

**DB Reality:** `users.role` enum has 5 values: `patient`, `doctor`, `admin`, `pathologist`, `hospital_admin`.

**Fix:** Update role validation in `auth.py` and `users.py` `/onboard` endpoint to allow all 5 roles. The `get_doctor()` dependency is correctly restrictive; the onboarding validator needs expanding.

---

### CONFLICT 4 — `notifications.type` enum is broader than the plan assumes

**Original plan uses:** `scan_ready`, `report_signed`, `urgent_alert`, `message_received`, `appointment_scheduled`, `scan_completed`.

**DB Reality:** Also includes `appointment` and `case_assigned` as valid enum values.

**Fix:** Router code inserting notifications must use only confirmed enum values. The `appointments.py` router currently inserts `appointment_scheduled` — this is valid. No code change needed, but `case_assigned` should be used when implementing the cases router.

---

### CONFLICT 5 — `medications` table has `doctor_id` column not reflected in original Pydantic models

**Original plan `CreateMedicationRequest`:** No `doctorId` field.

**DB Reality:** `medications.doctor_id` is a real nullable FK to `users.id`. The router logic already sets it correctly via `doctor_id = current_user["id"] if current_user["role"] == "doctor" else None`. No schema change needed but the Pydantic model should be updated for completeness.

---

### CONFLICT 6 — `exercise_logs` has `completed_at` column, not in original router

**Original plan `log_exercise` router:** Inserts `exercise_logs` without `completed_at`.

**DB Reality:** `exercise_logs.completed_at` exists as a nullable timestamp column. The router sets it correctly only for `status == "completed"`, but does not include it in INSERT for other statuses. This is correct behavior — no fix needed beyond confirming the column name.

---

### CONFLICT 7 — 8 entire route groups missing from the original plan

The original plan does not cover these active routes confirmed in the DB:

- `/api/hospitals` → reads `hospitals` table
- `/api/hospitals/[id]/patients` → reads `hospitals`, `patient_hospital_links`, `users`
- `/api/memberships` → reads/writes `hospital_memberships`
- `/api/cases` and all sub-routes (`/cases/[id]`, `/cases/[id]/artifacts`, `/cases/[id]/assignments`, `/cases/[id]/reports`)
- `/api/artifacts/upload`
- `/api/patients/hospitals`
- `/api/report-templates`
- `/api/ml-proxy`

**Fix:** These routers must be added to `backend/routers/` as new files. Their SQL queries must be written from scratch against the confirmed schema. They are grouped in Phase 1 as new required work.

---

### CONFLICT 8 — `report-templates` duplicates `templates` concept

**Original plan:** References `templates` table only via `/api/ai/report` (reads `template.structure_json`).

**DB Reality:** There are **two separate template systems**:
- `templates` table — simple AI report templates (language, structure_json)
- `hospital_report_templates` table — rich per-hospital templates with branding, versioning, section schemas, signatures

The `/api/report-templates` route serves `hospital_report_templates`, not `templates`. These are distinct entities and must not be merged.

**Fix:** `backend/routers/report_templates.py` must query `hospital_report_templates`. The existing `ai.py` router reads from `templates` and is correct as-is.

---

### CONFLICT 9 — `care_teams` and `care_team_members` exist in schema but have zero routes

**DB Reality:** Both tables exist in schema with full FK relations, but `DB_CONDITION.md` confirms all columns are unused by any current API route.

**Fix:** Do not build routers for these tables. Mark as future work. No router, no migration needed.

---

### CONFLICT 10 — `departments` and `specialties` exist in schema but have zero dedicated routes

**DB Reality:** Both tables exist. `specialties` is used via `hospital_memberships` JOINs in `/api/memberships`. `departments` is used via the same. Neither has its own CRUD routes.

**Fix:** No standalone routers needed. They appear only as JOIN targets in `memberships.py` and `hospitals.py`.

---

## 3. Overview & Philosophy

The goal is to split the monorepo into two top-level directories:

```
VaidyaVision/
├── backend/     ← Python FastAPI: ALL business logic, ML, OCR, RAG, auth verification
├── frontend/    ← Next.js: UI only + Drizzle schema (no business logic)
└── README.md
```

**Rules that must never be broken during this migration:**

- Zero UI/UX changes. Every page, component, and style stays pixel-identical.
- Zero feature regressions. Every API call that worked before must work after.
- Drizzle ORM remains in the frontend project as the canonical schema definition.
- FastAPI never imports Drizzle or TypeScript. It accesses the SQLite DB using Python's built-in `sqlite3` module with raw SQL queries that mirror the existing Drizzle queries exactly.
- The same physical SQLite file is used by both during development (`backend/data/vaidyavision.db`). The frontend's `drizzle.config.ts` simply points to this same file path.
- **Column names in all raw SQL must be verified against `lib/db/schema.ts`, not the migration SQL file.**

---

## 4. Database Strategy — Why Drizzle Stays in Frontend

### The Problem with Replacing Drizzle

Drizzle is not just an ORM — it is the **migration engine and schema source of truth**. Replacing it with SQLAlchemy would mean:

- Duplicating the schema in two languages (TypeScript + Python)
- Losing the ability to run `npx drizzle-kit generate` and `npx drizzle-kit migrate` when porting to PostgreSQL
- Breaking the existing migration history

### The Solution: Shared SQLite File + Raw SQL in FastAPI

```
┌─────────────────────────────────────────────────────────┐
│                   Single SQLite File                     │
│             backend/data/vaidyavision.db                 │
└──────────────────┬──────────────────────────────────────┘
                   │
       ┌───────────┴────────────┐
       │                        │
┌──────▼───────┐        ┌───────▼──────┐
│   FastAPI    │        │  Next.js /   │
│  (Python     │        │  Drizzle ORM │
│  sqlite3)    │        │  (schema,    │
│  READ/WRITE  │        │  migrations) │
│  via raw SQL │        │              │
└──────────────┘        └──────────────┘
```

FastAPI uses Python's built-in `sqlite3` module. Every query is a raw SQL string. There is no ORM duplication.

---

## 5. Target Directory Structure

```
VaidyaVision/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── data/
│   │   └── vaidyavision.db
│   │
│   ├── public/
│   │   ├── uploads/
│   │   │   └── prescriptions/
│   │   └── heatmaps/
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── auth.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── types.py
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── users.py
│   │   ├── scans.py
│   │   ├── reports.py
│   │   ├── appointments.py
│   │   ├── conversations.py
│   │   ├── medications.py
│   │   ├── exercises.py
│   │   ├── notifications.py
│   │   ├── analytics.py
│   │   ├── family.py
│   │   ├── developer.py
│   │   ├── doctor.py
│   │   ├── ai.py
│   │   ├── communications.py
│   │   ├── followups.py
│   │   ├── voice_notes.py
│   │   ├── ocr_routes.py
│   │   ├── hospitals.py          ← NEW (missing from original plan)
│   │   ├── memberships.py        ← NEW (missing from original plan)
│   │   ├── cases.py              ← NEW (missing from original plan)
│   │   ├── artifacts.py          ← NEW (missing from original plan)
│   │   ├── patients.py           ← NEW (missing from original plan)
│   │   └── report_templates.py   ← NEW (missing from original plan)
│   │
│   └── ml/
│       ├── inference.py
│       ├── model_defs.py
│       ├── ocr_service.py
│       ├── report_cleaner.py
│       ├── research_crawler.py
│       ├── research_embeddings.py
│       ├── research_rag.py
│       ├── server.py
│       ├── medical_ai_system_final.pth
│       ├── research_cache/
│       └── research_store/
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.mjs
    ├── middleware.ts
    ├── drizzle.config.ts
    ├── .env.local.example
    │
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── not-found.tsx
    │   ├── (marketing)/
    │   ├── sign-in/
    │   ├── sign-up/
    │   ├── onboarding/
    │   ├── dashboard/
    │   ├── doctor/
    │   └── patient/
    │
    ├── components/
    │
    ├── lib/
    │   ├── utils.ts
    │   ├── db/
    │   │   ├── schema.ts           ← UNCHANGED — canonical schema definition
    │   │   └── index.ts            ← Updated path to shared DB file
    │   └── api/
    │       ├── client.ts
    │       ├── users.ts
    │       ├── scans.ts
    │       ├── reports.ts
    │       ├── appointments.ts
    │       ├── conversations.ts
    │       ├── medications.ts
    │       ├── exercises.ts
    │       ├── notifications.ts
    │       ├── analytics.ts
    │       ├── family.ts
    │       ├── doctor.ts
    │       ├── ai.ts
    │       ├── communications.ts
    │       ├── ocr.ts
    │       ├── research.ts
    │       ├── developer.ts
    │       ├── hospitals.ts        ← NEW
    │       ├── memberships.ts      ← NEW
    │       ├── cases.ts            ← NEW
    │       └── patients.ts         ← NEW
    │
    ├── drizzle/
    │
    ├── scripts/
    │   └── seed.ts
    │
    └── public/
        ├── icons/
        └── images/
```

---

## 6. Phase 1 — Backend Implementation

### 6.1 `backend/core/config.py`

```python
# backend/core/config.py
import os
from dataclasses import dataclass

@dataclass
class Settings:
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "./data/vaidyavision.db")
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "https://api.clerk.dev/v1/jwks")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:8000")
    ML_MODEL_PATH: str = os.getenv("ML_MODEL_PATH", "./ml/medical_ai_system_final.pth")
    UPLOADS_DIR: str = os.getenv("UPLOADS_DIR", "./public/uploads")
    HEATMAPS_DIR: str = os.getenv("HEATMAPS_DIR", "./public/heatmaps")

settings = Settings()
```

---

### 6.2 `backend/core/database.py`

```python
# backend/core/database.py
import sqlite3
from contextlib import contextmanager
from .config import settings


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row) if row else None


def rows_to_list(rows) -> list:
    return [dict(r) for r in rows]
```

---

### 6.3 `backend/core/auth.py`

**CORRECTED:** `verify_onboard_role()` now validates all 5 role enum values from the schema.

```python
# backend/core/auth.py
import sqlite3
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from .config import settings
from .database import get_db, row_to_dict

security = HTTPBearer()
_jwks_client = PyJWKClient(settings.CLERK_JWKS_URL, cache_keys=True)

# All valid roles per lib/db/schema.ts users.role enum
VALID_ROLES = {"patient", "doctor", "admin", "pathologist", "hospital_admin"}


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
        return clerk_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_current_user(
    clerk_id: str = Depends(verify_clerk_token),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    row = db.execute(
        "SELECT * FROM users WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_dict(row)


def get_doctor(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")
    return current_user


def get_patient(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Patient access only")
    return current_user


def get_hospital_staff(current_user: dict = Depends(get_current_user)) -> dict:
    """Allow doctor, pathologist, or hospital_admin roles."""
    if current_user["role"] not in {"doctor", "pathologist", "hospital_admin"}:
        raise HTTPException(status_code=403, detail="Hospital staff access only")
    return current_user
```

---

### 6.4 `backend/models/types.py`

**CORRECTED:** Role validation expanded, `doctorId` added to `CreateMedicationRequest`, all field names verified against `lib/db/schema.ts`.

```python
# backend/models/types.py
from pydantic import BaseModel
from typing import Optional, List, Any


# ── Users ───────────────────────────────────────────────────────────

class SyncUserRequest(BaseModel):
    name: str
    email: str
    imageUrl: Optional[str] = None

class OnboardRequest(BaseModel):
    # All 5 values from users.role enum in lib/db/schema.ts
    role: str  # patient | doctor | admin | pathologist | hospital_admin

class CreatePatientRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None
    gender: Optional[str] = None
    bloodType: Optional[str] = None
    phone: Optional[str] = None
    medicalHistory: Optional[str] = None


# ── Scans ───────────────────────────────────────────────────────────

class UpdateScanRequest(BaseModel):
    status: Optional[str] = None
    doctorNotes: Optional[str] = None
    aiDiagnosis: Optional[str] = None
    aiConfidence: Optional[float] = None
    aiUncertainty: Optional[float] = None
    heatmapUrl: Optional[str] = None
    expertUsed: Optional[str] = None
    triageScore: Optional[int] = None


# ── Reports ─────────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    scanId: int
    diagnosis: str
    findings: str
    recommendations: Optional[str] = None
    severity: Optional[str] = "moderate"
    # language column exists in reports table (default 'en')
    language: Optional[str] = "en"


# ── Appointments ────────────────────────────────────────────────────

class CreateAppointmentRequest(BaseModel):
    doctorId: Optional[int] = None
    patientId: Optional[int] = None
    scheduledAt: str
    # type enum: initial | follow_up | emergency | review
    type: Optional[str] = "follow_up"
    notes: Optional[str] = None

class UpdateAppointmentRequest(BaseModel):
    appointmentId: int
    # status enum: scheduled | confirmed | completed | cancelled
    status: str


# ── Conversations ───────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    otherUserId: int

class SendMessageRequest(BaseModel):
    content: str
    # type enum: text | scan | report
    type: Optional[str] = "text"


# ── Medications ─────────────────────────────────────────────────────

class CreateMedicationRequest(BaseModel):
    patientId: Optional[int] = None
    # doctorId exists as medications.doctor_id FK in schema
    doctorId: Optional[int] = None
    drugName: str
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    timeOfDay: Optional[List[str]] = None
    duration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    instructions: Optional[str] = None
    prescriptionId: Optional[int] = None

class UpdateMedicationRequest(BaseModel):
    drugName: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    timeOfDay: Optional[List[str]] = None
    duration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    instructions: Optional[str] = None
    isActive: Optional[bool] = None

class LogMedicationRequest(BaseModel):
    medicationId: int
    # status enum: taken | missed | skipped
    status: str
    scheduledTime: Optional[str] = None
    notes: Optional[str] = None


# ── Exercises ───────────────────────────────────────────────────────

class CreateExerciseRequest(BaseModel):
    patientId: Optional[int] = None
    name: str
    # type enum: cardio | strength | flexibility | physio | yoga | walking | other
    type: Optional[str] = "other"
    description: Optional[str] = None
    frequency: Optional[str] = None
    durationMinutes: Optional[int] = None
    timeOfDay: Optional[str] = None
    daysOfWeek: Optional[List[str]] = None
    sets: Optional[int] = None
    reps: Optional[int] = None

class UpdateExerciseRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    durationMinutes: Optional[int] = None
    timeOfDay: Optional[str] = None
    daysOfWeek: Optional[List[str]] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    isActive: Optional[bool] = None

class LogExerciseRequest(BaseModel):
    routineId: int
    # status enum: completed | partial | skipped
    status: str
    durationMinutes: Optional[int] = None
    notes: Optional[str] = None


# ── Family ──────────────────────────────────────────────────────────

class CreateFamilyMemberRequest(BaseModel):
    name: str
    relation: str

class DeleteFamilyMemberRequest(BaseModel):
    memberId: int


# ── AI ──────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    modality: str
    diagnosis: str
    findings: str
    language: str = "en"

class TreatmentRequest(BaseModel):
    age: Optional[str] = None
    sex: Optional[str] = None
    diagnosis: str
    findings: Optional[str] = None

class SuggestRequest(BaseModel):
    messages: List[Any]
    context: Optional[str] = None


# ── Communications ──────────────────────────────────────────────────

class EmailReportRequest(BaseModel):
    scanId: int

class CallReminderRequest(BaseModel):
    patientPhone: str
    patientName: Optional[str] = "Patient"
    appointmentTime: Optional[str] = "upcoming"


# ── Follow-ups ──────────────────────────────────────────────────────

class ScheduleFollowupRequest(BaseModel):
    scanId: int
    days: int
    # type enum: email | call
    type: Optional[str] = "email"


# ── Voice Notes ─────────────────────────────────────────────────────

class VoiceNoteRequest(BaseModel):
    scanId: int
    transcription: str


# ── Doctor Profile ──────────────────────────────────────────────────

class UpdateDoctorProfileRequest(BaseModel):
    specialty: Optional[str] = None
    degree: Optional[str] = None
    licenseNumber: Optional[str] = None
    experience: Optional[int] = None


# ── Developer API Keys ──────────────────────────────────────────────

class CreateApiKeyRequest(BaseModel):
    name: str
    # environment enum: test | live
    environment: Optional[str] = "test"
    scopes: Optional[str] = "predict,ocr"


# ── Hospitals ───────────────────────────────────────────────────────

class CreateMembershipRequest(BaseModel):
    hospitalId: int
    # membership_role enum: doctor | pathologist | hospital_admin
    membershipRole: str
    title: Optional[str] = None
    employeeCode: Optional[str] = None
    licenseNumber: Optional[str] = None
    departmentId: Optional[int] = None
    specialtyId: Optional[int] = None

class UpdateMembershipRequest(BaseModel):
    membershipId: int
    isPrimary: Optional[bool] = None
    # status enum: pending | active | inactive | rejected
    status: Optional[str] = None


# ── Cases ───────────────────────────────────────────────────────────

class CreateCaseRequest(BaseModel):
    hospitalId: int
    patientId: int
    title: Optional[str] = None
    presentingComplaint: Optional[str] = None
    # source_role enum: doctor | pathologist | patient | system
    sourceRole: Optional[str] = "doctor"
    primarySpecialtyId: Optional[int] = None
    # priority enum: low | medium | high | critical
    priority: Optional[str] = "medium"

class UpdateCaseRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    internalSummary: Optional[str] = None
    title: Optional[str] = None

class CreateCaseAssignmentRequest(BaseModel):
    assignedToMembershipId: int
    # assignment_type enum: primary | consult | review
    assignmentType: Optional[str] = "primary"
    reason: Optional[str] = None
    specialtyId: Optional[int] = None

class UpdateCaseAssignmentRequest(BaseModel):
    assignmentId: int
    # status enum: pending | accepted | completed | reassigned
    status: str

class CreateCaseReportRequest(BaseModel):
    title: Optional[str] = None
    contentJson: Optional[str] = None
    templateId: Optional[int] = None

class SignCaseReportRequest(BaseModel):
    reportId: int
    htmlSnapshot: Optional[str] = None
    patientSummary: Optional[str] = None
    releasedMedicationsJson: Optional[str] = None
```

---

### 6.5 Router Implementation Pattern

Every router follows the same four-part pattern:

1. **Import** from `core.database`, `core.auth`, `models.types`
2. **Write raw SQL** with column names verified against `lib/db/schema.ts` (not the migration SQL file)
3. **Return** the result as a dict (matching the exact JSON shape the frontend expects)
4. **Never** import Drizzle, TypeScript, or SQLAlchemy

The column names in raw SQL always use the **actual DB column names** (snake_case, from `lib/db/schema.ts`), while the JSON response keys use **camelCase** (matching what the frontend currently receives).

---

### 6.6 All Routers — Corrected Implementations

#### `backend/routers/users.py`

**CORRECTED:** Onboard now validates all 5 role values.

```python
# backend/routers/users.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import verify_clerk_token, get_current_user, VALID_ROLES
from ..models.types import SyncUserRequest, OnboardRequest, CreatePatientRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@router.post("/sync")
def sync_user(
    body: SyncUserRequest,
    clerk_id: str = Depends(verify_clerk_token),
    db: sqlite3.Connection = Depends(get_db),
):
    existing = db.execute(
        "SELECT * FROM users WHERE clerk_id = ?", (clerk_id,)
    ).fetchone()

    if existing:
        db.execute(
            """UPDATE users SET name = ?, email = ?, image_url = ?
               WHERE clerk_id = ?""",
            (
                body.name or existing["name"],
                body.email or existing["email"],
                body.imageUrl or existing["image_url"],
                clerk_id,
            ),
        )
        return {"id": existing["id"], "updated": True}

    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO users (clerk_id, role, name, email, image_url, is_onboarded, created_at)
           VALUES (?, 'patient', ?, ?, ?, 0, ?)""",
        (clerk_id, body.name or "Anonymous User", body.email or "", body.imageUrl, now),
    )
    return {"id": cursor.lastrowid, "created": True}


@router.post("/onboard")
def onboard_user(
    body: OnboardRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    # CORRECTED: validates against full enum from lib/db/schema.ts
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Valid roles: {VALID_ROLES}")
    if current_user["is_onboarded"]:
        raise HTTPException(status_code=409, detail="Already onboarded")

    db.execute(
        "UPDATE users SET role = ?, is_onboarded = 1 WHERE id = ?",
        (body.role, current_user["id"]),
    )
    return {"success": True, "role": body.role}


@router.get("/patients")
def list_patients(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")
    rows = db.execute(
        """SELECT id, name, email, image_url, age, gender, blood_type, phone,
                  medical_history, created_at
           FROM users WHERE role = 'patient'"""
    ).fetchall()
    return {"patients": rows_to_list(rows)}


@router.post("/patients", status_code=201)
def create_patient(
    body: CreatePatientRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    existing = db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    now = datetime.datetime.utcnow().isoformat()
    fake_clerk_id = f"doctor_added_{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    cursor = db.execute(
        """INSERT INTO users
           (clerk_id, role, name, email, age, gender, blood_type, phone,
            medical_history, is_onboarded, created_at)
           VALUES (?, 'patient', ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
        (
            fake_clerk_id, body.name, body.email, body.age, body.gender,
            body.bloodType, body.phone, body.medicalHistory, now,
        ),
    )
    patient = db.execute(
        "SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"patient": row_to_dict(patient)}
```

---

#### `backend/routers/scans.py`

No changes to business logic — all column names (`uploaded_at`, `triage_score`, `ai_diagnosis`, etc.) are confirmed correct against `lib/db/schema.ts`.

```python
# backend/routers/scans.py
# [Implementation unchanged from original plan — all column names verified correct]
# Key column names confirmed in schema:
#   scans.uploaded_at, scans.reviewed_at, scans.triage_score, scans.ai_diagnosis,
#   scans.ai_confidence, scans.ai_uncertainty, scans.heatmap_url, scans.expert_used,
#   scans.doctor_notes, scans.original_filename, scans.patient_id, scans.doctor_id
# See original plan Section 4.6 for full implementation.
```

---

#### `backend/routers/reports.py`

**CORRECTED:** `doctor_specialty` JOIN changed to pull from `doctor_profiles` instead of `users.specialty` (which is always NULL in practice).

```python
# backend/routers/reports.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user, get_doctor
from ..models.types import CreateReportRequest

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
def list_reports(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    if current_user["role"] == "doctor":
        rows = db.execute(
            """SELECT r.*,
                      s.modality, s.image_url, s.heatmap_url, s.ai_diagnosis, s.ai_confidence,
                      p.name as patient_name, p.email as patient_email,
                      d.name as doctor_name,
                      dp.specialty as doctor_specialty
               FROM reports r
               LEFT JOIN scans s ON r.scan_id = s.id
               LEFT JOIN users p ON r.patient_id = p.id
               LEFT JOIN users d ON r.doctor_id = d.id
               LEFT JOIN doctor_profiles dp ON dp.user_id = r.doctor_id
               WHERE r.doctor_id = ?
               ORDER BY r.created_at DESC""",
            (current_user["id"],),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT r.*,
                      s.modality, s.image_url, s.heatmap_url,
                      d.name as doctor_name,
                      dp.specialty as doctor_specialty
               FROM reports r
               LEFT JOIN scans s ON r.scan_id = s.id
               LEFT JOIN users d ON r.doctor_id = d.id
               LEFT JOIN doctor_profiles dp ON dp.user_id = r.doctor_id
               WHERE r.patient_id = ?
               ORDER BY r.created_at DESC""",
            (current_user["id"],),
        ).fetchall()
    return {"reports": rows_to_list(rows)}


@router.get("/{report_id}")
def get_report(
    report_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    row = db.execute(
        """SELECT r.*,
                  s.modality, s.image_url, s.heatmap_url, s.ai_diagnosis, s.ai_confidence,
                  p.name as patient_name, p.email as patient_email, p.age as patient_age,
                  d.name as doctor_name, d.email as doctor_email,
                  dp.specialty as doctor_specialty
           FROM reports r
           LEFT JOIN scans s ON r.scan_id = s.id
           LEFT JOIN users p ON r.patient_id = p.id
           LEFT JOIN users d ON r.doctor_id = d.id
           LEFT JOIN doctor_profiles dp ON dp.user_id = r.doctor_id
           WHERE r.id = ?""",
        (report_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    report = row_to_dict(row)
    if current_user["role"] == "patient" and report["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"report": report}


@router.post("")
def create_report(
    body: CreateReportRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    scan = db.execute(
        "SELECT patient_id FROM scans WHERE id = ?", (body.scanId,)
    ).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    now = datetime.datetime.utcnow().isoformat()
    # language column confirmed in reports table (default 'en')
    cursor = db.execute(
        """INSERT INTO reports
           (scan_id, patient_id, doctor_id, diagnosis, findings,
            recommendations, severity, status, language, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'signed', ?, ?)""",
        (
            body.scanId, scan["patient_id"], current_user["id"],
            body.diagnosis, body.findings,
            body.recommendations, body.severity or "moderate",
            body.language or "en", now,
        ),
    )
    db.execute(
        "UPDATE scans SET status = 'completed', doctor_id = ?, reviewed_at = ? WHERE id = ?",
        (current_user["id"], now, body.scanId),
    )
    report = db.execute(
        "SELECT * FROM reports WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"report": row_to_dict(report)}
```

---

#### `backend/routers/appointments.py`, `conversations.py`, `medications.py`, `exercises.py`, `notifications.py`, `analytics.py`, `family.py`, `doctor.py`, `ai.py`, `communications.py`, `followups.py`, `voice_notes.py`, `ocr_routes.py`, `developer.py`

All column names in these routers are confirmed correct against `lib/db/schema.ts`. Implementations remain as in the original plan with one correction:

**`doctor.py` specialty JOIN:** Same fix as `reports.py` — replace `d.specialty as doctor_specialty` (reads from `users.specialty` which is always NULL) with a JOIN to `doctor_profiles`:

```python
# In doctor.py get_patient_history, join doctor_profiles where needed:
LEFT JOIN doctor_profiles dp ON dp.user_id = s.doctor_id
```

---

### 6.7 New Routers Required by Real DB Routes

These routers are **missing from the original plan** and must be created.

#### `backend/routers/hospitals.py`

```python
# backend/routers/hospitals.py
import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.get("")
def list_hospitals(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/hospitals GET — lists active hospitals"""
    rows = db.execute(
        """SELECT id, code, slug, name, type, city, state, phone, email,
                  logo_url, is_active
           FROM hospitals WHERE is_active = 1
           ORDER BY name ASC"""
    ).fetchall()
    return {"hospitals": rows_to_list(rows)}


@router.get("/{hospital_id}/patients")
def list_hospital_patients(
    hospital_id: int,
    search: str = "",
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/hospitals/[id]/patients GET — hospital patient search"""
    sql = """
        SELECT u.id, u.name, u.email, u.age, u.gender, u.phone, u.image_url,
               phl.mrn, phl.status as link_status
        FROM patient_hospital_links phl
        JOIN users u ON phl.patient_id = u.id
        WHERE phl.hospital_id = ?
    """
    params = [hospital_id]
    if search:
        sql += " AND (u.name LIKE ? OR u.email LIKE ? OR phl.mrn LIKE ?)"
        like = f"%{search}%"
        params += [like, like, like]
    sql += " ORDER BY u.name ASC"
    rows = db.execute(sql, params).fetchall()
    return {"patients": rows_to_list(rows)}
```

---

#### `backend/routers/memberships.py`

```python
# backend/routers/memberships.py
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from ..models.types import CreateMembershipRequest, UpdateMembershipRequest

router = APIRouter(prefix="/memberships", tags=["memberships"])


@router.get("")
def list_memberships(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/memberships GET"""
    rows = db.execute(
        """SELECT hm.*, h.name as hospital_name, h.logo_url,
                  s.name as specialty_name, d.name as department_name
           FROM hospital_memberships hm
           JOIN hospitals h ON hm.hospital_id = h.id
           LEFT JOIN specialties s ON hm.specialty_id = s.id
           LEFT JOIN departments d ON hm.department_id = d.id
           WHERE hm.user_id = ?
           ORDER BY hm.is_primary DESC, hm.created_at DESC""",
        (current_user["id"],),
    ).fetchall()
    return {"memberships": rows_to_list(rows)}


@router.post("")
def create_membership(
    body: CreateMembershipRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/memberships POST"""
    import datetime
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO hospital_memberships
           (user_id, hospital_id, membership_role, title, employee_code,
            license_number, department_id, specialty_id, status, is_primary, joined_at, created_at)
           VALUES (?,?,?,?,?,?,?,?,'active',0,?,?)""",
        (
            current_user["id"], body.hospitalId, body.membershipRole,
            body.title, body.employeeCode, body.licenseNumber,
            body.departmentId, body.specialtyId, now, now,
        ),
    )
    membership = db.execute(
        "SELECT * FROM hospital_memberships WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"membership": row_to_dict(membership)}


@router.patch("")
def update_membership(
    body: UpdateMembershipRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/memberships PATCH — toggle is_primary"""
    if body.isPrimary is not None:
        # Clear all other primaries for this role first
        membership = db.execute(
            "SELECT * FROM hospital_memberships WHERE id = ?", (body.membershipId,)
        ).fetchone()
        if membership:
            db.execute(
                """UPDATE hospital_memberships SET is_primary = 0
                   WHERE user_id = ? AND membership_role = ?""",
                (current_user["id"], membership["membership_role"]),
            )
        db.execute(
            "UPDATE hospital_memberships SET is_primary = ? WHERE id = ? AND user_id = ?",
            (1 if body.isPrimary else 0, body.membershipId, current_user["id"]),
        )
    if body.status is not None:
        db.execute(
            "UPDATE hospital_memberships SET status = ? WHERE id = ? AND user_id = ?",
            (body.status, body.membershipId, current_user["id"]),
        )
    return {"success": True}
```

---

#### `backend/routers/cases.py`

```python
# backend/routers/cases.py
import sqlite3
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user, get_hospital_staff
from ..models.types import (
    CreateCaseRequest, UpdateCaseRequest,
    CreateCaseAssignmentRequest, UpdateCaseAssignmentRequest,
    CreateCaseReportRequest, SignCaseReportRequest,
)

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("")
def list_cases(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases GET — role/hospital scoped"""
    uid = current_user["id"]
    role = current_user["role"]
    if role == "patient":
        rows = db.execute(
            """SELECT c.*, h.name as hospital_name
               FROM cases c JOIN hospitals h ON c.hospital_id = h.id
               WHERE c.patient_id = ? AND c.patient_visibility_status = 'released'
               ORDER BY c.created_at DESC""",
            (uid,),
        ).fetchall()
    else:
        rows = db.execute(
            """SELECT c.*, h.name as hospital_name,
                      p.name as patient_name, p.email as patient_email
               FROM cases c
               JOIN hospitals h ON c.hospital_id = h.id
               JOIN users p ON c.patient_id = p.id
               WHERE c.created_by_user_id = ? OR EXISTS (
                   SELECT 1 FROM case_assignments ca
                   JOIN hospital_memberships hm ON ca.assigned_to_membership_id = hm.id
                   WHERE ca.case_id = c.id AND hm.user_id = ?
               )
               ORDER BY c.created_at DESC""",
            (uid, uid),
        ).fetchall()
    return {"cases": rows_to_list(rows)}


@router.post("")
def create_case(
    body: CreateCaseRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases POST"""
    now = datetime.datetime.utcnow().isoformat()
    membership = db.execute(
        """SELECT id FROM hospital_memberships
           WHERE user_id = ? AND hospital_id = ? AND status = 'active' LIMIT 1""",
        (current_user["id"], body.hospitalId),
    ).fetchone()
    membership_id = membership["id"] if membership else None

    cursor = db.execute(
        """INSERT INTO cases
           (hospital_id, patient_id, created_by_user_id, created_by_membership_id,
            source_role, primary_specialty_id, title, presenting_complaint,
            status, priority, patient_visibility_status, opened_at, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,'new',?,?,?,?,?)""",
        (
            body.hospitalId, body.patientId, current_user["id"], membership_id,
            body.sourceRole or "doctor", body.primarySpecialtyId,
            body.title, body.presentingComplaint,
            body.priority or "medium", "hidden", now, now, now,
        ),
    )
    case_id = cursor.lastrowid
    case = db.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    return {"case": row_to_dict(case)}


@router.get("/{case_id}")
def get_case(
    case_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id] GET"""
    row = db.execute(
        """SELECT c.*, h.name as hospital_name,
                  p.name as patient_name, p.email as patient_email
           FROM cases c
           JOIN hospitals h ON c.hospital_id = h.id
           JOIN users p ON c.patient_id = p.id
           WHERE c.id = ?""",
        (case_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"case": row_to_dict(row)}


@router.patch("/{case_id}")
def update_case(
    case_id: int,
    body: UpdateCaseRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id] PATCH"""
    now = datetime.datetime.utcnow().isoformat()
    fields, values = ["updated_at = ?"], [now]
    if body.status:
        fields.append("status = ?"); values.append(body.status)
    if body.priority:
        fields.append("priority = ?"); values.append(body.priority)
    if body.internalSummary is not None:
        fields.append("internal_summary = ?"); values.append(body.internalSummary)
    if body.title is not None:
        fields.append("title = ?"); values.append(body.title)
    values.append(case_id)
    db.execute(f"UPDATE cases SET {', '.join(fields)} WHERE id = ?", values)
    return {"success": True}


@router.get("/{case_id}/artifacts")
def list_case_artifacts(
    case_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/artifacts GET"""
    if current_user["role"] == "patient":
        rows = db.execute(
            """SELECT * FROM case_artifacts
               WHERE case_id = ? AND patient_id = ? AND patient_visible = 1
               ORDER BY created_at DESC""",
            (case_id, current_user["id"]),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM case_artifacts WHERE case_id = ? ORDER BY created_at DESC",
            (case_id,),
        ).fetchall()
    return {"artifacts": rows_to_list(rows)}


@router.get("/{case_id}/assignments")
def list_case_assignments(
    case_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/assignments GET"""
    rows = db.execute(
        """SELECT ca.*, hm.title as assignee_title,
                  u.name as assignee_name, u.email as assignee_email
           FROM case_assignments ca
           JOIN hospital_memberships hm ON ca.assigned_to_membership_id = hm.id
           JOIN users u ON hm.user_id = u.id
           WHERE ca.case_id = ?
           ORDER BY ca.created_at DESC""",
        (case_id,),
    ).fetchall()
    return {"assignments": rows_to_list(rows)}


@router.post("/{case_id}/assignments")
def create_assignment(
    case_id: int,
    body: CreateCaseAssignmentRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/assignments POST"""
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO case_assignments
           (case_id, assigned_to_membership_id, assigned_by_user_id,
            specialty_id, assignment_type, reason, status, created_at)
           VALUES (?,?,?,?,?,'pending',?,?)""",
        (
            case_id, body.assignedToMembershipId, current_user["id"],
            body.specialtyId, body.assignmentType or "primary",
            body.reason, now,
        ),
    )
    assignment = db.execute(
        "SELECT * FROM case_assignments WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"assignment": row_to_dict(assignment)}


@router.patch("/{case_id}/assignments")
def update_assignment(
    case_id: int,
    body: UpdateCaseAssignmentRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/assignments PATCH — accept/complete"""
    now = datetime.datetime.utcnow().isoformat()
    extra_fields = ""
    if body.status == "accepted":
        extra_fields = ", accepted_at = ?"
    elif body.status == "completed":
        extra_fields = ", completed_at = ?"
    sql = f"UPDATE case_assignments SET status = ?{extra_fields} WHERE id = ?"
    params = [body.status]
    if extra_fields:
        params.append(now)
    params.append(body.assignmentId)
    db.execute(sql, params)
    return {"success": True}


@router.get("/{case_id}/reports")
def list_case_reports(
    case_id: int,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/reports GET"""
    rows = db.execute(
        """SELECT cr.*, u.name as author_name
           FROM case_reports cr
           JOIN users u ON cr.authored_by_user_id = u.id
           WHERE cr.case_id = ?
           ORDER BY cr.created_at DESC""",
        (case_id,),
    ).fetchall()
    return {"reports": rows_to_list(rows)}


@router.post("/{case_id}/reports")
def create_case_report(
    case_id: int,
    body: CreateCaseReportRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/reports POST"""
    now = datetime.datetime.utcnow().isoformat()
    case = db.execute("SELECT hospital_id FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    membership = db.execute(
        """SELECT id FROM hospital_memberships
           WHERE user_id = ? AND hospital_id = ? AND status = 'active' LIMIT 1""",
        (current_user["id"], case["hospital_id"]),
    ).fetchone()

    cursor = db.execute(
        """INSERT INTO case_reports
           (case_id, hospital_id, template_id, authored_by_user_id, authored_by_membership_id,
            status, title, content_json, created_at, updated_at)
           VALUES (?,?,?,?,?,'draft',?,?,?,?)""",
        (
            case_id, case["hospital_id"], body.templateId,
            current_user["id"], membership["id"] if membership else None,
            body.title, body.contentJson, now, now,
        ),
    )
    report_id = cursor.lastrowid
    # Create version 1
    db.execute(
        """INSERT INTO case_report_versions
           (report_id, version_number, edited_by_user_id, edited_by_membership_id,
            content_json, created_at)
           VALUES (?,1,?,?,?,?)""",
        (
            report_id, current_user["id"],
            membership["id"] if membership else None,
            body.contentJson, now,
        ),
    )
    report = db.execute("SELECT * FROM case_reports WHERE id = ?", (report_id,)).fetchone()
    return {"report": row_to_dict(report)}


@router.patch("/{case_id}/reports")
def sign_case_report(
    case_id: int,
    body: SignCaseReportRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/cases/[id]/reports PATCH — sign/release flow"""
    now = datetime.datetime.utcnow().isoformat()
    db.execute(
        """UPDATE case_reports
           SET status = 'signed', signed_at = ?, html_snapshot = ?,
               patient_summary = ?, released_medications_json = ?, updated_at = ?
           WHERE id = ? AND case_id = ?""",
        (
            now, body.htmlSnapshot, body.patientSummary,
            body.releasedMedicationsJson, now, body.reportId, case_id,
        ),
    )
    db.execute(
        "UPDATE cases SET status = 'signed', updated_at = ? WHERE id = ?",
        (now, case_id),
    )
    return {"success": True}
```

---

#### `backend/routers/artifacts.py`

```python
# backend/routers/artifacts.py
import sqlite3
import os
import uuid
import datetime
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from ..core.database import get_db, row_to_dict
from ..core.auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("/upload")
async def upload_artifact(
    file: UploadFile = File(...),
    caseId: int = Form(...),
    hospitalId: int = Form(...),
    # artifact_type enum: scan_image | pathology_image | lab_pdf | prescription_image | report_pdf | other
    artifactType: str = Form("other"),
    # processing_pipeline enum: ml_scan | ocr_doc | none
    processingPipeline: str = Form("none"),
    modalityHint: str = Form(None),
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/artifacts/upload POST"""
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    ext = (file.filename or "bin").split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOADS_DIR, filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/public/uploads/{filename}"
    now = datetime.datetime.utcnow().isoformat()

    membership = db.execute(
        "SELECT id FROM hospital_memberships WHERE user_id = ? AND hospital_id = ? AND status='active' LIMIT 1",
        (current_user["id"], hospitalId),
    ).fetchone()

    case = db.execute("SELECT patient_id FROM cases WHERE id = ?", (caseId,)).fetchone()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    cursor = db.execute(
        """INSERT INTO case_artifacts
           (case_id, hospital_id, patient_id, uploaded_by_user_id,
            uploaded_by_membership_id, artifact_type, processing_pipeline,
            file_url, original_filename, size_bytes, mime_type,
            modality_hint, status, patient_visible, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'uploaded',0,?)""",
        (
            caseId, hospitalId, case["patient_id"], current_user["id"],
            membership["id"] if membership else None,
            artifactType, processingPipeline,
            file_url, file.filename, len(contents),
            file.content_type, modalityHint, now,
        ),
    )
    artifact = db.execute(
        "SELECT * FROM case_artifacts WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"artifact": row_to_dict(artifact)}
```

---

#### `backend/routers/patients.py`

```python
# backend/routers/patients.py
import sqlite3
from fastapi import APIRouter, Depends
from ..core.database import get_db, rows_to_list
from ..core.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/hospitals")
def get_patient_hospitals(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/patients/hospitals GET — patient's linked hospitals"""
    rows = db.execute(
        """SELECT phl.*, h.name as hospital_name, h.logo_url, h.city, h.type
           FROM patient_hospital_links phl
           JOIN hospitals h ON phl.hospital_id = h.id
           WHERE phl.patient_id = ?
           ORDER BY phl.created_at DESC""",
        (current_user["id"],),
    ).fetchall()
    return {"hospitals": rows_to_list(rows)}
```

---

#### `backend/routers/report_templates.py`

```python
# backend/routers/report_templates.py
import sqlite3
import datetime
from fastapi import APIRouter, Depends
from ..core.database import get_db, row_to_dict, rows_to_list
from ..core.auth import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/report-templates", tags=["report-templates"])


class CreateTemplateRequest(BaseModel):
    hospitalId: int
    name: str
    isDefault: Optional[bool] = False
    sectionSchemaJson: Optional[str] = None
    disclaimerText: Optional[str] = None


@router.get("")
def list_report_templates(
    hospitalId: int = None,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/report-templates GET — list hospital_report_templates"""
    # Note: This reads from hospital_report_templates, NOT the simple templates table
    if hospitalId:
        rows = db.execute(
            """SELECT * FROM hospital_report_templates
               WHERE hospital_id = ? AND is_active = 1
               ORDER BY is_default DESC, name ASC""",
            (hospitalId,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM hospital_report_templates WHERE is_active = 1 ORDER BY name ASC"
        ).fetchall()
    return {"templates": rows_to_list(rows)}


@router.post("")
def create_report_template(
    body: CreateTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    """Matches /api/report-templates POST"""
    now = datetime.datetime.utcnow().isoformat()
    cursor = db.execute(
        """INSERT INTO hospital_report_templates
           (hospital_id, name, version, is_default, is_active,
            section_schema_json, disclaimer_text, created_at, updated_at)
           VALUES (?,?,1,?,1,?,?,?,?)""",
        (
            body.hospitalId, body.name,
            1 if body.isDefault else 0,
            body.sectionSchemaJson, body.disclaimerText,
            now, now,
        ),
    )
    template = db.execute(
        "SELECT * FROM hospital_report_templates WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"template": row_to_dict(template)}
```

---

### 6.8 `backend/main.py`

**CORRECTED:** Includes all new routers.

```python
# backend/main.py
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ml"))

from routers import (
    users, scans, reports, appointments, conversations,
    medications, exercises, notifications, analytics,
    family, developer, doctor, ai, communications,
    followups, voice_notes, ocr_routes,
    # NEW routers not in original plan:
    hospitals, memberships, cases, artifacts, patients, report_templates,
)

app = FastAPI(
    title="VaidyaVision API",
    version="2.0.0",
    description="Unified backend for VaidyaVision medical AI platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("./public/uploads", exist_ok=True)
os.makedirs("./public/heatmaps", exist_ok=True)
os.makedirs("./public/uploads/prescriptions", exist_ok=True)
app.mount("/public", StaticFiles(directory="./public"), name="public")

# Original routers
app.include_router(users.router)
app.include_router(scans.router)
app.include_router(reports.router)
app.include_router(appointments.router)
app.include_router(conversations.router)
app.include_router(medications.router)
app.include_router(exercises.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(family.router)
app.include_router(developer.router)
app.include_router(doctor.router)
app.include_router(ai.router)
app.include_router(communications.router)
app.include_router(followups.router)
app.include_router(voice_notes.router)
app.include_router(ocr_routes.router)

# NEW routers required by real API routes
app.include_router(hospitals.router)
app.include_router(memberships.router)
app.include_router(cases.router)
app.include_router(artifacts.router)
app.include_router(patients.router)
app.include_router(report_templates.router)

# ML + Research re-exported from ml/server.py
from ml.server import (
    predict_endpoint, ocr_extract, ocr_clean_report,
    ocr_prescriptions_only, research_ask, research_crawl,
    research_stats, research_export_qa,
)
app.add_api_route("/ml/predict", predict_endpoint, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/extract", ocr_extract, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/clean-report", ocr_clean_report, methods=["POST"], tags=["ml"])
app.add_api_route("/ml/ocr/prescriptions-only", ocr_prescriptions_only, methods=["POST"], tags=["ml"])
app.add_api_route("/research/ask", research_ask, methods=["POST"], tags=["research"])
app.add_api_route("/research/crawl-latest", research_crawl, methods=["POST"], tags=["research"])
app.add_api_route("/research/stats", research_stats, methods=["GET"], tags=["research"])
app.add_api_route("/research/export-qa", research_export_qa, methods=["GET"], tags=["research"])

# ml-proxy passthrough
@app.post("/ml-proxy", tags=["ml"])
async def ml_proxy(request_body: dict):
    """Matches /api/ml-proxy — passthrough to ML inference"""
    import httpx
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{settings.APP_URL}/ml/predict", json=request_body)
    return resp.json()


@app.on_event("startup")
def startup():
    try:
        from ml.inference import load_models
        if os.path.isfile(settings.ML_MODEL_PATH):
            load_models(settings.ML_MODEL_PATH)
            print("[INFO] ML models loaded successfully.")
        else:
            print(f"[WARN] Model file not found at {settings.ML_MODEL_PATH}.")
    except Exception as e:
        print(f"[WARN] Could not load ML models: {e}")


@app.get("/health")
def health():
    return {"status": "online", "service": "VaidyaVision API v2"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

---

### 6.9 `backend/requirements.txt`

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
PyJWT>=2.8.0
cryptography>=41.0.0
httpx>=0.25.0
python-multipart>=0.0.6
pydantic>=2.0.0
pydantic-settings>=2.0.0
twilio>=5.12.1
resend>=6.9.2
torch>=2.1.0
torchvision>=0.16.0
timm>=0.9.12
Pillow>=10.1.0
numpy>=1.26.0
opencv-python-headless>=4.8.0
pytesseract>=0.3.10
pdf2image>=1.16.3
google-cloud-vision>=3.5.0
firecrawl-py>=1.0.0
rank-bm25>=0.2.2
```

---

## 7. Phase 2 — Frontend Implementation

### 7.1 What Stays Exactly the Same (Zero Changes)

```
app/(marketing)/
app/sign-in/
app/sign-up/
app/globals.css
app/layout.tsx
app/not-found.tsx
components/games/
components/marketing/
tailwind.config.ts
middleware.ts
drizzle/
lib/db/schema.ts       ← UNCHANGED — still the canonical schema
```

### 7.2 What Gets Removed

```
app/api/               ← DELETE ENTIRE DIRECTORY
```

### 7.3 `frontend/lib/db/index.ts` (Updated DB Path Only)

```typescript
// frontend/lib/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "..", "backend", "data", "vaidyavision.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
```

### 7.4 `frontend/drizzle.config.ts`

```typescript
// frontend/drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  driver: "better-sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "../backend/data/vaidyavision.db",
  },
} satisfies Config;
```

### 7.5 `frontend/lib/api/client.ts`

```typescript
// frontend/lib/api/client.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers });
}

export async function serverFetch(path: string): Promise<Response> {
  const { auth } = await import("@clerk/nextjs/server");
  const { getToken } = await auth();
  const token = await getToken();
  return apiFetch(path, token);
}
```

### 7.6 New Frontend API Client Files

In addition to the API client files listed in the original plan, add:

```typescript
// frontend/lib/api/hospitals.ts
import { apiFetch } from "./client";

export const hospitalsApi = {
  list: (token: string) =>
    apiFetch("/hospitals", token).then((r) => r.json()),

  listPatients: (token: string, hospitalId: number, search?: string) =>
    apiFetch(`/hospitals/${hospitalId}/patients${search ? `?search=${search}` : ""}`, token).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/memberships.ts
import { apiFetch } from "./client";

export const membershipsApi = {
  list: (token: string) =>
    apiFetch("/memberships", token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/memberships", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  update: (token: string, data: object) =>
    apiFetch("/memberships", token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/cases.ts
import { apiFetch } from "./client";

export const casesApi = {
  list: (token: string) =>
    apiFetch("/cases", token).then((r) => r.json()),

  create: (token: string, data: object) =>
    apiFetch("/cases", token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  get: (token: string, id: number) =>
    apiFetch(`/cases/${id}`, token).then((r) => r.json()),

  update: (token: string, id: number, data: object) =>
    apiFetch(`/cases/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),

  listArtifacts: (token: string, id: number) =>
    apiFetch(`/cases/${id}/artifacts`, token).then((r) => r.json()),

  listAssignments: (token: string, id: number) =>
    apiFetch(`/cases/${id}/assignments`, token).then((r) => r.json()),

  createAssignment: (token: string, id: number, data: object) =>
    apiFetch(`/cases/${id}/assignments`, token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  updateAssignment: (token: string, id: number, data: object) =>
    apiFetch(`/cases/${id}/assignments`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),

  listReports: (token: string, id: number) =>
    apiFetch(`/cases/${id}/reports`, token).then((r) => r.json()),

  createReport: (token: string, id: number, data: object) =>
    apiFetch(`/cases/${id}/reports`, token, { method: "POST", body: JSON.stringify(data) }).then((r) => r.json()),

  signReport: (token: string, id: number, data: object) =>
    apiFetch(`/cases/${id}/reports`, token, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.json()),
};
```

```typescript
// frontend/lib/api/patients.ts
import { apiFetch } from "./client";

export const patientsApi = {
  getHospitals: (token: string) =>
    apiFetch("/patients/hospitals", token).then((r) => r.json()),
};
```

### 7.7 URL Replacement Map

This is the complete list of every `fetch("/api/...")` call and its new backend URL. All calls from the original plan remain valid. Additional calls for new routes:

| File | Old URL | New URL |
|---|---|---|
| `app/onboarding/page.tsx` | `/api/users/sync` | `/users/sync` |
| `app/onboarding/page.tsx` | `/api/users/me` | `/users/me` |
| `app/onboarding/page.tsx` | `/api/users/onboard` | `/users/onboard` |
| `app/dashboard/page.tsx` | `/api/users/me` (server) | `serverFetch("/users/me")` |
| `app/doctor/page.tsx` | `/api/doctor/stats` | `/doctor/stats` |
| `app/doctor/page.tsx` | `/api/appointments` | `/appointments` |
| `app/doctor/queue/page.tsx` | `/api/scans?status=pending` | `/scans?status=pending` |
| `app/doctor/scan/[id]/page.tsx` | `/api/scans/${id}` | `/scans/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `http://localhost:8000/predict` | `/ml/predict` |
| `app/doctor/scan/[id]/page.tsx` | `/api/scans/${id}` PATCH | `/scans/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `/api/ai/treatment` | `/ai/treatment` |
| `app/doctor/scan/[id]/page.tsx` | `/api/ai/report` | `/ai/report` |
| `app/doctor/scan/[id]/page.tsx` | `/api/reports` | `/reports` |
| `app/doctor/scan/[id]/page.tsx` | `/api/reports/${id}` | `/reports/${id}` |
| `app/doctor/scan/[id]/page.tsx` | `/api/send-report-email` | `/communications/email` |
| `app/doctor/scan/[id]/page.tsx` | `/api/call-reminder` | `/communications/call` |
| `app/doctor/scan/new/page.tsx` | `/api/upload` | `/scans/upload` |
| `app/doctor/patients/page.tsx` | `/api/users/patients` | `/users/patients` |
| `app/doctor/patients/[id]/page.tsx` | `/api/doctor/patients/${id}` | `/doctor/patients/${id}` |
| `app/doctor/prescriptions/page.tsx` | `/api/medications` | `/medications` |
| `app/doctor/prescriptions/page.tsx` | `/api/medications/${id}` | `/medications/${id}` |
| `app/doctor/prescriptions/page.tsx` | `/api/exercises` | `/exercises` |
| `app/doctor/prescriptions/page.tsx` | `/api/exercises/${id}` | `/exercises/${id}` |
| `app/doctor/scan/prescriptions/page.tsx` | `/api/ocr` | `/ocr/process` |
| `app/doctor/scan/prescriptions/page.tsx` | `/api/ocr/save` | `/ocr/save` |
| `app/doctor/profile/page.tsx` | `/api/doctor/profile` | `/doctor/profile` |
| `app/doctor/developer/page.tsx` | `/api/developer/keys` | `/developer/keys` |
| `app/patient/page.tsx` | `/api/analytics` | `/analytics` |
| `app/patient/scans/page.tsx` | `/api/scans` | `/scans` |
| `app/patient/scans/[id]/page.tsx` | `/api/scans/${id}` | `/scans/${id}` |
| `app/patient/scans/[id]/page.tsx` | `/api/reports` | `/reports` |
| `app/patient/upload/page.tsx` | `/api/upload` | `/scans/upload` |
| `app/patient/upload-prescription/page.tsx` | `/api/ocr` | `/ocr/process` |
| `app/patient/upload-prescription/page.tsx` | `/api/ocr/save` | `/ocr/save` |
| `app/patient/medications/page.tsx` | `/api/medications` | `/medications` |
| `app/patient/medications/page.tsx` | `/api/medications/${id}` | `/medications/${id}` |
| `app/patient/medications/page.tsx` | `/api/medications/log` | `/medications/log` |
| `app/patient/exercise/page.tsx` | `/api/exercises` | `/exercises` |
| `app/patient/exercise/page.tsx` | `/api/exercises/${id}` | `/exercises/${id}` |
| `app/patient/exercise/page.tsx` | `/api/exercises/log` | `/exercises/log` |
| `app/patient/family/page.tsx` | `/api/family` | `/family` |
| `app/patient/reports/[id]/page.tsx` | `/api/reports/${id}` | `/reports/${id}` |
| `components/layout/TopNav.tsx` | `/api/notifications` | `/notifications` |
| `components/layout/TopNav.tsx` | `/api/notifications` PATCH | `/notifications` |
| `components/chat/ChatView.tsx` | `/api/conversations` | `/conversations` |
| `components/chat/ChatView.tsx` | `/api/conversations/${id}/messages` | `/conversations/${id}/messages` |
| `components/chat/ChatView.tsx` | `/api/ai/suggest` | `/ai/suggest` |
| `components/appointments/AppointmentView.tsx` | `/api/appointments` | `/appointments` |
| `components/reports/ReportList.tsx` | `/api/reports` | `/reports` |
| `components/research/ResearchPage.tsx` | `/api/research` | `/research/ask` |
| `components/research/ResearchPage.tsx` | `/api/research/stats` | `/research/stats` |
| `components/VoiceNote.tsx` | `/api/voice-notes` | `/voice-notes` |
| Any hospital management page | `/api/hospitals` | `/hospitals` |
| Any hospital management page | `/api/hospitals/${id}/patients` | `/hospitals/${id}/patients` |
| Any membership page | `/api/memberships` | `/memberships` |
| Any cases page | `/api/cases` | `/cases` |
| Any cases page | `/api/cases/${id}/*` | `/cases/${id}/*` |
| Any patient portal | `/api/patients/hospitals` | `/patients/hospitals` |
| Any template page | `/api/report-templates` | `/report-templates` |
| Any ML proxy page | `/api/ml-proxy` | `/ml-proxy` |
| Any artifact upload | `/api/artifacts/upload` | `/artifacts/upload` |

### 7.8 `frontend/next.config.mjs`

```javascript
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/public/:path*",
        destination: `${backendUrl}/public/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

### 7.9 `frontend/package.json` Changes

**Remove:**
```json
"better-sqlite3": "..."
```

**Remove scripts:**
```json
"db:push": "..."
```

**Keep:**
```json
"drizzle-orm": "...",
"drizzle-kit": "..."
```

**Keep scripts:**
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx scripts/seed.ts"
```

**`.env.local`:**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
DB_PATH=../backend/data/vaidyavision.db
```

---

## 8. Phase 3 — File Migration Checklist

### Files that MOVE:

```
medical-ai-platform/ml-service/          → backend/ml/
medical-ai-platform/data/vaidyavision.db → backend/data/vaidyavision.db
medical-ai-platform/public/uploads/      → backend/public/uploads/
medical-ai-platform/public/heatmaps/     → backend/public/heatmaps/
```

### Files that COPY to `frontend/` (unchanged):

```
app/(marketing)/         → frontend/app/(marketing)/
app/sign-in/             → frontend/app/sign-in/
app/sign-up/             → frontend/app/sign-up/
app/onboarding/page.tsx  → frontend/app/onboarding/page.tsx   (then update fetch URLs)
app/dashboard/page.tsx   → frontend/app/dashboard/page.tsx    (then update fetch URLs)
app/doctor/              → frontend/app/doctor/               (then update fetch URLs)
app/patient/             → frontend/app/patient/              (then update fetch URLs)
app/layout.tsx           → frontend/app/layout.tsx
app/globals.css          → frontend/app/globals.css
app/not-found.tsx        → frontend/app/not-found.tsx
components/              → frontend/components/               (then update fetch URLs)
lib/utils.ts             → frontend/lib/utils.ts
lib/db/schema.ts         → frontend/lib/db/schema.ts          (UNCHANGED)
lib/db/index.ts          → frontend/lib/db/index.ts           (update DB path)
drizzle/                 → frontend/drizzle/
scripts/seed.ts          → frontend/scripts/seed.ts           (UNCHANGED)
public/icons/            → frontend/public/icons/
public/images/           → frontend/public/images/
tailwind.config.ts       → frontend/tailwind.config.ts
middleware.ts            → frontend/middleware.ts
package.json             → frontend/package.json              (remove better-sqlite3)
tsconfig.json            → frontend/tsconfig.json
next.config.mjs          → frontend/next.config.mjs           (add proxy rewrite)
drizzle.config.ts        → frontend/drizzle.config.ts         (update DB path)
```

### Files that DO NOT MOVE (deleted):

```
medical-ai-platform/app/api/   ← DELETE ENTIRELY
```

### Files that are NEW (created from scratch):

```
# Original plan files (unchanged list):
backend/main.py
backend/requirements.txt
backend/.env.example
backend/core/__init__.py
backend/core/config.py
backend/core/database.py
backend/core/auth.py
backend/models/__init__.py
backend/models/types.py
backend/routers/__init__.py
backend/routers/users.py
backend/routers/scans.py
backend/routers/reports.py
backend/routers/appointments.py
backend/routers/conversations.py
backend/routers/medications.py
backend/routers/exercises.py
backend/routers/notifications.py
backend/routers/analytics.py
backend/routers/family.py
backend/routers/developer.py
backend/routers/doctor.py
backend/routers/ai.py
backend/routers/communications.py
backend/routers/followups.py
backend/routers/voice_notes.py
backend/routers/ocr_routes.py
frontend/lib/api/client.ts
frontend/lib/api/users.ts
frontend/lib/api/scans.ts
frontend/lib/api/reports.ts
frontend/lib/api/appointments.ts
frontend/lib/api/conversations.ts
frontend/lib/api/medications.ts
frontend/lib/api/exercises.ts
frontend/lib/api/notifications.ts
frontend/lib/api/analytics.ts
frontend/lib/api/family.ts
frontend/lib/api/doctor.ts
frontend/lib/api/ai.ts
frontend/lib/api/communications.ts
frontend/lib/api/ocr.ts
frontend/lib/api/research.ts
frontend/lib/api/developer.ts
frontend/.env.local.example

# NEW files added by this refactor:
backend/routers/hospitals.py
backend/routers/memberships.py
backend/routers/cases.py
backend/routers/artifacts.py
backend/routers/patients.py
backend/routers/report_templates.py
frontend/lib/api/hospitals.ts
frontend/lib/api/memberships.ts
frontend/lib/api/cases.ts
frontend/lib/api/patients.ts
```

---

## 9. Phase 4 — Implementation Order

Execute strictly in this order.

**Step 0** — Back up the entire `medical-ai-platform/` directory.

**Step 1** — Create the `backend/` directory with all empty `__init__.py` files.

**Step 2** — Copy `ml-service/` to `backend/ml/` with no changes.

**Step 3** — Copy `data/vaidyavision.db` to `backend/data/vaidyavision.db`.

**Step 4** — Copy `public/uploads/` and `public/heatmaps/` to `backend/public/`.

**Step 5** — Implement `backend/core/config.py`.

**Step 6** — Implement `backend/core/database.py`.

**Step 7** — Implement `backend/core/auth.py` (with `VALID_ROLES` constant covering all 5 role values).

**Step 8** — Implement `backend/models/types.py` (with corrected `OnboardRequest`, `CreateMedicationRequest`, and new Case/Hospital/Membership models).

**Step 9** — Implement all original router files in `backend/routers/`, one by one. After each router, verify SQL column names against **`lib/db/schema.ts`** (not the migration SQL file). Key corrections to apply:
- `reports.py`: JOIN to `doctor_profiles` for specialty, not `users.specialty`.
- `users.py`: validate onboard role against all 5 enum values.

**Step 10** — Implement the 6 new routers: `hospitals.py`, `memberships.py`, `cases.py`, `artifacts.py`, `patients.py`, `report_templates.py`.

**Step 11** — Implement `backend/main.py` (with all 6 new routers registered).

**Step 12** — Install dependencies: `pip install -r requirements.txt`.

**Step 13** — Start the backend: `uvicorn main:app --reload --port 8000`. Open `http://localhost:8000/docs` and verify all endpoints appear. Confirm the new route groups appear: `/hospitals`, `/memberships`, `/cases`, `/artifacts`, `/patients`, `/report-templates`.

**Step 14** — Create the `frontend/` directory.

**Step 15** — Copy all UI files from `medical-ai-platform/` to `frontend/`. Do **not** copy `app/api/`.

**Step 16** — Update `frontend/lib/db/index.ts` (new DB path).

**Step 17** — Update `frontend/drizzle.config.ts` (new DB path).

**Step 18** — Create `frontend/lib/api/client.ts` and all typed API files including the 4 new ones (`hospitals.ts`, `memberships.ts`, `cases.ts`, `patients.ts`).

**Step 19** — Update every `fetch("/api/...")` call per the URL Replacement Map in Section 7.7.

**Step 20** — Update `frontend/next.config.mjs` with the `/public/:path*` proxy rewrite.

**Step 21** — Update `frontend/package.json` (remove `better-sqlite3`).

**Step 22** — Create `frontend/.env.local`.

**Step 23** — `npm install` in `frontend/`.

**Step 24** — `npm run dev` in `frontend/`. Verify all pages load and API calls succeed.

**Step 25** — Run `npx drizzle-kit generate` from `frontend/` to confirm Drizzle can connect to the shared DB using `lib/db/schema.ts` as the schema source. This proves the migration path to PostgreSQL is intact.

---

## 10. Phase 5 — Running the New Setup

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# http://localhost:8000/docs

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# http://localhost:3000

# Seeding (Drizzle still has DB access for schema management):
cd frontend
npm run db:seed
```

| What | Where runs | DB access | Auth |
|---|---|---|---|
| FastAPI backend | Port 8000 | Direct sqlite3 | Verifies Clerk JWT |
| Next.js frontend | Port 3000 | Only via Drizzle CLI (migrations) | Clerk handles sessions |
| ML inference | Inside FastAPI | None | Inherited from FastAPI |

---

## 11. Required Schema Changes

No schema changes are required for this restructuring. All tables, columns, and relations used by the router implementations in this plan are confirmed to exist in `lib/db/schema.ts`.

**Schema gaps noted but not blocking:**

| Table | Column | Note |
|-------|--------|------|
| `users` | `hospital_id` | Exists, unused by routes |
| `users` | `specialty` | Exists, always NULL — specialty stored in `doctor_profiles` |
| `doctor_profiles` | `specialty_id` | Exists, unused by routes |
| `care_teams` | all | Exists, no routes yet — future work |
| `care_team_members` | all | Exists, no routes yet — future work |

---

## 12. No-Change Areas

The following are already correct and require no modification:

- `lib/db/schema.ts` — untouched as the canonical schema
- `drizzle/` migration folder — kept as-is (used only for future PostgreSQL migration)
- `scripts/seed.ts` — unchanged
- All UI/UX pages and components (only fetch URLs are updated)
- `middleware.ts` — Clerk routing unchanged
- `tailwind.config.ts` — unchanged
- All ML code in `ml-service/` (copies to `backend/ml/` with zero changes)
- Column names for: `users`, `scans`, `appointments`, `conversations`, `messages`, `notifications`, `family_members`, `follow_ups`, `voice_notes`, `medications`, `medication_logs`, `exercise_routines`, `exercise_logs`, `api_keys`, `prescriptions` — all confirmed correct against schema

---

## 13. Future: Porting to PostgreSQL

**Step 1** — Update `frontend/drizzle.config.ts`:
```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 2** — Run migrations from `frontend/`:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Step 3** — Update `backend/core/database.py` to use `psycopg2`:
```python
import psycopg2
import psycopg2.extras

def get_connection():
    conn = psycopg2.connect(settings.DATABASE_URL)
    conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn
```

**Step 4** — Update `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/vaidyavision
```

The raw SQL queries in all router files require zero changes — they use standard SQL compatible with both SQLite and PostgreSQL.

---

*Document version: 2.0 | Refactored against DB_CONDITION.md | All schema references verified against lib/db/schema.ts*
