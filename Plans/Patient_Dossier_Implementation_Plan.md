# Patient Dossier — Combined Implementation Plan

## Core Principle

**Do not remove or modify any existing functionality.** Every existing route, screen, and data access pattern must continue working exactly as it does today. This plan only adds new things. The dossier is a new unified surface that reads from the same underlying data. Duplication of data access (reading the same record from both an existing route and the new dossier route) is acceptable and intentional.

---

## Phase 1 — Schema Extensions

These are additive. No existing table is dropped or altered in a breaking way. Add columns only if they don't exist.

### 1.1 New Tables to Create

Run these migrations in order. Each table is independent unless a foreign key is noted.

---

#### `patient_notes`

```sql
CREATE TABLE patient_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    UUID NOT NULL REFERENCES doctors(id),
  content      TEXT NOT NULL,
  linked_to_type  TEXT,         -- 'scan' | 'report' | 'appointment' | null
  linked_to_id    UUID,         -- foreign key to the linked entity, nullable
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_notes_patient_id ON patient_notes(patient_id);
CREATE INDEX idx_patient_notes_doctor_id  ON patient_notes(doctor_id);
```

---

#### `patient_files`

```sql
CREATE TABLE patient_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    UUID NOT NULL REFERENCES doctors(id),
  file_name    TEXT NOT NULL,
  file_url     TEXT NOT NULL,        -- storage URL returned by existing upload route
  file_type    TEXT,                 -- mime type e.g. 'application/pdf'
  file_size    BIGINT,               -- bytes
  linked_to_type  TEXT,             -- 'scan' | 'report' | 'appointment' | null
  linked_to_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_files_patient_id ON patient_files(patient_id);
```

---

#### `prescriptions`

```sql
CREATE TABLE prescriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    UUID NOT NULL REFERENCES doctors(id),
  title        TEXT NOT NULL,        -- e.g. "Post-surgery medication plan"
  notes        TEXT,
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
```

---

#### `prescription_items`

```sql
CREATE TABLE prescription_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id  UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name    TEXT NOT NULL,
  dosage           TEXT,             -- e.g. "500mg"
  frequency        TEXT,             -- e.g. "Twice daily"
  duration         TEXT,             -- e.g. "7 days"
  directions       TEXT,             -- e.g. "Take after meals"
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);
```

---

#### `patient_allergies`

```sql
CREATE TABLE patient_allergies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen     TEXT NOT NULL,        -- e.g. "Penicillin"
  severity     TEXT,                 -- e.g. "Mild" | "Moderate" | "Severe"
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_allergies_patient_id ON patient_allergies(patient_id);
```

---

#### `patient_conditions`

```sql
CREATE TABLE patient_conditions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition    TEXT NOT NULL,        -- e.g. "Type 2 Diabetes"
  diagnosed_at DATE,
  status       TEXT,                 -- e.g. "Active" | "Resolved" | "Chronic"
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_conditions_patient_id ON patient_conditions(patient_id);
```

---

#### `patient_timeline_events` (optional, for performance)

Use this if the dossier timeline query is slow. It is a denormalized cache of events across all record types.

```sql
CREATE TABLE patient_timeline_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,        -- 'scan' | 'report' | 'appointment' | 'note' | 'file' | 'prescription' | 'message' | 'voice_note'
  event_id     UUID NOT NULL,        -- id of the source record
  event_date   TIMESTAMPTZ NOT NULL,
  summary      TEXT,                 -- short human-readable label for the event card
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_patient_id_date ON patient_timeline_events(patient_id, event_date DESC);
```

---

### 1.2 Seed Updates

After running migrations, update the seed file to insert at least one row per new table for each seeded patient. This is so the dossier page never opens to a completely empty state during development. Seed data should be clearly marked with a comment so it is easy to strip before production.

---

## Phase 2 — Backend: New Dossier API Endpoint

### 2.1 Route to Add

```
GET /api/doctor/patients/[id]/dossier
```

This is a **new route**. The existing `GET /api/doctor/patients/[id]` route must not be changed. It continues to return whatever it returns today. The dossier route returns a richer, unified payload described below.

---

### 2.2 Auth Check

At the top of the handler, before any DB query:

1. Get the session/token from the request.
2. Confirm the session user has role `doctor`.
3. If not a doctor, return `403 Forbidden`.
4. Optionally, confirm the doctor has access to this patient (e.g., doctor is assigned to the patient or belongs to the same clinic). Return `403` if not.

---

### 2.3 Full Query Plan

Run these queries in parallel (use `Promise.all` or equivalent):

```ts
const [
  patient,
  scans,
  reports,
  appointments,
  voiceNotes,
  messages,
  familyMembers,
  notes,
  files,
  prescriptions,
  allergies,
  conditions,
] = await Promise.all([
  db.patients.findUnique({ where: { id: patientId } }),
  db.scans.findMany({ where: { patient_id: patientId }, orderBy: { created_at: 'desc' } }),
  db.reports.findMany({ where: { patient_id: patientId }, orderBy: { created_at: 'desc' } }),
  db.appointments.findMany({ where: { patient_id: patientId }, orderBy: { scheduled_at: 'desc' } }),
  db.voice_notes.findMany({ where: { patient_id: patientId }, orderBy: { created_at: 'desc' } }),
  db.messages.findMany({ where: { patient_id: patientId }, orderBy: { sent_at: 'desc' } }),
  db.family_members.findMany({ where: { patient_id: patientId } }),
  db.patient_notes.findMany({ where: { patient_id: patientId }, orderBy: { created_at: 'desc' } }),
  db.patient_files.findMany({ where: { patient_id: patientId }, orderBy: { created_at: 'desc' } }),
  db.prescriptions.findMany({
    where: { patient_id: patientId },
    include: { items: true },
    orderBy: { issued_at: 'desc' }
  }),
  db.patient_allergies.findMany({ where: { patient_id: patientId } }),
  db.patient_conditions.findMany({ where: { patient_id: patientId } }),
]);
```

Adjust the table and field names to match your actual ORM/schema. The point is all queries run in parallel.

---

### 2.4 Build Timeline Array

After all queries resolve, assemble a unified timeline. Each event in the array has a common shape:

```ts
type TimelineEvent = {
  id: string;
  type: 'scan' | 'report' | 'appointment' | 'note' | 'file' | 'prescription' | 'message' | 'voice_note';
  date: string;           // ISO 8601 timestamp
  summary: string;        // one-line label for the card
  record_id: string;      // id of the source record
};
```

Build the array:

```ts
const timeline: TimelineEvent[] = [
  ...scans.map(s => ({ id: s.id, type: 'scan', date: s.created_at, summary: s.title ?? 'Scan', record_id: s.id })),
  ...reports.map(r => ({ id: r.id, type: 'report', date: r.created_at, summary: r.title ?? 'Report', record_id: r.id })),
  ...appointments.map(a => ({ id: a.id, type: 'appointment', date: a.scheduled_at, summary: a.reason ?? 'Appointment', record_id: a.id })),
  ...voiceNotes.map(v => ({ id: v.id, type: 'voice_note', date: v.created_at, summary: 'Voice transcript', record_id: v.id })),
  ...messages.map(m => ({ id: m.id, type: 'message', date: m.sent_at, summary: m.content?.slice(0, 60) ?? 'Message', record_id: m.id })),
  ...notes.map(n => ({ id: n.id, type: 'note', date: n.created_at, summary: n.content?.slice(0, 60) ?? 'Note', record_id: n.id })),
  ...files.map(f => ({ id: f.id, type: 'file', date: f.created_at, summary: f.file_name, record_id: f.id })),
  ...prescriptions.map(p => ({ id: p.id, type: 'prescription', date: p.issued_at, summary: p.title, record_id: p.id })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```

---

### 2.5 Build Alerts Array

Alerts are surfaced at the top of the dossier as a warning strip. Build them from existing data:

```ts
const alerts: string[] = [];

if (allergies.length > 0) {
  alerts.push(`Allergies: ${allergies.map(a => a.allergen).join(', ')}`);
}

const activeConditions = conditions.filter(c => c.status === 'Active' || c.status === 'Chronic');
if (activeConditions.length > 0) {
  alerts.push(`Active conditions: ${activeConditions.map(c => c.condition).join(', ')}`);
}
```

Add more alert rules as the product requires.

---

### 2.6 Response Shape

```ts
return Response.json({
  patient: {
    id: patient.id,
    name: patient.name,
    age: patient.age,          // or compute from date_of_birth
    gender: patient.gender,
    blood_group: patient.blood_group,
    phone: patient.phone,
    medical_history: patient.medical_history,
  },
  alerts,
  timeline,
  records: {
    scans,
    reports,
    appointments,
    voice_notes: voiceNotes,
    messages,
    family_members: familyMembers,
    notes,
    files,
    prescriptions,   // each prescription includes its items array
    allergies,
    conditions,
  }
});
```

---

### 2.7 Error Handling in the Route

- If `patient` is `null` after the query, return `404 Not Found`.
- Wrap the entire handler body in a try/catch. On any unexpected error, return `500` with a generic message. Do not leak stack traces to the client.

---

## Phase 3 — Backend: Write Routes

All of these are **new routes**. Nothing existing is modified.

### 3.1 Notes

```
POST   /api/doctor/patients/[id]/notes
PATCH  /api/doctor/patients/[id]/notes/[noteId]
```

**POST handler:**
1. Auth check: must be a doctor.
2. Parse body: `{ content: string, linked_to_type?: string, linked_to_id?: string }`.
3. Validate: `content` must be a non-empty string. `linked_to_type` if present must be one of `scan`, `report`, `appointment`.
4. Insert into `patient_notes`.
5. Return the created row as JSON with status `201`.

**PATCH handler:**
1. Auth check: must be the same doctor who created the note (check `doctor_id` on the row).
2. Parse body: `{ content?: string }`. Only update fields that are present.
3. Set `updated_at = now()`.
4. Return the updated row as JSON with status `200`.

---

### 3.2 Files

```
POST  /api/doctor/patients/[id]/files
```

**POST handler:**
1. Auth check: must be a doctor.
2. Parse multipart form data. Extract the file binary and any metadata fields (`linked_to_type`, `linked_to_id`).
3. Pass the file binary to the **existing upload route/function** internally. Do not duplicate upload logic. Call the existing upload handler as a function or make an internal request and get back the `file_url`.
4. Insert a row into `patient_files` with the returned `file_url`, `file_name`, `file_type`, `file_size`, `linked_to_type`, `linked_to_id`.
5. Return the created `patient_files` row as JSON with status `201`.

---

### 3.3 Prescriptions

```
POST   /api/doctor/patients/[id]/prescriptions
PATCH  /api/doctor/patients/[id]/prescriptions/[prescriptionId]
```

**POST handler:**
1. Auth check: must be a doctor.
2. Parse body:
   ```ts
   {
     title: string,
     notes?: string,
     items: Array<{
       medicine_name: string,
       dosage?: string,
       frequency?: string,
       duration?: string,
       directions?: string,
     }>
   }
   ```
3. Validate: `title` required, `items` must be an array (can be empty).
4. Insert into `prescriptions`, then insert all `items` into `prescription_items` with the new `prescription_id`.
5. Return the prescription with its items as JSON with status `201`.

**PATCH handler:**
1. Auth check: must be the doctor who created the prescription.
2. Parse body: `{ title?, notes?, items? }`. Items here is a full replacement array (delete old items, insert new ones) for simplicity.
3. Update `prescriptions` row, set `updated_at = now()`.
4. If `items` is in the body: delete all existing `prescription_items` for this prescription, then insert the new array.
5. Return updated prescription with items as JSON with status `200`.

---

### 3.4 Prescription Item Active/Inactive Toggle

```
PATCH  /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]
```

**PATCH handler:**
1. Auth check: must be a doctor.
2. Parse body: `{ is_active: boolean }`.
3. Update the `is_active` field on the specific `prescription_items` row.
4. Set `updated_at = now()` on both the item and the parent prescription.
5. Return the updated item as JSON with status `200`.

---

### 3.5 Timeline Rebuild (optional, only if using `patient_timeline_events`)

```
POST  /api/doctor/patients/[id]/timeline/rebuild
```

**POST handler:**
1. Auth check: must be a doctor.
2. Delete all rows in `patient_timeline_events` where `patient_id = id`.
3. Re-run the timeline assembly logic from Phase 2.4.
4. Bulk insert the new events into `patient_timeline_events`.
5. Return `{ ok: true }` with status `200`.

Call this endpoint automatically after any write (note, file, prescription) by chaining it server-side, or trigger it manually for debugging.

---

## Phase 4 — Frontend: Dossier Page

### 4.1 New Route

Add the page at:

```
/doctor/patients/[id]/dossier
```

The existing page at `/doctor/patients/[id]` must not change. The dossier is a new page at a different path.

The patient selector at `/doctor/patients` can add a "Open Dossier" button/link alongside the existing patient link. Do not remove the existing link.

---

### 4.2 Data Fetching

On page load, fetch from `GET /api/doctor/patients/[id]/dossier`. While loading, show a skeleton/loading state for each section. On error (non-200), show an error banner with the status code and a retry button.

Store the response in component state. The shape mirrors the API response from Phase 2.6.

---

### 4.3 Layout Structure

The page is divided into three vertical zones, top to bottom:

```
┌────────────────────────────────────────────┐
│  SUMMARY HEADER                            │
│  patient info · alerts · quick actions     │
├────────────────────────────────────────────┤
│  TIMELINE                                  │
│  all events · filter bar · linked cards    │
├────────────────────────────────────────────┤
│  RECORDS                                   │
│  tabbed or sectioned list of all records   │
└────────────────────────────────────────────┘
```

All three zones are on one scrollable page. No nested tabs that hide content by default.

---

### 4.4 Summary Header

Display the following fields from `patient`:
- Full name (large text)
- Age and gender on one line
- Blood group
- Phone number
- Medical history (truncated with "show more" if long)

Below patient info, display quick stats: total scans, total reports, total appointments, total prescriptions. These are counts derived from the `records` object.

Below quick stats, render the **alert strip**: a horizontally scrollable row of alert badges. Each badge is from the `alerts` array. Use a warning color (yellow/orange). If `alerts` is empty, hide the strip entirely.

Below the alert strip, render **quick action buttons**:
- `Add Note` — opens the Add Note modal (Phase 4.7)
- `Upload File` — opens the file picker (Phase 4.8)
- `New Prescription` — opens the New Prescription modal (Phase 4.9)

---

### 4.5 Timeline Section

**Filter bar** — a horizontal row of filter chips, one per type:
- All (default)
- Clinical (shows: scan, report, appointment, note, voice_note)
- Files
- Communication (shows: message)
- Medications (shows: prescription)

The selected chip filters the timeline array client-side. No API call is needed for filtering.

**Event cards** — for each event in the (filtered) timeline array, render a card with:
- Event type icon (use a different icon per type)
- Event date formatted as a human-readable string (e.g. "14 Feb 2025")
- Summary text
- A "View" link/button that scrolls the page to the corresponding record in the Records section below (use an `id` anchor on each record card)

---

### 4.6 Records Section

Divide records into sub-sections. Render each sub-section sequentially, separated by a heading. Each sub-section has a heading and a list of cards.

Sub-sections and what to show on each card:

**Scans**
- Scan title or "Untitled Scan"
- Date
- Link to existing scan detail page (use the existing route, do not rebuild it)

**Reports**
- Report title
- Date
- Link to existing report detail page

**Notes** (new)
- Note content (truncated if long, with expand toggle)
- Author (doctor name)
- Date
- "Edit" button (opens Edit Note modal — Phase 4.7)

**Voice Transcripts**
- Date
- Transcript text (truncated, with expand toggle)
- Audio playback if a URL is available

**Files** (new)
- File name
- File type badge
- File size (human-readable, e.g. "1.2 MB")
- Download link (opens `file_url` in a new tab)

**Appointments**
- Date and time
- Reason/notes
- Status badge (e.g. Scheduled, Completed, Cancelled)
- Link to existing appointment detail if one exists

**Messages**
- Message content (truncated)
- Sender name and date
- Link to existing conversation thread

**Prescriptions** (new)
- Prescription title
- Issue date
- Table of medicine items: medicine name, dosage, frequency, duration, directions, active/inactive toggle
- "Edit" button (opens Edit Prescription modal — Phase 4.9)

**Allergies** (new)
- Allergen name
- Severity badge
- Notes

**Conditions** (new)
- Condition name
- Status badge
- Diagnosed date
- Notes

**Family Members**
- Name and relationship
- Any other fields already stored

Each card must have an `id` attribute equal to `{type}-{record_id}` so the timeline "View" links can scroll to it. Example: `id="scan-abc123"`.

---

### 4.7 Add / Edit Note Modal

Trigger: `Add Note` button in summary header, or `Edit` button on a note card.

Modal fields:
- `Content` — textarea, required
- `Link to record` — optional dropdown: "None", "Scan", "Report", "Appointment". If a type is chosen, show a second dropdown listing the records of that type for this patient. The user picks one.

On submit:
- If adding: call `POST /api/doctor/patients/[id]/notes` with `{ content, linked_to_type, linked_to_id }`.
- If editing: call `PATCH /api/doctor/patients/[id]/notes/[noteId]` with `{ content }`.
- On success: close modal. Append the new note (or replace the existing one) in the notes list in component state without re-fetching the full dossier.
- On error: show an inline error message inside the modal. Do not close the modal.

---

### 4.8 File Upload Flow

Trigger: `Upload File` button in summary header.

UI:
- File picker (accept any file type)
- Optional: dropdown to link to a scan/report/appointment (same pattern as the note modal)
- Upload button

On upload:
- POST multipart form to `POST /api/doctor/patients/[id]/files`.
- Show upload progress if the browser supports it.
- On success: append the new file card to the files list in component state.
- On error: show inline error.

---

### 4.9 New / Edit Prescription Modal

Trigger: `New Prescription` button in summary header, or `Edit` on a prescription card.

Modal fields:
- `Title` — text input, required
- `Notes` — textarea, optional
- **Medicine items** — a dynamic list of rows. Each row has:
  - Medicine name (text input, required)
  - Dosage (text input)
  - Frequency (text input)
  - Duration (text input)
  - Directions (text input)
  - Remove row button
- `Add medicine` button — appends a new empty row

On submit:
- If new: call `POST /api/doctor/patients/[id]/prescriptions` with `{ title, notes, items }`.
- If editing: call `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]` with `{ title, notes, items }`.
- On success: close modal. Update prescriptions list in state.
- On error: show inline error inside modal.

**Active/Inactive toggle on prescription item cards** (outside the modal, inline in the record card):
- Each medicine row in the rendered prescription card has a toggle switch for `is_active`.
- On toggle: call `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]` with `{ is_active: newValue }`.
- On success: update the item in state.
- On error: revert the toggle and show a toast error.

---

### 4.10 Empty States

Each sub-section in the Records zone must show an empty state message when its list is empty. Example: "No notes yet. Click Add Note to add one." Do not leave blank space or render nothing.

---

### 4.11 Loading and Error States

- On initial page load: show a full-page skeleton loader that mirrors the layout (header skeleton, timeline skeleton, records skeleton).
- On write action failure: show a toast or inline error. Do not navigate away from the page.
- If the dossier fetch returns 403: show "You do not have access to this patient."
- If the dossier fetch returns 404: show "Patient not found."
- If the dossier fetch returns 500: show "Something went wrong. Try again." with a retry button that re-fetches.

---

## Phase 5 — Wire the Patient Selector

The existing `/doctor/patients` page shows a list of patients. After this milestone, each patient entry should have two actions:
- Existing link (keep it exactly as is)
- New `Open Dossier` link/button pointing to `/doctor/patients/[id]/dossier`

Do not change the default click behavior of the patient row if it already navigates somewhere.

---

## Phase 6 — Acceptance Checklist

Go through this list before marking the implementation complete.

### Existing functionality
- [ ] All existing routes return the same responses as before
- [ ] Existing `/doctor/patients/[id]` page loads and shows the same content as before
- [ ] Existing scan, report, appointment, message, and voice note pages are unaffected
- [ ] Patient selector at `/doctor/patients` still works and links to the existing patient page

### Read-only dossier (Phase 1–2)
- [ ] `GET /api/doctor/patients/[id]/dossier` returns a 200 with the full payload
- [ ] Non-doctor users receive 403 from the dossier endpoint
- [ ] Doctors cannot access dossiers of patients they do not have access to (403)
- [ ] Patients with no records in a category return empty arrays (not errors) for that category
- [ ] Timeline is sorted newest-first

### Dossier page (Phase 4)
- [ ] Page loads at `/doctor/patients/[id]/dossier`
- [ ] All sections render without hardcoded placeholder data
- [ ] Alert strip is hidden when there are no alerts
- [ ] Timeline filter chips filter the timeline client-side correctly
- [ ] Timeline "View" links scroll to the correct record card

### Write actions (Phase 3–4.7/4.8/4.9)
- [ ] Doctor can add a note and it appears in the notes section without page reload
- [ ] Doctor can edit a note and the updated content appears
- [ ] Doctor can upload a file and it appears in the files section
- [ ] Doctor can create a prescription with medicine items
- [ ] Doctor can edit a prescription (title, notes, items)
- [ ] Doctor can toggle a medicine item active/inactive
- [ ] All write actions fail gracefully with inline error messages

### Edge cases
- [ ] A patient with many records (20+ of each type) does not cause performance issues on the dossier page
- [ ] A patient with zero records in every category shows the dossier with empty states, not errors
- [ ] File upload of a large file (>10MB) handles timeout or error gracefully

---

## Summary of New Files/Routes

| Type | Path |
|------|------|
| Migration | `patient_notes`, `patient_files`, `prescriptions`, `prescription_items`, `patient_allergies`, `patient_conditions`, `patient_timeline_events` (optional) |
| API route (read) | `GET /api/doctor/patients/[id]/dossier` |
| API route (write) | `POST /api/doctor/patients/[id]/notes` |
| API route (write) | `PATCH /api/doctor/patients/[id]/notes/[noteId]` |
| API route (write) | `POST /api/doctor/patients/[id]/files` |
| API route (write) | `POST /api/doctor/patients/[id]/prescriptions` |
| API route (write) | `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]` |
| API route (write) | `PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]` |
| API route (write) | `POST /api/doctor/patients/[id]/timeline/rebuild` (optional) |
| Frontend page | `/doctor/patients/[id]/dossier` |

Nothing in this list modifies any existing file, route, or table.
