# Patient Dossier — Combined Implementation Plan

> **Codebase sync — March 2026**
> All table names, column names, types, primary key strategies, foreign keys, and ORM patterns
> are confirmed against `lib/db/schema.ts` and `CODEBASE_STATUS.md`. This plan is
> implementation-ready with no unresolved gaps.

---

## Core Principle

**Do not remove or modify any existing functionality.** Every existing route, screen, and data
access pattern must continue working exactly as it does today. This plan only adds new things.
The dossier is a new unified surface that reads from the same underlying data. Duplication of
data access (reading the same record from both an existing route and the new dossier route) is
acceptable and intentional.

---

## Tech Stack Reference (confirmed)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 18 + TypeScript |
| ORM | Drizzle ORM — snake_case DB columns, camelCase TS fields |
| Primary keys | `serial` (integer auto-increment) — **not UUID** |
| Database | PostgreSQL via Neon serverless (`@neondatabase/serverless`) |
| Migrations | drizzle-kit — output to `medical-ai-platform/drizzle/` |
| Auth | Clerk (`@clerk/nextjs`) + DB user resolution via `lib/api-auth.ts` |

> ⚠️ **Primary keys are `serial` integers throughout the codebase — not UUIDs.**
> All new tables must follow the same convention. Do not use `gen_random_uuid()`.

---

## Confirmed Schema Facts (resolved from `schema.ts`)

### `users` table — patient/doctor fields available for the dossier summary

| TS field | DB column | Type | Notes |
|----------|-----------|------|-------|
| `id` | `id` | `serial` PK | integer |
| `name` | `name` | `text` | |
| `age` | `age` | `integer` | direct field, no computation needed |
| `gender` | `gender` | `text` | |
| `bloodType` | `blood_type` | `text` | field is `bloodType`, not `bloodGroup` |
| `phone` | `phone` | `text` | |
| `medicalHistory` | `medical_history` | `text` | |
| `role` | `role` | enum | `'patient'|'doctor'|'admin'|'pathologist'|'hospital_admin'` |

### `voiceNotes` — linked to `scans`, NOT to patients directly

`voice_notes` has no `patientId` column. It links via `scanId → scans.patientId`.
To fetch voice notes for a patient, join through `scans`:

```ts
// fetch scanIds for this patient first, then:
db.query.voiceNotes.findMany({
  where: inArray(voiceNotes.scanId, patientScanIds),
  orderBy: [desc(voiceNotes.createdAt)],
})
```

### `messages` — linked to `conversations`, NOT to patients directly

`messages` has no `patientId`. Join through `conversations.patientId`:

```ts
// fetch conversationIds for this patient first, then:
db.query.messages.findMany({
  where: inArray(messages.conversationId, patientConversationIds),
  orderBy: [desc(messages.createdAt)],
})
```

### `prescriptions` — OCR-extracted image documents, NOT doctor-written prescriptions

The existing `prescriptions` table stores scanned prescription images with OCR output
(`imageUrl`, `rawText`, `structuredData` as JSON string, `ocrConfidence`, etc.).
It is **not** a structured doctor-authored prescription record.

**The dossier needs a separate, new `doctor_prescriptions` table** for structured
doctor-written prescriptions with line items. The existing `prescriptions` table will
still be read in the dossier as "Uploaded Prescription Documents" (a distinct section).

### `medications` — the structured drug list (already exists)

`medications` has `patientId`, `prescriptionId` (optional FK to OCR prescriptions),
`doctorId`, `drugName`, `dosage`, `form`, `frequency`, `duration`, `isActive`,
`addedBy` (`'ocr'|'doctor'|'patient'`). This is the correct table for structured
medication data. No new medications table is needed.

### `familyMembers` — has only `patientId`, `relation`, `name`

No additional fields beyond these three columns.

---

## Phase 1 — Schema Extensions

These are additive. No existing table is dropped or altered in a breaking way.

### 1.1 Existing Tables Already Present (no migration needed)

These will be **read** by the dossier. Do not recreate them.

| Table | TS export | Dossier use |
|-------|-----------|-------------|
| `scans` | `scans` | Diagnostic events |
| `reports` | `reports` | Clinical reports |
| `appointments` | `appointments` | Scheduled visits |
| `voice_notes` | `voiceNotes` | Voice transcripts (via scans join) |
| `conversations` + `messages` | `conversations`, `messages` | Patient-doctor chat (via conversations join) |
| `family_members` | `familyMembers` | Emergency contacts |
| `prescriptions` | `prescriptions` | OCR-scanned prescription images |
| `medications` | `medications` | Structured drug list |
| `medication_logs` | `medicationLogs` | Medication adherence |
| `exercise_routines` | `exerciseRoutines` | Prescribed exercises |
| `exercise_logs` | `exerciseLogs` | Exercise adherence |

---

### 1.2 New Tables to Create

All new tables use `serial` PKs and `integer` FKs, consistent with the rest of the schema.
All reference `users(id)` for patient/doctor — there is no separate `patients` or `doctors` table.

---

#### `patient_notes`

Doctor-authored free-text notes about a patient, optionally linked to a specific record.

```sql
CREATE TABLE patient_notes (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       INTEGER NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  linked_to_type  TEXT,   -- 'scan' | 'report' | 'appointment' | null
  linked_to_id    INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_notes_patient_id ON patient_notes(patient_id);
CREATE INDEX idx_patient_notes_doctor_id  ON patient_notes(doctor_id);
```

Drizzle definition to add to `schema.ts`:

```ts
export const patientNotes = pgTable("patient_notes", {
  id:           serial("id").primaryKey(),
  patientId:    integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId:     integer("doctor_id").notNull().references(() => users.id),
  content:      text("content").notNull(),
  linkedToType: text("linked_to_type"),   // 'scan' | 'report' | 'appointment' | null
  linkedToId:   integer("linked_to_id"),
  createdAt:    timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  updatedAt:    timestamp("updated_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const patientNotesRelations = relations(patientNotes, ({ one }) => ({
  patient: one(users, { fields: [patientNotes.patientId], references: [users.id] }),
  doctor:  one(users, { fields: [patientNotes.doctorId],  references: [users.id] }),
}));
```

---

#### `patient_files`

Doctor-uploaded files associated with a patient (labs, discharge summaries, external reports).
Reuses the existing upload infrastructure; only stores metadata.

```sql
CREATE TABLE patient_files (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id       INTEGER NOT NULL REFERENCES users(id),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT,     -- mime type e.g. 'application/pdf'
  file_size       INTEGER,  -- bytes
  linked_to_type  TEXT,     -- 'scan' | 'report' | 'appointment' | null
  linked_to_id    INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_files_patient_id ON patient_files(patient_id);
```

Drizzle definition:

```ts
export const patientFiles = pgTable("patient_files", {
  id:           serial("id").primaryKey(),
  patientId:    integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId:     integer("doctor_id").notNull().references(() => users.id),
  fileName:     text("file_name").notNull(),
  fileUrl:      text("file_url").notNull(),
  fileType:     text("file_type"),
  fileSize:     integer("file_size"),
  linkedToType: text("linked_to_type"),
  linkedToId:   integer("linked_to_id"),
  createdAt:    timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const patientFilesRelations = relations(patientFiles, ({ one }) => ({
  patient: one(users, { fields: [patientFiles.patientId], references: [users.id] }),
  doctor:  one(users, { fields: [patientFiles.doctorId],  references: [users.id] }),
}));
```

---

#### `doctor_prescriptions`

Structured prescriptions authored by a doctor (distinct from OCR-scanned `prescriptions`).

```sql
CREATE TABLE doctor_prescriptions (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   INTEGER NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctor_prescriptions_patient_id ON doctor_prescriptions(patient_id);
```

---

#### `doctor_prescription_items`

Individual drug line items for a `doctor_prescription`.

```sql
CREATE TABLE doctor_prescription_items (
  id                     SERIAL PRIMARY KEY,
  doctor_prescription_id INTEGER NOT NULL REFERENCES doctor_prescriptions(id) ON DELETE CASCADE,
  medicine_name          TEXT NOT NULL,
  dosage                 TEXT,
  frequency              TEXT,
  duration               TEXT,
  directions             TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMP NOT NULL DEFAULT now(),
  updated_at             TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_dpi_prescription_id ON doctor_prescription_items(doctor_prescription_id);
```

Drizzle definitions:

```ts
export const doctorPrescriptions = pgTable("doctor_prescriptions", {
  id:        serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  doctorId:  integer("doctor_id").notNull().references(() => users.id),
  title:     text("title").notNull(),
  notes:     text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const doctorPrescriptionItems = pgTable("doctor_prescription_items", {
  id:                   serial("id").primaryKey(),
  doctorPrescriptionId: integer("doctor_prescription_id").notNull()
                          .references(() => doctorPrescriptions.id, { onDelete: "cascade" }),
  medicineName:         text("medicine_name").notNull(),
  dosage:               text("dosage"),
  frequency:            text("frequency"),
  duration:             text("duration"),
  directions:           text("directions"),
  isActive:             boolean("is_active").notNull().default(true),
  createdAt:            timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
  updatedAt:            timestamp("updated_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const doctorPrescriptionsRelations = relations(doctorPrescriptions, ({ one, many }) => ({
  patient: one(users, { fields: [doctorPrescriptions.patientId], references: [users.id] }),
  doctor:  one(users, { fields: [doctorPrescriptions.doctorId],  references: [users.id] }),
  items:   many(doctorPrescriptionItems),
}));

export const doctorPrescriptionItemsRelations = relations(doctorPrescriptionItems, ({ one }) => ({
  prescription: one(doctorPrescriptions, {
    fields: [doctorPrescriptionItems.doctorPrescriptionId],
    references: [doctorPrescriptions.id],
  }),
}));
```

---

#### `patient_allergies`

```sql
CREATE TABLE patient_allergies (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  severity    TEXT,   -- 'Mild' | 'Moderate' | 'Severe'
  notes       TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_allergies_patient_id ON patient_allergies(patient_id);
```

Drizzle definition:

```ts
export const patientAllergies = pgTable("patient_allergies", {
  id:        serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  allergen:  text("allergen").notNull(),
  severity:  text("severity"),
  notes:     text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const patientAllergiesRelations = relations(patientAllergies, ({ one }) => ({
  patient: one(users, { fields: [patientAllergies.patientId], references: [users.id] }),
}));
```

---

#### `patient_conditions`

```sql
CREATE TABLE patient_conditions (
  id           SERIAL PRIMARY KEY,
  patient_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition    TEXT NOT NULL,
  diagnosed_at TEXT,   -- stored as 'YYYY-MM-DD' string, consistent with medicationLogs.logDate pattern
  status       TEXT,   -- 'Active' | 'Resolved' | 'Chronic'
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_conditions_patient_id ON patient_conditions(patient_id);
```

Drizzle definition:

```ts
export const patientConditions = pgTable("patient_conditions", {
  id:          serial("id").primaryKey(),
  patientId:   integer("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  condition:   text("condition").notNull(),
  diagnosedAt: text("diagnosed_at"),   // 'YYYY-MM-DD' string
  status:      text("status"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at", { mode: "date" }).notNull().$defaultFn(() => new Date()),
});

export const patientConditionsRelations = relations(patientConditions, ({ one }) => ({
  patient: one(users, { fields: [patientConditions.patientId], references: [users.id] }),
}));
```

---

#### `patient_timeline_events` (optional — for performance only)

Only create this if the dossier timeline query is measurably slow in production.
It is a denormalized cache; source of truth remains the individual tables.

```sql
CREATE TABLE patient_timeline_events (
  id          SERIAL PRIMARY KEY,
  patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  event_id    INTEGER NOT NULL,
  event_date  TIMESTAMP NOT NULL,
  summary     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_patient_id_date ON patient_timeline_events(patient_id, event_date DESC);
```

---

### 1.3 Seed Updates

After running migrations, update the seed file with at least one row per new table for
each seeded patient. Mark all seed rows with `-- SEED DATA` comment so they can be
stripped before production.

---

## Phase 2 — Backend: New Dossier API Endpoint

### 2.1 Route to Add

```
GET /api/doctor/patients/[id]/dossier
```

File: `medical-ai-platform/app/api/doctor/patients/[id]/dossier/route.ts`

The existing `GET /api/doctor/patients/[id]` route must not be changed.

---

### 2.2 Auth Check

Follow the same pattern as existing route handlers that use `lib/api-auth.ts`:

1. Resolve the current DB user via the auth helper (`getAuthUser` / `getCurrentUser`).
2. Confirm `user.role === 'doctor'`. Return `403` if not.
3. Confirm the doctor has access to this patient: check that a row exists in
   `patient_hospital_links` where `patientId = id` AND the `hospitalId` matches one
   of the doctor's active `hospital_memberships`. Return `403` if no matching link.

---

### 2.3 Full Query Plan

Pre-fetch IDs needed for indirect joins, then run all remaining queries in parallel.

```ts
import { db } from '@/lib/db';
import { eq, inArray, desc } from 'drizzle-orm';
import {
  users, scans, reports, appointments, voiceNotes,
  conversations, messages, familyMembers,
  prescriptions, medications, medicationLogs,
  exerciseRoutines, exerciseLogs,
  patientNotes, patientFiles, patientAllergies, patientConditions,
  doctorPrescriptions,
} from '@/lib/db/schema';

const patientId = parseInt(params.id, 10);

// Step 1: fetch IDs needed for indirect joins
const [patientScans, patientConversations] = await Promise.all([
  db.select({ id: scans.id }).from(scans).where(eq(scans.patientId, patientId)),
  db.select({ id: conversations.id }).from(conversations).where(eq(conversations.patientId, patientId)),
]);

const scanIds         = patientScans.map(s => s.id);
const conversationIds = patientConversations.map(c => c.id);

// Step 2: fetch everything in parallel
const [
  patient,
  allScans,
  allReports,
  allAppointments,
  allVoiceNotes,
  allMessages,
  allFamilyMembers,
  allOcrPrescriptions,
  allMedications,
  allMedicationLogs,
  allExerciseRoutines,
  allExerciseLogs,
  allNotes,
  allFiles,
  allDoctorPrescriptions,
  allAllergies,
  allConditions,
] = await Promise.all([
  db.query.users.findFirst({ where: eq(users.id, patientId) }),

  db.query.scans.findMany({
    where: eq(scans.patientId, patientId),
    orderBy: [desc(scans.uploadedAt)],
  }),

  db.query.reports.findMany({
    where: eq(reports.patientId, patientId),
    orderBy: [desc(reports.createdAt)],
  }),

  db.query.appointments.findMany({
    where: eq(appointments.patientId, patientId),
    orderBy: [desc(appointments.scheduledAt)],
  }),

  // voiceNotes: no patientId — join through scan IDs
  scanIds.length > 0
    ? db.query.voiceNotes.findMany({
        where: inArray(voiceNotes.scanId, scanIds),
        orderBy: [desc(voiceNotes.createdAt)],
      })
    : Promise.resolve([]),

  // messages: no patientId — join through conversation IDs
  conversationIds.length > 0
    ? db.query.messages.findMany({
        where: inArray(messages.conversationId, conversationIds),
        orderBy: [desc(messages.createdAt)],
      })
    : Promise.resolve([]),

  db.query.familyMembers.findMany({
    where: eq(familyMembers.patientId, patientId),
  }),

  // existing OCR-scanned prescription images
  db.query.prescriptions.findMany({
    where: eq(prescriptions.patientId, patientId),
    orderBy: [desc(prescriptions.uploadedAt)],
  }),

  db.query.medications.findMany({
    where: eq(medications.patientId, patientId),
    orderBy: [desc(medications.createdAt)],
  }),

  db.query.medicationLogs.findMany({
    where: eq(medicationLogs.patientId, patientId),
    orderBy: [desc(medicationLogs.createdAt)],
  }),

  db.query.exerciseRoutines.findMany({
    where: eq(exerciseRoutines.patientId, patientId),
    orderBy: [desc(exerciseRoutines.createdAt)],
  }),

  db.query.exerciseLogs.findMany({
    where: eq(exerciseLogs.patientId, patientId),
    orderBy: [desc(exerciseLogs.createdAt)],
  }),

  // new tables
  db.query.patientNotes.findMany({
    where: eq(patientNotes.patientId, patientId),
    orderBy: [desc(patientNotes.createdAt)],
  }),

  db.query.patientFiles.findMany({
    where: eq(patientFiles.patientId, patientId),
    orderBy: [desc(patientFiles.createdAt)],
  }),

  db.query.doctorPrescriptions.findMany({
    where: eq(doctorPrescriptions.patientId, patientId),
    orderBy: [desc(doctorPrescriptions.createdAt)],
    with: { items: true },
  }),

  db.query.patientAllergies.findMany({
    where: eq(patientAllergies.patientId, patientId),
  }),

  db.query.patientConditions.findMany({
    where: eq(patientConditions.patientId, patientId),
  }),
]);
```

---

### 2.4 Build Timeline Array

```ts
type TimelineEvent = {
  id: number;
  type: 'scan' | 'report' | 'appointment' | 'note' | 'file' |
        'doctor_prescription' | 'ocr_prescription' | 'message' | 'voice_note';
  date: string;       // ISO 8601
  summary: string;
  record_id: number;
};

const timeline: TimelineEvent[] = [
  ...allScans.map(s => ({
    id: s.id, type: 'scan' as const,
    date: s.uploadedAt.toISOString(),
    summary: `${s.modality} scan — ${s.status}`,
    record_id: s.id,
  })),
  ...allReports.map(r => ({
    id: r.id, type: 'report' as const,
    date: r.createdAt.toISOString(),
    summary: r.diagnosis.slice(0, 60),
    record_id: r.id,
  })),
  ...allAppointments.map(a => ({
    id: a.id, type: 'appointment' as const,
    date: a.scheduledAt.toISOString(),
    summary: a.notes ?? `${a.type} appointment`,
    record_id: a.id,
  })),
  ...allVoiceNotes.map(v => ({
    id: v.id, type: 'voice_note' as const,
    date: (v.createdAt ?? new Date()).toISOString(),
    summary: v.transcription.slice(0, 60),
    record_id: v.id,
  })),
  ...allMessages.map(m => ({
    id: m.id, type: 'message' as const,
    date: m.createdAt.toISOString(),
    summary: m.content.slice(0, 60),
    record_id: m.id,
  })),
  ...allNotes.map(n => ({
    id: n.id, type: 'note' as const,
    date: n.createdAt.toISOString(),
    summary: n.content.slice(0, 60),
    record_id: n.id,
  })),
  ...allFiles.map(f => ({
    id: f.id, type: 'file' as const,
    date: f.createdAt.toISOString(),
    summary: f.fileName,
    record_id: f.id,
  })),
  ...allDoctorPrescriptions.map(p => ({
    id: p.id, type: 'doctor_prescription' as const,
    date: p.createdAt.toISOString(),
    summary: p.title,
    record_id: p.id,
  })),
  ...allOcrPrescriptions.map(p => ({
    id: p.id, type: 'ocr_prescription' as const,
    date: p.uploadedAt.toISOString(),
    summary: `Scanned prescription — ${p.documentType}`,
    record_id: p.id,
  })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```

---

### 2.5 Build Alerts Array

```ts
const alerts: string[] = [];

if (allAllergies.length > 0) {
  alerts.push(`Allergies: ${allAllergies.map(a => a.allergen).join(', ')}`);
}

const activeConditions = allConditions.filter(
  c => c.status === 'Active' || c.status === 'Chronic'
);
if (activeConditions.length > 0) {
  alerts.push(`Active conditions: ${activeConditions.map(c => c.condition).join(', ')}`);
}

const criticalScans = allScans.filter(s => s.priority === 'critical');
if (criticalScans.length > 0) {
  alerts.push(`${criticalScans.length} critical scan(s) on record`);
}
```

---

### 2.6 Response Shape

```ts
if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

return Response.json({
  patient: {
    id:             patient.id,
    name:           patient.name,
    age:            patient.age,
    gender:         patient.gender,
    bloodType:      patient.bloodType,    // field is bloodType, not bloodGroup
    phone:          patient.phone,
    medicalHistory: patient.medicalHistory,
  },
  alerts,
  timeline,
  records: {
    scans:               allScans,
    reports:             allReports,
    appointments:        allAppointments,
    voiceNotes:          allVoiceNotes,
    messages:            allMessages,
    familyMembers:       allFamilyMembers,
    ocrPrescriptions:    allOcrPrescriptions,
    medications:         allMedications,
    medicationLogs:      allMedicationLogs,
    exerciseRoutines:    allExerciseRoutines,
    exerciseLogs:        allExerciseLogs,
    notes:               allNotes,
    files:               allFiles,
    doctorPrescriptions: allDoctorPrescriptions,
    allergies:           allAllergies,
    conditions:          allConditions,
  },
});
```

---

### 2.7 Error Handling

- If `patient` is `null` after the query → `404 Not Found`.
- If auth check fails → `403 Forbidden`.
- Wrap the entire handler in try/catch → `500` on unexpected errors. No stack traces in the response body.

---

## Phase 3 — Backend: Write Routes

All new routes. Nothing existing is modified.

### 3.1 Notes

```
POST   /api/doctor/patients/[id]/notes
PATCH  /api/doctor/patients/[id]/notes/[noteId]
```

**POST handler:**
1. Auth: resolve DB user; confirm `role === 'doctor'`.
2. Parse body: `{ content: string, linkedToType?: string, linkedToId?: number }`.
3. Validate: `content` non-empty; `linkedToType` if present must be `'scan'|'report'|'appointment'`.
4. Insert into `patient_notes`.
5. Return created row, status `201`.

**PATCH handler:**
1. Auth: resolve DB user; confirm the row's `doctorId === currentUser.id`.
2. Parse body: `{ content?: string }`.
3. Update only present fields; set `updatedAt = new Date()`.
4. Return updated row, status `200`.

---

### 3.2 Files

```
POST  /api/doctor/patients/[id]/files
```

**POST handler:**
1. Auth: resolve DB user; confirm `role === 'doctor'`.
2. Parse multipart form. Extract file binary and optional `linkedToType`, `linkedToId`.
3. Pass the file to the **existing `POST /api/upload` route logic**. Extract that logic
   into a shared helper in `lib/upload.ts` rather than duplicating. Retrieve the `fileUrl`.
4. Insert row into `patient_files` with `fileName`, `fileUrl`, `fileType`, `fileSize`,
   `linkedToType`, `linkedToId`.
5. Return created row, status `201`.

---

### 3.3 Doctor Prescriptions

```
POST   /api/doctor/patients/[id]/prescriptions
PATCH  /api/doctor/patients/[id]/prescriptions/[prescriptionId]
```

> These routes write to `doctor_prescriptions` + `doctor_prescription_items` (new tables),
> **not** to the existing `prescriptions` table (which is OCR-only).

**POST handler:**
1. Auth: resolve DB user; confirm `role === 'doctor'`.
2. Parse body:
   ```ts
   {
     title: string,
     notes?: string,
     items: Array<{
       medicineName: string,
       dosage?: string,
       frequency?: string,
       duration?: string,
       directions?: string,
     }>
   }
   ```
3. Validate: `title` required; `items` must be an array (can be empty).
4. Insert into `doctor_prescriptions`; bulk-insert all items into `doctor_prescription_items`
   with the new `doctorPrescriptionId`.
5. Return the prescription with its `items` array, status `201`.

**PATCH handler:**
1. Auth: confirm `row.doctorId === currentUser.id`.
2. Parse body: `{ title?, notes?, items? }`. `items` is a full replacement array.
3. Update `doctor_prescriptions` row; set `updatedAt = new Date()`.
4. If `items` present: delete all existing `doctor_prescription_items` for this
   prescription, then insert the new array.
5. Return updated prescription with items, status `200`.

---

### 3.4 Prescription Item Active/Inactive Toggle

```
PATCH  /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]
```

**PATCH handler:**
1. Auth: resolve DB user; confirm `role === 'doctor'`.
2. Parse body: `{ isActive: boolean }`.
3. Update `isActive` on the `doctor_prescription_items` row.
4. Set `updatedAt = new Date()` on both the item and its parent `doctor_prescriptions` row.
5. Return updated item, status `200`.

---

### 3.5 Timeline Rebuild (optional)

```
POST  /api/doctor/patients/[id]/timeline/rebuild
```

Only implement if using `patient_timeline_events`. Deletes and rebuilds all cached events
for the patient. Return `{ ok: true }`, status `200`.

---

## Phase 4 — Frontend: Dossier Page

### 4.1 New Route

File: `app/doctor/patients/[id]/dossier/page.tsx`

The existing `app/doctor/patients/[id]/page.tsx` must not change.

---

### 4.2 Data Fetching

Fetch from `GET /api/doctor/patients/[id]/dossier` on page load.
Show a skeleton matching the layout while loading.
Store the response in component state (shape mirrors the response from Phase 2.6).

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
│  sectioned list of all record types        │
└────────────────────────────────────────────┘
```

All three zones on one scrollable page. No nested tabs hiding content by default.

---

### 4.4 Summary Header

Display these fields using confirmed field names:

| UI label | Source field |
|----------|-------------|
| Full name | `patient.name` |
| Age | `patient.age` |
| Gender | `patient.gender` |
| Blood type | `patient.bloodType` (**not** `bloodGroup`) |
| Phone | `patient.phone` |
| Medical history | `patient.medicalHistory` (truncate; show-more toggle if long) |

Below patient info: quick stats — total scans, reports, appointments, doctor prescriptions
(counts from the `records` object).

Below quick stats: **alert strip** — horizontal scrollable row of warning badges from
`alerts`. Hide entirely if `alerts` is empty.

Below alert strip: **quick action buttons**:
- `Add Note` → Add Note modal (Phase 4.7)
- `Upload File` → file picker (Phase 4.8)
- `New Prescription` → New Prescription modal (Phase 4.9)

---

### 4.5 Timeline Section

**Filter chips** (client-side, no API call):

| Chip | Event types shown |
|------|------------------|
| All | everything |
| Clinical | `scan`, `report`, `appointment`, `note`, `voice_note` |
| Files | `file`, `ocr_prescription` |
| Communication | `message` |
| Medications | `doctor_prescription` |

**Event cards** — for each event in the filtered timeline:
- Event type icon (distinct icon per type)
- Human-readable date (e.g. "14 Feb 2025")
- Summary text
- "View" button scrolling to `#{type}-{record_id}` anchor in the Records section

---

### 4.6 Records Section

Each card must have `id="{type}-{record_id}"` for scroll-to targeting.
Each sub-section shows an empty state if its list is empty (see Phase 4.10).

**Scans**
- Modality + status badge
- `uploadedAt` date
- Link to `/doctor/scan/[id]` (existing page — do not rebuild)

**Reports**
- Diagnosis (truncated) + severity badge + date
- Link to `/doctor/reports/[id]` (existing page)

**Appointments**
- Date/time, type, status badge (`scheduled`/`confirmed`/`completed`/`cancelled`)
- Notes (truncated)

**Voice Transcripts** (fetched via scan join)
- Date (`createdAt`)
- `transcription` text (truncated, expand toggle)
- Audio playback if `audioUrl` is present (`voiceNotes.audioUrl` is nullable)

**Messages** (fetched via conversation join)
- `content` (truncated) + `senderId` + date
- Link to `/doctor/messages`

**Notes** (new — `patientNotes`)
- `content` (truncated, expand toggle)
- `doctorId` (resolve name if needed)
- Date
- "Edit" button → Edit Note modal (Phase 4.7)

**Files** (new — `patientFiles`)
- `fileName`
- File type badge (from `fileType`)
- File size (human-readable from `fileSize` bytes)
- Download link opening `fileUrl` in new tab

**OCR Prescription Documents** (existing `prescriptions`)
- `documentType` badge
- `uploadedAt` date
- OCR confidence (`ocrConfidence`) if available
- Button/link to view `imageUrl`
- `cleanedText` preview if present

**Doctor Prescriptions** (new — `doctorPrescriptions`)
- `title` + date
- Table of `items[]`: `medicineName`, `dosage`, `frequency`, `duration`, `directions`,
  active/inactive toggle
- "Edit" button → Edit Prescription modal (Phase 4.9)

**Medications** (existing `medications`)
- `drugName`, `dosage`, `form`, `frequency`
- `isActive` badge + `addedBy` badge (`ocr`/`doctor`/`patient`)
- Link to `/doctor/prescriptions` for full management

**Allergies** (new — `patientAllergies`)
- `allergen` name + severity badge + `notes`

**Conditions** (new — `patientConditions`)
- `condition` name + status badge + `diagnosedAt` + `notes`

**Exercise Routines** (existing `exerciseRoutines`)
- `name`, `type`, `frequency`, `isActive` badge, `addedBy` badge

**Family Members** (existing `familyMembers`)
- `name` and `relation` (only these two fields exist on the table)

---

### 4.7 Add / Edit Note Modal

Trigger: `Add Note` button or `Edit` on a note card.

Fields:
- `Content` — textarea, required
- `Link to record` — optional: "None", "Scan", "Report", "Appointment". If a type is
  chosen, show a second dropdown listing this patient's records of that type.

On submit:
- Adding → `POST /api/doctor/patients/[id]/notes` with `{ content, linkedToType, linkedToId }`.
- Editing → `PATCH /api/doctor/patients/[id]/notes/[noteId]` with `{ content }`.
- Success: close modal; update notes list in state (no full re-fetch).
- Error: inline error inside modal; do not close.

---

### 4.8 File Upload Flow

Trigger: `Upload File` button.

UI: file picker (all types) + optional link-to-record dropdown + upload button + progress indicator.

On upload: `POST /api/doctor/patients/[id]/files` (multipart).
Success: append new file card to files list in state.
Error: show inline error.

---

### 4.9 New / Edit Prescription Modal

Trigger: `New Prescription` button or `Edit` on a doctor prescription card.

Fields:
- `Title` — text, required
- `Notes` — textarea, optional
- Dynamic medicine item rows: `medicineName` (required), `dosage`, `frequency`,
  `duration`, `directions`, remove-row button
- `Add medicine` button appends a new empty row

On submit:
- New → `POST /api/doctor/patients/[id]/prescriptions`
- Editing → `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]`
- Success: close modal; update prescriptions list in state.
- Error: inline error; do not close modal.

**Active/inactive toggle** (inline on prescription item cards):
- On toggle → `PATCH .../prescriptions/[prescriptionId]/items/[itemId]` with `{ isActive }`.
- Success: update item in state.
- Error: revert toggle; show toast error.

---

### 4.10 Empty States

Each sub-section shows a contextual message when its list is empty. Do not leave blank space.

Examples:
- Scans: "No scans uploaded yet."
- Notes: "No notes yet. Click Add Note to add one."
- Allergies: "No allergies on record."
- Family Members: "No family members on record."

---

### 4.11 Loading and Error States

- Initial load: full-page skeleton mirroring the layout.
- Write failure: toast or inline error; do not navigate away.
- `403`: "You do not have access to this patient."
- `404`: "Patient not found."
- `500`: "Something went wrong." + retry button.

---

## Phase 5 — Wire the Patient Selector

The existing `/doctor/patients` page fetches from `GET /api/users/patients` (confirmed).
Add an `Open Dossier` link/button alongside the existing patient entry, pointing to
`/doctor/patients/[id]/dossier`. Do not change the existing link or row click behavior.

---

## Phase 6 — Acceptance Checklist

### Existing functionality
- [ ] All existing routes return the same responses as before
- [ ] `GET /api/doctor/patients/[id]` unchanged
- [ ] `POST /api/ocr/save` still writes to the existing `prescriptions` table correctly
- [ ] `/doctor/prescriptions` page still reads `medications` and `prescriptions` correctly
- [ ] Existing scan, report, appointment, message, and voice note pages unaffected
- [ ] `/doctor/patients` list still works with both the existing link and the new dossier link

### Read-only dossier (Phase 1–2)
- [ ] `GET /api/doctor/patients/[id]/dossier` returns 200 with full payload
- [ ] Non-doctor users receive 403
- [ ] Doctors cannot access dossiers for patients outside their hospital links (403)
- [ ] Empty arrays returned (not errors) for categories with no records
- [ ] `voiceNotes` correctly fetched via scan join (not a direct patient FK)
- [ ] `messages` correctly fetched via conversation join (not a direct patient FK)
- [ ] Timeline is sorted newest-first
- [ ] `patient.bloodType` used in response and UI (not `bloodGroup`)

### Dossier page (Phase 4)
- [ ] Page loads at `/doctor/patients/[id]/dossier`
- [ ] All sections render without hardcoded placeholder data
- [ ] Alert strip hidden when `alerts` is empty
- [ ] Timeline filter chips filter client-side correctly
- [ ] Timeline "View" links scroll to the correct record card

### Write actions (Phase 3–4.9)
- [ ] Doctor can add a note; appears without page reload
- [ ] Doctor can edit a note; updated content appears
- [ ] Doctor can upload a file; appears in files section
- [ ] Doctor can create a doctor prescription with medicine items
- [ ] Doctor can edit a doctor prescription
- [ ] Doctor can toggle a medicine item active/inactive
- [ ] All write actions fail gracefully with inline errors
- [ ] Existing `prescriptions` (OCR) table is not written to by any new route

### Edge cases
- [ ] Patient with 20+ records of each type has no performance issues
- [ ] Patient with zero records in every category shows dossier with empty states
- [ ] File upload >10MB handles timeout or error gracefully
- [ ] Patient with no scans returns empty `voiceNotes` without error (inArray guard)
- [ ] Patient with no conversations returns empty `messages` without error (inArray guard)

---

## Summary of New Files / Routes

| Type | Path |
|------|------|
| Migration | `patient_notes` |
| Migration | `patient_files` |
| Migration | `doctor_prescriptions` |
| Migration | `doctor_prescription_items` |
| Migration | `patient_allergies` |
| Migration | `patient_conditions` |
| Migration | `patient_timeline_events` (optional) |
| Schema update | `lib/db/schema.ts` — Drizzle table + relations definitions for all above |
| API route (read) | `GET /api/doctor/patients/[id]/dossier` |
| API route (write) | `POST /api/doctor/patients/[id]/notes` |
| API route (write) | `PATCH /api/doctor/patients/[id]/notes/[noteId]` |
| API route (write) | `POST /api/doctor/patients/[id]/files` |
| API route (write) | `POST /api/doctor/patients/[id]/prescriptions` |
| API route (write) | `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]` |
| API route (write) | `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]` |
| API route (write) | `POST /api/doctor/patients/[id]/timeline/rebuild` (optional) |
| Frontend page | `app/doctor/patients/[id]/dossier/page.tsx` |

Nothing in this list modifies any existing file, route, or table.

---

## Key Corrections from Schema Review

| Earlier assumption | Actual schema fact |
|---|---|
| `patients` / `doctors` tables with UUID PKs | Single `users` table, `serial` integer PKs |
| `prescriptions` = structured doctor prescriptions | `prescriptions` = OCR image documents only; new `doctor_prescriptions` table needed |
| `prescription_items` table | Does not exist; drug items live in `medications`; new `doctor_prescription_items` needed |
| `voice_notes.patientId` | No `patientId` column; linked only via `scanId` → must join through scans |
| `messages.patientId` | No `patientId` column; linked only via `conversationId` → must join through conversations |
| `users.bloodGroup` | Field is `bloodType` (`blood_type` in DB) |
| `users.age` computed from `dateOfBirth` | `age` is a direct `integer` column; no computation needed |
| UUID primary keys throughout | All PKs are `serial` integers |
| `familyMembers` has many fields | Only three columns: `id`, `patientId`, `relation`, `name` |
