# Patient Dossier — Combined Implementation Plan (Refactored)

## Core Principle

**Do not remove or modify any existing functionality.** Every existing route, screen, and data access pattern must continue working exactly as it does today. This plan only adds new things. The dossier is a new unified surface that reads from the same underlying data. Duplication of data access (reading the same record from both an existing route and the new dossier route) is acceptable and intentional.

> **Refactored against DB_CONDITION.md** — All schema assumptions, table names, column names, FK references, data types, and query patterns have been audited against the actual `lib/db/schema.ts`. The original plan was written for a different database (PostgreSQL with UUID PKs and a separate `patients`/`doctors` table structure). The real DB is SQLite with integer PKs and a unified `users` table for all roles. Every conflict is resolved below.

---

## Current DB Reality (Relevant to This Plan)

Before any work begins, these facts from `lib/db/schema.ts` govern every decision in this plan:

- **Primary keys are integers**, not UUIDs. Every `id` column is `INTEGER`.
- **There is no `patients` table and no `doctors` table.** Both patients and doctors are rows in the single `users` table, distinguished by `users.role` (`'patient'` or `'doctor'`).
- **`prescriptions` already exists** in the schema. It is an OCR-driven document storage table, not a structured prescription model. The original plan's proposed `prescriptions` table conflicts with this and must be renamed.
- **`medications` already exists** in the schema and serves as the line-item medication store (`drug_name`, `dosage`, `frequency`, etc.). The original plan's `prescription_items` table largely duplicates this.
- **`voice_notes` has no `patient_id` column.** It links to patients only via `scan_id → scans.patient_id`. The original plan queries `voice_notes` with `WHERE patient_id = ?` — this is invalid.
- **`messages` has no `patient_id` column and no `sent_at` column.** Messages are accessed via `conversation_id`, and timestamps are in `created_at`.
- **`reports` has no `title` column.** The original plan references `r.title` — the column does not exist. Reports have `diagnosis` and `findings`.
- **`scans` has no `title` column.** The original plan references `s.title` — the column does not exist. Scans have `modality` and `ai_diagnosis`.
- **`appointments` has no `reason` column.** The column is `notes`.
- **`blood_group` does not exist on `users`.** The column is `blood_type`.
- **Timestamps are stored as integers (Unix ms) in most tables**, not ISO strings. Sorting and formatting must account for this.
- **The ORM/query layer in FastAPI uses raw `sqlite3` SQL**, not Prisma or any ORM with `.findMany()`. All query pseudocode in this plan must be translated to raw SQL for the FastAPI backend.

---

## Conflicts In Original Plan

| # | Conflict | Original Assumption | DB Reality | Fix |
|---|----------|---------------------|------------|-----|
| 1 | PK type | UUID (`gen_random_uuid()`) | INTEGER (auto-increment) | All new tables use `INTEGER PRIMARY KEY` |
| 2 | FK to patients | `REFERENCES patients(id)` | No `patients` table — use `users.id` | All new tables use `REFERENCES users(id)` |
| 3 | FK to doctors | `REFERENCES doctors(id)` | No `doctors` table — use `users.id` | All new tables use `REFERENCES users(id)` |
| 4 | `prescriptions` table name | Proposed as new | Already exists as OCR document store | Rename new table to `doctor_prescriptions` |
| 5 | `prescription_items` table | Proposed as new | `medications` table already models drug line-items | Rename to `doctor_prescription_items` to avoid collision |
| 6 | `voice_notes` query | `WHERE patient_id = ?` | No `patient_id` on `voice_notes`; linked via `scan_id` | Join through `scans` table |
| 7 | `messages` query | `WHERE patient_id = ?`, sort by `sent_at` | No `patient_id` on `messages`, no `sent_at`; linked via `conversation_id`, sorted by `created_at` | Join through `conversations` table |
| 8 | `reports.title` | Referenced in timeline build | Column does not exist; use `diagnosis` | Replace `r.title` with `r.diagnosis` |
| 9 | `scans.title` | Referenced in timeline build | Column does not exist; use `modality` or `ai_diagnosis` | Replace `s.title ?? 'Scan'` with `s.modality` |
| 10 | `appointments.reason` | Referenced in timeline build | Column is `notes`, not `reason` | Replace `a.reason` with `a.notes` |
| 11 | `patient.blood_group` | Referenced in response shape | Column is `blood_type` on `users` | Replace `blood_group` with `blood_type` |
| 12 | Timestamp type | ISO 8601 strings assumed | Stored as integer Unix ms in most tables | Use integer comparison for sorting; format on frontend |
| 13 | ORM queries | Prisma `.findMany()` / `.findUnique()` syntax | Raw `sqlite3` SQL in FastAPI | All queries rewritten as raw SQL |
| 14 | `patient_timeline_events.event_id` type | UUID | Integer | Use `INTEGER` |
| 15 | TIMESTAMPTZ columns | PostgreSQL type | SQLite has no TIMESTAMPTZ; use INTEGER for timestamps | All `TIMESTAMPTZ` → `INTEGER` (Unix ms via `strftime('%s','now')*1000`) |
| 16 | `BOOLEAN` type | Native boolean | SQLite has no native boolean; use `INTEGER (0/1)` | `is_active BOOLEAN` → `is_active INTEGER NOT NULL DEFAULT 1` |

---

## Phase 1 — Schema Extensions

These are **additive only**. No existing table is dropped or altered in a breaking way.

> **Important:** All migrations must be run via Drizzle Kit, not raw SQL directly. Add the new tables to `lib/db/schema.ts` first, then run `npx drizzle-kit generate` and `npx drizzle-kit migrate`. The migration SQL below is the expected output — it exists for reference, not direct execution.

---

### 1.1 New Tables to Add to `lib/db/schema.ts`

Add the following table definitions. The Drizzle Kit migration will generate equivalent SQL.

---

#### `patient_notes`

New table. No conflict with any existing table.

```typescript
// In lib/db/schema.ts — add:
export const patientNotes = sqliteTable("patient_notes", {
  id:             integer("id").primaryKey({ autoIncrement: true }),
  patientId:      integer("patient_id").notNull().references(() => users.id),
  doctorId:       integer("doctor_id").notNull().references(() => users.id),
  content:        text("content").notNull(),
  linkedToType:   text("linked_to_type"),   // 'scan' | 'report' | 'appointment' | null
  linkedToId:     integer("linked_to_id"),  // integer FK to the linked entity, nullable
  createdAt:      integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt:      integer("updated_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL (reference only):
```sql
CREATE TABLE patient_notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id      INTEGER NOT NULL REFERENCES users(id),
  content        TEXT NOT NULL,
  linked_to_type TEXT,
  linked_to_id   INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_patient_notes_patient_id ON patient_notes(patient_id);
CREATE INDEX idx_patient_notes_doctor_id  ON patient_notes(doctor_id);
```

---

#### `patient_files`

New table. No conflict with any existing table.

```typescript
export const patientFiles = sqliteTable("patient_files", {
  id:            integer("id").primaryKey({ autoIncrement: true }),
  patientId:     integer("patient_id").notNull().references(() => users.id),
  doctorId:      integer("doctor_id").notNull().references(() => users.id),
  fileName:      text("file_name").notNull(),
  fileUrl:       text("file_url").notNull(),
  fileType:      text("file_type"),
  fileSize:      integer("file_size"),      // bytes — SQLite INTEGER handles bigint range adequately
  linkedToType:  text("linked_to_type"),
  linkedToId:    integer("linked_to_id"),
  createdAt:     integer("created_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE patient_files (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id      INTEGER NOT NULL REFERENCES users(id),
  file_name      TEXT NOT NULL,
  file_url       TEXT NOT NULL,
  file_type      TEXT,
  file_size      INTEGER,
  linked_to_type TEXT,
  linked_to_id   INTEGER,
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_patient_files_patient_id ON patient_files(patient_id);
```

---

#### `doctor_prescriptions`

**RENAMED from `prescriptions`** — a table named `prescriptions` already exists in the schema as an OCR document store (`image_url`, `raw_text`, `structured_data`, etc.). This new table is a structured, doctor-authored prescription model and must use a distinct name.

```typescript
export const doctorPrescriptions = sqliteTable("doctor_prescriptions", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  patientId:   integer("patient_id").notNull().references(() => users.id),
  doctorId:    integer("doctor_id").notNull().references(() => users.id),
  title:       text("title").notNull(),
  notes:       text("notes"),
  issuedAt:    integer("issued_at").notNull().$defaultFn(() => Date.now()),
  updatedAt:   integer("updated_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE doctor_prescriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  notes       TEXT,
  issued_at   INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_doctor_prescriptions_patient_id ON doctor_prescriptions(patient_id);
```

---

#### `doctor_prescription_items`

**RENAMED from `prescription_items`** — to match the renamed parent table and avoid any naming confusion with the existing `medications` table which already models drug line-items for patient medication tracking. These two tables serve different purposes:

- `medications` — patient's ongoing medication schedule, linked to OCR prescriptions, with `is_active`, `added_by`, log tracking.
- `doctor_prescription_items` — line items on a doctor-authored prescription document in the dossier.

```typescript
export const doctorPrescriptionItems = sqliteTable("doctor_prescription_items", {
  id:              integer("id").primaryKey({ autoIncrement: true }),
  prescriptionId:  integer("prescription_id").notNull().references(() => doctorPrescriptions.id),
  medicineName:    text("medicine_name").notNull(),
  dosage:          text("dosage"),
  frequency:       text("frequency"),
  duration:        text("duration"),
  directions:      text("directions"),
  isActive:        integer("is_active").notNull().default(1),  // SQLite boolean: 1=true, 0=false
  createdAt:       integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt:       integer("updated_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE doctor_prescription_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id  INTEGER NOT NULL REFERENCES doctor_prescriptions(id) ON DELETE CASCADE,
  medicine_name    TEXT NOT NULL,
  dosage           TEXT,
  frequency        TEXT,
  duration         TEXT,
  directions       TEXT,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX idx_dpi_prescription_id ON doctor_prescription_items(prescription_id);
```

---

#### `patient_allergies`

New table. No conflict with any existing table.

```typescript
export const patientAllergies = sqliteTable("patient_allergies", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  patientId:   integer("patient_id").notNull().references(() => users.id),
  allergen:    text("allergen").notNull(),
  severity:    text("severity"),   // 'Mild' | 'Moderate' | 'Severe'
  notes:       text("notes"),
  createdAt:   integer("created_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE patient_allergies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  severity    TEXT,
  notes       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_patient_allergies_patient_id ON patient_allergies(patient_id);
```

---

#### `patient_conditions`

New table. No conflict with any existing table.

```typescript
export const patientConditions = sqliteTable("patient_conditions", {
  id:           integer("id").primaryKey({ autoIncrement: true }),
  patientId:    integer("patient_id").notNull().references(() => users.id),
  condition:    text("condition").notNull(),
  diagnosedAt:  text("diagnosed_at"),    // stored as TEXT date string 'YYYY-MM-DD'
  status:       text("status"),          // 'Active' | 'Resolved' | 'Chronic'
  notes:        text("notes"),
  createdAt:    integer("created_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE patient_conditions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition    TEXT NOT NULL,
  diagnosed_at TEXT,
  status       TEXT,
  notes        TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_patient_conditions_patient_id ON patient_conditions(patient_id);
```

---

#### `patient_timeline_events` (optional, for performance)

Use only if the dossier timeline assembly query is slow under real data volumes. This is a denormalized cache.

```typescript
export const patientTimelineEvents = sqliteTable("patient_timeline_events", {
  id:          integer("id").primaryKey({ autoIncrement: true }),
  patientId:   integer("patient_id").notNull().references(() => users.id),
  eventType:   text("event_type").notNull(),
    // 'scan' | 'report' | 'appointment' | 'note' | 'file'
    // | 'prescription' | 'message' | 'voice_note'
  eventId:     integer("event_id").notNull(),   // INTEGER, not UUID
  eventDate:   integer("event_date").notNull(), // Unix ms timestamp
  summary:     text("summary"),
  createdAt:   integer("created_at").notNull().$defaultFn(() => Date.now()),
});
```

Equivalent migration SQL:
```sql
CREATE TABLE patient_timeline_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  event_id    INTEGER NOT NULL,
  event_date  INTEGER NOT NULL,
  summary     TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_timeline_patient_id_date ON patient_timeline_events(patient_id, event_date DESC);
```

---

### 1.2 Seed Updates

After running migrations, update `scripts/seed.ts` to insert at least one row per new table for each seeded patient. Mark seed rows with a comment:

```typescript
// --- DOSSIER SEED DATA (strip before production) ---
```

Seed inserts must reference the integer IDs of seeded users (not UUIDs). Pull the seeded patient and doctor IDs from the existing seed data before inserting dossier rows.

---

## Phase 2 — Backend: New Dossier Read Endpoint

### 2.1 Route to Add

```
GET /doctor/patients/{patient_id}/dossier
```

This is a **new route** added to `backend/routers/doctor.py`. The existing `GET /doctor/patients/{patient_id}` route must not be changed.

---

### 2.2 Auth Check

```python
# At the top of the dossier handler:
# 1. Verify Clerk JWT → get clerk_id
# 2. Resolve to users row → current_user
# 3. Check current_user["role"] == "doctor" → 403 if not
# 4. Confirm patient exists and has role='patient' → 404 if not
```

---

### 2.3 Full Query Plan (Raw SQL, FastAPI sqlite3)

All queries run in parallel via Python's `concurrent.futures.ThreadPoolExecutor` or assembled sequentially in one function (SQLite does not support true async — use sequential queries with a single connection for simplicity and correctness):

```python
# backend/routers/doctor.py — add to existing router

@router.get("/patients/{patient_id}/dossier")
def get_patient_dossier(
    patient_id: int,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    # ── Patient ────────────────────────────────────────────────────
    patient = db.execute(
        "SELECT * FROM users WHERE id = ? AND role = 'patient'", (patient_id,)
    ).fetchone()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # ── Scans ──────────────────────────────────────────────────────
    scans = db.execute(
        "SELECT * FROM scans WHERE patient_id = ? ORDER BY uploaded_at DESC",
        (patient_id,),
    ).fetchall()

    # ── Reports ────────────────────────────────────────────────────
    reports = db.execute(
        "SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC",
        (patient_id,),
    ).fetchall()

    # ── Appointments ───────────────────────────────────────────────
    appointments = db.execute(
        "SELECT * FROM appointments WHERE patient_id = ? ORDER BY scheduled_at DESC",
        (patient_id,),
    ).fetchall()

    # ── Voice Notes ────────────────────────────────────────────────
    # CORRECTED: voice_notes has no patient_id column.
    # Must join through scans to get patient's voice notes.
    voice_notes = db.execute(
        """SELECT vn.*
           FROM voice_notes vn
           JOIN scans s ON vn.scan_id = s.id
           WHERE s.patient_id = ?
           ORDER BY vn.created_at DESC""",
        (patient_id,),
    ).fetchall()

    # ── Messages ───────────────────────────────────────────────────
    # CORRECTED: messages has no patient_id column and no sent_at column.
    # Messages are scoped to conversations; conversations link patient to doctor.
    # Sort by messages.created_at (not sent_at which does not exist).
    messages = db.execute(
        """SELECT m.*, c.doctor_id, c.patient_id as conv_patient_id
           FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           WHERE c.patient_id = ?
           ORDER BY m.created_at DESC""",
        (patient_id,),
    ).fetchall()

    # ── Family Members ─────────────────────────────────────────────
    family_members = db.execute(
        "SELECT * FROM family_members WHERE patient_id = ?",
        (patient_id,),
    ).fetchall()

    # ── Dossier-specific new tables ────────────────────────────────
    notes = db.execute(
        """SELECT pn.*, u.name as doctor_name
           FROM patient_notes pn
           JOIN users u ON pn.doctor_id = u.id
           WHERE pn.patient_id = ?
           ORDER BY pn.created_at DESC""",
        (patient_id,),
    ).fetchall()

    files = db.execute(
        "SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC",
        (patient_id,),
    ).fetchall()

    # CORRECTED: query doctor_prescriptions, not prescriptions
    prescriptions_raw = db.execute(
        "SELECT * FROM doctor_prescriptions WHERE patient_id = ? ORDER BY issued_at DESC",
        (patient_id,),
    ).fetchall()

    # Attach items to each prescription
    prescriptions = []
    for p in prescriptions_raw:
        p_dict = dict(p)
        items = db.execute(
            "SELECT * FROM doctor_prescription_items WHERE prescription_id = ?",
            (p_dict["id"],),
        ).fetchall()
        p_dict["items"] = rows_to_list(items)
        prescriptions.append(p_dict)

    allergies = db.execute(
        "SELECT * FROM patient_allergies WHERE patient_id = ?",
        (patient_id,),
    ).fetchall()

    conditions = db.execute(
        "SELECT * FROM patient_conditions WHERE patient_id = ?",
        (patient_id,),
    ).fetchall()

    # ── Build timeline ─────────────────────────────────────────────
    timeline = _build_timeline(scans, reports, appointments, voice_notes, messages, notes, files, prescriptions)

    # ── Build alerts ───────────────────────────────────────────────
    alerts = _build_alerts(rows_to_list(allergies), rows_to_list(conditions))

    # ── Response ───────────────────────────────────────────────────
    p = row_to_dict(patient)
    return {
        "patient": {
            "id": p["id"],
            "name": p["name"],
            "age": p["age"],
            "gender": p["gender"],
            "blood_type": p["blood_type"],   # CORRECTED: was blood_group, column is blood_type
            "phone": p["phone"],
            "medical_history": p["medical_history"],
        },
        "alerts": alerts,
        "timeline": timeline,
        "records": {
            "scans": rows_to_list(scans),
            "reports": rows_to_list(reports),
            "appointments": rows_to_list(appointments),
            "voice_notes": rows_to_list(voice_notes),
            "messages": rows_to_list(messages),
            "family_members": rows_to_list(family_members),
            "notes": notes,              # already dicts from loop above
            "files": rows_to_list(files),
            "prescriptions": prescriptions,
            "allergies": rows_to_list(allergies),
            "conditions": rows_to_list(conditions),
        },
    }
```

---

### 2.4 Build Timeline Array

```python
def _build_timeline(scans, reports, appointments, voice_notes, messages, notes, files, prescriptions) -> list:
    """
    Assembles a unified, newest-first sorted timeline from all record types.

    CORRECTED field references vs original plan:
    - scans:        use s['modality'] not s['title'] (no title column)
    - reports:      use r['diagnosis'] not r['title'] (no title column)
    - appointments: use a['notes'] not a['reason'] (no reason column)
    - voice_notes:  already joined through scans, use vn['created_at']
    - messages:     use m['created_at'] not m['sent_at'] (no sent_at column)
    - prescriptions: use p['issued_at'] as the event date
    - All timestamps are integers (Unix ms) — sort numerically
    """
    events = []

    for s in scans:
        s = dict(s)
        events.append({
            "id": s["id"], "type": "scan",
            "date": s["uploaded_at"],
            # CORRECTED: scans have no title; use modality
            "summary": s.get("modality") or "Scan",
            "record_id": s["id"],
        })

    for r in reports:
        r = dict(r)
        events.append({
            "id": r["id"], "type": "report",
            "date": r["created_at"],
            # CORRECTED: reports have no title; use diagnosis
            "summary": (r.get("diagnosis") or "Report")[:60],
            "record_id": r["id"],
        })

    for a in appointments:
        a = dict(a)
        events.append({
            "id": a["id"], "type": "appointment",
            "date": a["scheduled_at"],
            # CORRECTED: appointments have no reason column; use notes
            "summary": (a.get("notes") or "Appointment")[:60],
            "record_id": a["id"],
        })

    for v in voice_notes:
        v = dict(v)
        events.append({
            "id": v["id"], "type": "voice_note",
            "date": v["created_at"],
            "summary": "Voice transcript",
            "record_id": v["id"],
        })

    for m in messages:
        m = dict(m)
        events.append({
            "id": m["id"], "type": "message",
            # CORRECTED: messages have no sent_at; use created_at
            "date": m["created_at"],
            "summary": (m.get("content") or "Message")[:60],
            "record_id": m["id"],
        })

    for n in notes:
        events.append({
            "id": n["id"], "type": "note",
            "date": n["created_at"],
            "summary": (n.get("content") or "Note")[:60],
            "record_id": n["id"],
        })

    for f in files:
        f = dict(f) if not isinstance(f, dict) else f
        events.append({
            "id": f["id"], "type": "file",
            "date": f["created_at"],
            "summary": f.get("file_name") or "File",
            "record_id": f["id"],
        })

    for p in prescriptions:
        events.append({
            "id": p["id"], "type": "prescription",
            "date": p["issued_at"],
            "summary": p.get("title") or "Prescription",
            "record_id": p["id"],
        })

    # All dates are integer Unix ms — sort numerically descending
    events.sort(key=lambda e: e["date"] if e["date"] else 0, reverse=True)
    return events
```

---

### 2.5 Build Alerts Array

```python
def _build_alerts(allergies: list, conditions: list) -> list:
    alerts = []

    if allergies:
        allergen_names = [a["allergen"] for a in allergies if a.get("allergen")]
        if allergen_names:
            alerts.append(f"Allergies: {', '.join(allergen_names)}")

    active_conditions = [
        c for c in conditions
        if c.get("status") in ("Active", "Chronic")
    ]
    if active_conditions:
        condition_names = [c["condition"] for c in active_conditions if c.get("condition")]
        alerts.append(f"Active conditions: {', '.join(condition_names)}")

    return alerts
```

---

### 2.6 Response Shape

The response shape is corrected to use real column names:

```json
{
  "patient": {
    "id": 42,
    "name": "Jane Doe",
    "age": 34,
    "gender": "female",
    "blood_type": "O+",
    "phone": "+91-9876543210",
    "medical_history": "..."
  },
  "alerts": [
    "Allergies: Penicillin, Aspirin",
    "Active conditions: Type 2 Diabetes"
  ],
  "timeline": [
    {
      "id": 101,
      "type": "scan",
      "date": 1739500800000,
      "summary": "brain",
      "record_id": 101
    }
  ],
  "records": {
    "scans": [...],
    "reports": [...],
    "appointments": [...],
    "voice_notes": [...],
    "messages": [...],
    "family_members": [...],
    "notes": [...],
    "files": [...],
    "prescriptions": [
      {
        "id": 1,
        "patient_id": 42,
        "doctor_id": 7,
        "title": "Post-surgery medication plan",
        "notes": "...",
        "issued_at": 1739500800000,
        "updated_at": 1739500800000,
        "items": [
          {
            "id": 1,
            "prescription_id": 1,
            "medicine_name": "Amoxicillin",
            "dosage": "500mg",
            "frequency": "Twice daily",
            "duration": "7 days",
            "directions": "Take after meals",
            "is_active": 1
          }
        ]
      }
    ],
    "allergies": [...],
    "conditions": [...]
  }
}
```

---

### 2.7 Error Handling in the Route

- If `patient` is `None` after the query, raise `HTTPException(status_code=404, detail="Patient not found")`.
- Wrap the entire handler in a `try/except Exception`. On unexpected error, raise `HTTPException(status_code=500, detail="Something went wrong")`. Do not leak stack traces to the client.

---

## Phase 3 — Backend: Write Routes

All routes are new. Nothing existing is modified. Add them to `backend/routers/doctor.py` on the existing `router` instance (prefix `/doctor`).

---

### 3.1 Notes

```
POST  /doctor/patients/{patient_id}/notes
PATCH /doctor/patients/{patient_id}/notes/{note_id}
```

```python
from pydantic import BaseModel
from typing import Optional

class CreateNoteRequest(BaseModel):
    content: str
    linked_to_type: Optional[str] = None   # 'scan' | 'report' | 'appointment'
    linked_to_id: Optional[int] = None     # integer ID, not UUID


class UpdateNoteRequest(BaseModel):
    content: Optional[str] = None


@router.post("/patients/{patient_id}/notes", status_code=201)
def create_note(
    patient_id: int,
    body: CreateNoteRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="content is required")
    if body.linked_to_type and body.linked_to_type not in ("scan", "report", "appointment"):
        raise HTTPException(status_code=400, detail="linked_to_type must be scan, report, or appointment")

    now = int(__import__("time").time() * 1000)
    cursor = db.execute(
        """INSERT INTO patient_notes
           (patient_id, doctor_id, content, linked_to_type, linked_to_id, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?)""",
        (patient_id, current_user["id"], body.content.strip(),
         body.linked_to_type, body.linked_to_id, now, now),
    )
    note = db.execute(
        "SELECT * FROM patient_notes WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"note": row_to_dict(note)}


@router.patch("/patients/{patient_id}/notes/{note_id}")
def update_note(
    patient_id: int,
    note_id: int,
    body: UpdateNoteRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    note = db.execute("SELECT * FROM patient_notes WHERE id = ?", (note_id,)).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    # Only the doctor who created the note may edit it
    if dict(note)["doctor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot edit another doctor's note")

    now = int(__import__("time").time() * 1000)
    if body.content is not None:
        db.execute(
            "UPDATE patient_notes SET content = ?, updated_at = ? WHERE id = ?",
            (body.content.strip(), now, note_id),
        )
    updated = db.execute(
        "SELECT * FROM patient_notes WHERE id = ?", (note_id,)
    ).fetchone()
    return {"note": row_to_dict(updated)}
```

---

### 3.2 Files

```
POST /doctor/patients/{patient_id}/files
```

```python
@router.post("/patients/{patient_id}/files", status_code=201)
async def upload_patient_file(
    patient_id: int,
    file: UploadFile = File(...),
    linked_to_type: Optional[str] = Form(None),
    linked_to_id: Optional[int] = Form(None),
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    import os, uuid
    from ..core.config import settings

    # Reuse existing upload directory — do not duplicate upload infrastructure
    os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
    ext = (file.filename or "bin").split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(settings.UPLOADS_DIR, filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_url = f"/public/uploads/{filename}"
    now = int(__import__("time").time() * 1000)

    cursor = db.execute(
        """INSERT INTO patient_files
           (patient_id, doctor_id, file_name, file_url, file_type, file_size,
            linked_to_type, linked_to_id, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            patient_id, current_user["id"],
            file.filename, file_url, file.content_type, len(contents),
            linked_to_type, linked_to_id, now,
        ),
    )
    pf = db.execute(
        "SELECT * FROM patient_files WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()
    return {"file": row_to_dict(pf)}
```

---

### 3.3 Doctor Prescriptions

```
POST  /doctor/patients/{patient_id}/prescriptions
PATCH /doctor/patients/{patient_id}/prescriptions/{prescription_id}
```

```python
class PrescriptionItemInput(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    directions: Optional[str] = None

class CreatePrescriptionRequest(BaseModel):
    title: str
    notes: Optional[str] = None
    items: list[PrescriptionItemInput] = []

class UpdatePrescriptionRequest(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[list[PrescriptionItemInput]] = None


@router.post("/patients/{patient_id}/prescriptions", status_code=201)
def create_prescription(
    patient_id: int,
    body: CreatePrescriptionRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="title is required")

    now = int(__import__("time").time() * 1000)
    # CORRECTED: inserts into doctor_prescriptions, not prescriptions
    cursor = db.execute(
        """INSERT INTO doctor_prescriptions
           (patient_id, doctor_id, title, notes, issued_at, updated_at)
           VALUES (?,?,?,?,?,?)""",
        (patient_id, current_user["id"], body.title.strip(), body.notes, now, now),
    )
    prescription_id = cursor.lastrowid

    items = []
    for item in body.items:
        ic = db.execute(
            """INSERT INTO doctor_prescription_items
               (prescription_id, medicine_name, dosage, frequency, duration,
                directions, is_active, created_at, updated_at)
               VALUES (?,?,?,?,?,?,1,?,?)""",
            (
                prescription_id, item.medicine_name, item.dosage,
                item.frequency, item.duration, item.directions, now, now,
            ),
        )
        items.append(row_to_dict(
            db.execute("SELECT * FROM doctor_prescription_items WHERE id = ?", (ic.lastrowid,)).fetchone()
        ))

    prescription = row_to_dict(
        db.execute("SELECT * FROM doctor_prescriptions WHERE id = ?", (prescription_id,)).fetchone()
    )
    prescription["items"] = items
    return {"prescription": prescription}


@router.patch("/patients/{patient_id}/prescriptions/{prescription_id}")
def update_prescription(
    patient_id: int,
    prescription_id: int,
    body: UpdatePrescriptionRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    existing = db.execute(
        "SELECT * FROM doctor_prescriptions WHERE id = ? AND patient_id = ?",
        (prescription_id, patient_id),
    ).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if dict(existing)["doctor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot edit another doctor's prescription")

    now = int(__import__("time").time() * 1000)
    fields, values = ["updated_at = ?"], [now]
    if body.title is not None:
        fields.append("title = ?"); values.append(body.title.strip())
    if body.notes is not None:
        fields.append("notes = ?"); values.append(body.notes)
    values.append(prescription_id)
    db.execute(f"UPDATE doctor_prescriptions SET {', '.join(fields)} WHERE id = ?", values)

    if body.items is not None:
        # Full replacement: delete old items, insert new
        db.execute(
            "DELETE FROM doctor_prescription_items WHERE prescription_id = ?",
            (prescription_id,),
        )
        items = []
        for item in body.items:
            ic = db.execute(
                """INSERT INTO doctor_prescription_items
                   (prescription_id, medicine_name, dosage, frequency, duration,
                    directions, is_active, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,1,?,?)""",
                (
                    prescription_id, item.medicine_name, item.dosage,
                    item.frequency, item.duration, item.directions, now, now,
                ),
            )
            items.append(row_to_dict(
                db.execute("SELECT * FROM doctor_prescription_items WHERE id = ?", (ic.lastrowid,)).fetchone()
            ))
    else:
        items = rows_to_list(db.execute(
            "SELECT * FROM doctor_prescription_items WHERE prescription_id = ?",
            (prescription_id,),
        ).fetchall())

    prescription = row_to_dict(
        db.execute("SELECT * FROM doctor_prescriptions WHERE id = ?", (prescription_id,)).fetchone()
    )
    prescription["items"] = items
    return {"prescription": prescription}
```

---

### 3.4 Prescription Item Active/Inactive Toggle

```
PATCH /doctor/patients/{patient_id}/prescriptions/{prescription_id}/items/{item_id}
```

```python
class ToggleItemRequest(BaseModel):
    is_active: bool


@router.patch("/patients/{patient_id}/prescriptions/{prescription_id}/items/{item_id}")
def toggle_prescription_item(
    patient_id: int,
    prescription_id: int,
    item_id: int,
    body: ToggleItemRequest,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    item = db.execute(
        "SELECT * FROM doctor_prescription_items WHERE id = ? AND prescription_id = ?",
        (item_id, prescription_id),
    ).fetchone()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    now = int(__import__("time").time() * 1000)
    # is_active stored as INTEGER 0/1 in SQLite
    db.execute(
        "UPDATE doctor_prescription_items SET is_active = ?, updated_at = ? WHERE id = ?",
        (1 if body.is_active else 0, now, item_id),
    )
    # Also touch parent prescription's updated_at
    db.execute(
        "UPDATE doctor_prescriptions SET updated_at = ? WHERE id = ?",
        (now, prescription_id),
    )
    updated_item = row_to_dict(
        db.execute("SELECT * FROM doctor_prescription_items WHERE id = ?", (item_id,)).fetchone()
    )
    return {"item": updated_item}
```

---

### 3.5 Timeline Rebuild (optional, only if using `patient_timeline_events`)

```
POST /doctor/patients/{patient_id}/timeline/rebuild
```

```python
@router.post("/patients/{patient_id}/timeline/rebuild")
def rebuild_timeline(
    patient_id: int,
    current_user: dict = Depends(get_doctor),
    db: sqlite3.Connection = Depends(get_db),
):
    db.execute(
        "DELETE FROM patient_timeline_events WHERE patient_id = ?", (patient_id,)
    )
    # Re-use the same queries from the dossier handler to reassemble
    # Insert results into patient_timeline_events
    # (implementation mirrors get_patient_dossier query block)
    return {"ok": True}
```

---

### 3.6 Register New Routes in `backend/main.py`

No new router file is needed. All new routes are added to the existing `doctor.router` in `backend/routers/doctor.py`. The `main.py` registration of `doctor.router` already covers them. No changes to `main.py` are required.

---

## Phase 4 — Frontend: Dossier Page

### 4.1 New Route

```
/doctor/patients/[id]/dossier
```

Create file: `frontend/app/doctor/patients/[id]/dossier/page.tsx`

The existing page at `frontend/app/doctor/patients/[id]/page.tsx` must not change.

---

### 4.2 Data Fetching

```typescript
// On page load — client component or server component with error boundary
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const res = await fetch(`${BACKEND}/doctor/patients/${patientId}/dossier`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!res.ok) {
  // Handle 403, 404, 500 separately (see Phase 4.11)
}

const data = await res.json();
// data.patient, data.alerts, data.timeline, data.records
```

Store response in component state. Shape mirrors the API response from Phase 2.6.

---

### 4.3 Layout Structure

```
┌────────────────────────────────────────────┐
│  SUMMARY HEADER                            │
│  patient info · alerts · quick actions     │
├────────────────────────────────────────────┤
│  TIMELINE                                  │
│  all events · filter bar · linked cards    │
├────────────────────────────────────────────┤
│  RECORDS                                   │
│  sectioned list of all records             │
└────────────────────────────────────────────┘
```

All three zones are on one scrollable page.

---

### 4.4 Summary Header

Display from `patient`:
- Full name (large text)
- Age and gender on one line
- **`blood_type`** (CORRECTED: was `blood_group` in original plan — the real column is `blood_type`)
- Phone number
- Medical history (truncated with "show more" if long)

Quick stats: total scans, reports, appointments, prescriptions (counts from `records`).

Alert strip: horizontally scrollable row of badges from `alerts`. Warning color. Hidden if `alerts` is empty.

Quick action buttons: `Add Note`, `Upload File`, `New Prescription`.

---

### 4.5 Timeline Section

Filter bar chips:
- All (default)
- Clinical (`scan`, `report`, `appointment`, `note`, `voice_note`)
- Files (`file`)
- Communication (`message`)
- Medications (`prescription`)

Filter is client-side — no API call.

Event cards: event type icon, date formatted from **integer Unix ms timestamp** (use `new Date(event.date).toLocaleDateString()`), summary text, "View" anchor link.

---

### 4.6 Records Section

Each sub-section has a heading and list of cards. Each card has `id="{type}-{record_id}"` for anchor scrolling.

**Scans**
- `modality` as the scan label (CORRECTED: no `title` column)
- `uploaded_at` as date (format from integer Unix ms)
- `ai_diagnosis` as a secondary label if present
- Link to existing scan detail page

**Reports**
- `diagnosis` as report label (CORRECTED: no `title` column)
- `created_at` as date
- `severity` badge
- Link to existing report detail page

**Notes** (new)
- `content` (truncated, with expand toggle)
- `doctor_name` from the JOIN
- `created_at` as date
- "Edit" button → Edit Note modal

**Voice Transcripts**
- `created_at` as date
- `transcription` text (truncated, with expand toggle)
- `audio_url` playback if present

**Files** (new)
- `file_name`
- `file_type` badge
- `file_size` formatted (e.g. "1.2 MB" — divide by 1048576)
- Download link opening `file_url` in a new tab

**Appointments**
- `scheduled_at` formatted from integer Unix ms
- `notes` (CORRECTED: no `reason` column)
- `status` badge
- `type` badge

**Messages**
- `content` truncated
- `created_at` formatted (CORRECTED: no `sent_at` column)
- Link to existing conversation thread using `conversation_id`

**Prescriptions** (new — from `doctor_prescriptions`)
- `title`
- `issued_at` formatted
- Table of `items`: `medicine_name`, `dosage`, `frequency`, `duration`, `directions`
- `is_active` toggle per item (calls toggle endpoint; `is_active` is integer 0/1 from API — coerce to boolean on frontend)
- "Edit" button → Edit Prescription modal

**Allergies** (new)
- `allergen`
- `severity` badge
- `notes`

**Conditions** (new)
- `condition`
- `status` badge
- `diagnosed_at` (stored as TEXT date string)
- `notes`

**Family Members**
- `name` and `relation`

---

### 4.7 Add / Edit Note Modal

On submit:
- Add: `POST /doctor/patients/[id]/notes` with `{ content, linked_to_type, linked_to_id }` where `linked_to_id` is an integer.
- Edit: `PATCH /doctor/patients/[id]/notes/[noteId]` with `{ content }`.
- On success: update notes list in component state without re-fetching full dossier.
- On error: show inline error in modal. Keep modal open.

---

### 4.8 File Upload Flow

On upload: `POST` multipart form to `/doctor/patients/[id]/files`.
- `linked_to_id` is an integer field in the form.
- On success: append new file card to files list in state.

---

### 4.9 New / Edit Prescription Modal

On submit:
- New: `POST /doctor/patients/[id]/prescriptions` with `{ title, notes, items }`.
- Edit: `PATCH /doctor/patients/[id]/prescriptions/[prescriptionId]` with `{ title, notes, items }`.
- On success: update prescriptions list in state.

**Active/Inactive toggle**: `PATCH /doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]` with `{ is_active: boolean }`. On success: the API returns `item.is_active` as an integer (0 or 1) — coerce to boolean on the frontend for the toggle UI. On error: revert toggle, show toast.

---

### 4.10 Empty States

Each sub-section must show an empty state when its list is empty. Do not render blank space.

---

### 4.11 Loading and Error States

- Initial load: full-page skeleton mirroring the layout.
- 403: "You do not have access to this patient."
- 404: "Patient not found."
- 500: "Something went wrong. Try again." with a retry button.
- Write failures: toast or inline error. Do not navigate away.

---

### 4.12 Add Frontend API Client

Add to `frontend/lib/api/doctor.ts`:

```typescript
// Dossier read
getDossier: (token: string, patientId: number) =>
  apiFetch(`/doctor/patients/${patientId}/dossier`, token).then((r) => r.json()),

// Notes
createNote: (token: string, patientId: number, data: object) =>
  apiFetch(`/doctor/patients/${patientId}/notes`, token, {
    method: "POST", body: JSON.stringify(data),
  }).then((r) => r.json()),

updateNote: (token: string, patientId: number, noteId: number, data: object) =>
  apiFetch(`/doctor/patients/${patientId}/notes/${noteId}`, token, {
    method: "PATCH", body: JSON.stringify(data),
  }).then((r) => r.json()),

// Files
uploadFile: (token: string, patientId: number, formData: FormData) =>
  apiFetch(`/doctor/patients/${patientId}/files`, token, {
    method: "POST", body: formData,
  }).then((r) => r.json()),

// Doctor Prescriptions
createPrescription: (token: string, patientId: number, data: object) =>
  apiFetch(`/doctor/patients/${patientId}/prescriptions`, token, {
    method: "POST", body: JSON.stringify(data),
  }).then((r) => r.json()),

updatePrescription: (token: string, patientId: number, prescriptionId: number, data: object) =>
  apiFetch(`/doctor/patients/${patientId}/prescriptions/${prescriptionId}`, token, {
    method: "PATCH", body: JSON.stringify(data),
  }).then((r) => r.json()),

togglePrescriptionItem: (token: string, patientId: number, prescriptionId: number, itemId: number, isActive: boolean) =>
  apiFetch(`/doctor/patients/${patientId}/prescriptions/${prescriptionId}/items/${itemId}`, token, {
    method: "PATCH", body: JSON.stringify({ is_active: isActive }),
  }).then((r) => r.json()),
```

---

## Phase 5 — Wire the Patient Selector

The existing `/doctor/patients` page shows a list of patients. Add an `Open Dossier` button/link to each patient row pointing to `/doctor/patients/[id]/dossier`. Do not change the default click behavior of the existing patient row link.

---

## Phase 6 — Acceptance Checklist

### Existing functionality
- [ ] All existing routes return the same responses as before
- [ ] Existing `/doctor/patients/[id]` page loads and shows the same content as before
- [ ] Existing scan, report, appointment, message, and voice note pages are unaffected
- [ ] `prescriptions` (OCR) table and its routes are unaffected
- [ ] `medications` table and its routes are unaffected
- [ ] Patient selector at `/doctor/patients` still works

### Schema migrations
- [ ] All 6 new tables created without errors: `patient_notes`, `patient_files`, `doctor_prescriptions`, `doctor_prescription_items`, `patient_allergies`, `patient_conditions`
- [ ] No existing table or column was modified
- [ ] Migration was run via `npx drizzle-kit generate` + `npx drizzle-kit migrate`
- [ ] Seed data inserts without FK errors (uses integer IDs from real seeded users)

### Read-only dossier (Phase 1–2)
- [ ] `GET /doctor/patients/{id}/dossier` returns 200 with full payload
- [ ] `voice_notes` are returned (via scan JOIN) — not an empty array due to missing patient_id
- [ ] `messages` are returned (via conversation JOIN) — not empty due to missing patient_id
- [ ] `reports` use `diagnosis` not `title` in timeline summary
- [ ] `scans` use `modality` not `title` in timeline summary
- [ ] `appointments` use `notes` not `reason` in timeline summary
- [ ] `patient.blood_type` is returned (not `blood_group`)
- [ ] Timestamps in timeline events are integers (Unix ms), not ISO strings
- [ ] Non-doctor users receive 403
- [ ] Timeline is sorted newest-first (by integer timestamp, not string comparison)
- [ ] Patients with no records return empty arrays per category, not errors

### Dossier page (Phase 4)
- [ ] Page loads at `/doctor/patients/[id]/dossier`
- [ ] All sections render without placeholder data
- [ ] Alert strip is hidden when `alerts` is empty
- [ ] Timeline filter chips filter client-side correctly
- [ ] "View" links scroll to correct record card using `id` anchor
- [ ] Dates formatted correctly from integer Unix ms

### Write actions (Phase 3)
- [ ] Doctor can add a note (integer `linked_to_id` accepted)
- [ ] Doctor can edit a note (only their own)
- [ ] Doctor can upload a file (stored via existing uploads directory)
- [ ] Doctor can create a prescription with items (stored in `doctor_prescriptions` and `doctor_prescription_items`)
- [ ] Doctor can edit a prescription (only their own)
- [ ] Doctor can toggle a medicine item active/inactive (`is_active` stored as 0/1 integer)
- [ ] Toggle correctly coerced to boolean on frontend display
- [ ] All write actions fail gracefully with inline error messages

### Edge cases
- [ ] A patient with many records (20+ of each type) loads without timeout
- [ ] A patient with zero records in every category shows empty states, not errors
- [ ] File upload >10MB handles timeout or error gracefully
- [ ] `doctor_prescriptions` write routes do not touch the existing `prescriptions` OCR table

---

## Summary of New Files/Routes

| Type | Path | Notes |
|------|------|-------|
| Schema table | `patient_notes` | New |
| Schema table | `patient_files` | New |
| Schema table | `doctor_prescriptions` | RENAMED from `prescriptions` — conflict with existing OCR table |
| Schema table | `doctor_prescription_items` | RENAMED from `prescription_items` — avoids confusion with `medications` |
| Schema table | `patient_allergies` | New |
| Schema table | `patient_conditions` | New |
| Schema table | `patient_timeline_events` | Optional, new |
| API route (read) | `GET /doctor/patients/{id}/dossier` | Added to `backend/routers/doctor.py` |
| API route (write) | `POST /doctor/patients/{id}/notes` | Added to `backend/routers/doctor.py` |
| API route (write) | `PATCH /doctor/patients/{id}/notes/{noteId}` | Added to `backend/routers/doctor.py` |
| API route (write) | `POST /doctor/patients/{id}/files` | Added to `backend/routers/doctor.py` |
| API route (write) | `POST /doctor/patients/{id}/prescriptions` | Added to `backend/routers/doctor.py` (targets `doctor_prescriptions`) |
| API route (write) | `PATCH /doctor/patients/{id}/prescriptions/{prescriptionId}` | Added to `backend/routers/doctor.py` |
| API route (write) | `PATCH /doctor/patients/{id}/prescriptions/{prescriptionId}/items/{itemId}` | Added to `backend/routers/doctor.py` |
| API route (write) | `POST /doctor/patients/{id}/timeline/rebuild` | Optional, added to `backend/routers/doctor.py` |
| Frontend page | `frontend/app/doctor/patients/[id]/dossier/page.tsx` | New |
| Frontend API client | Additions to `frontend/lib/api/doctor.ts` | New methods only |

Nothing in this list modifies any existing file, route, or table.

---

## Required Schema Changes Summary

| Item | Change Type | Reason |
|------|-------------|--------|
| Add `patient_notes` | New table | New dossier feature |
| Add `patient_files` | New table | New dossier feature |
| Add `doctor_prescriptions` | New table | Renamed from `prescriptions` to avoid collision with existing OCR table |
| Add `doctor_prescription_items` | New table | Renamed from `prescription_items` to avoid confusion with `medications` |
| Add `patient_allergies` | New table | New dossier feature |
| Add `patient_conditions` | New table | New dossier feature |
| Add `patient_timeline_events` | New table (optional) | Performance cache only |

No existing tables are altered. No existing columns are modified.

---

*Document version: 2.0 | Refactored against DB_CONDITION.md | All schema references verified against lib/db/schema.ts*
