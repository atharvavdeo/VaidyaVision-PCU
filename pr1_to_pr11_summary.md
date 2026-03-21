# VaidyaVision — Exhaustive Master Document (PR1–PR11)

This document is the absolute, comprehensive single source of truth detailing every single structural, backend, frontend, and architectural change made during PR1 through PR11. It moves beyond high-level architecture into exact column-level definitions, API routing mechanisms, authentication loops, and React state machines.

---

## Part 1: PR1–PR6 — Database Architecture & Tenancy Foundations

The fundamental problem solved here was deprecating the hardcoded `scans` table (which assumed 1 User maps to 1 Scan) in favor of a modern, multi-tenant Medical Case framework utilizing `cases`, `hospitals`, and `artifacts`.

### 1. The Core Infrastructure (`lib/db/schema.ts`)

**A. Organizations (`hospitals`)**
- `id` (PK, autoIncrement)
- `name`, `city`, `state`, `code` (Unique 4-letter identifier like 'APHM')
- `settingsJson` (Nullable, for clinic-specific configurations)
- `logoUrl` (Nullable, injected into Patient UI)

**B. Tenancy & Affiliation (`hospital_memberships`)**
This table acts as the authorization bridge between Clerk (Auth) and SQLite (Data).
- `userId` (FK -> `users.id`), `hospitalId` (FK -> `hospitals.id`)
- `status`: Enum `['pending', 'active', 'suspended']`
- `membershipRole`: Enum `['hospital_admin', 'doctor', 'pathologist']`
- `specialtyId`: FK -> `specialties.id` (Used for auto-routing)
- **`isPrimary` (Boolean):** The single most important column for routing. When a clinician views `/doctor/cases`, the API looks for their `isPrimary = true` membership to know which hospital's data to fetch by default.

**C. Cross-Hospital Patient Privacy (`patients_hospitals`)**
- `patientId`, `hospitalId` (Composite PK setup conceptually)
- `mrn` (Medical Record Number, specifically scoped to *this* hospital, e.g., "MRN-12345" at Apollo vs "AP-999" at Fortis)
- `status`: Enum `['active', 'discharged', 'transferred']`

### 2. The Case Engine (`lib/db/schema.ts`)

**D. The Parent Container (`cases`)**
- `hospitalId`, `patientId` (FKs linking the Tenancy bounds)
- `status`: Strict Enum `['new', 'triaged', 'assigned', 'in_review', 'signed', 'released', 'closed']`
- `priority`: Enum `['low', 'medium', 'high', 'critical']`
- `presentingComplaint`, `internalSummary` (Doctor's private notes vs Triage notes)
- `sourceRole`: Who uploaded this? `['patient', 'doctor', 'pathologist', 'system']`

**E. Ownership (`case_assignments`)**
- `caseId` (FK -> `cases.id`), `assignedToMembershipId` (FK -> `hospital_memberships.id`)
- `status`: Enum `['assigned', 'accepted', 'completed', 'revoked']`

**F. Multi-Modal Uploads (`case_artifacts`)**
- `caseId` (FK -> `cases.id`)
- `artifactType`: Enum `['scan_image', 'pathology_image', 'prescription_image', 'lab_pdf', 'other']`
- `processingPipeline`: Target routing for background jobs `['none', 'ml_scan', 'ocr_doc', 'external']`
- `status`: Async Job state `['uploaded', 'processing', 'processed', 'failed']`
- `processingResultJson`: Stores the raw GradCAM Python output (diagnosis, heatmap urls, confidence scores).
- **`patientVisible`**: Boolean defaults to `false`. Guards raw clinical imagery from the patient portal until a doctor explicitly toggles it during report Release.

**G. Medical Reports & Versioning (`case_reports` & `case_report_versions`)**
- `case_reports` contains the mutable "living" draft of the diagnosis.
- `contentJson`: The private clinical findings.
- `patientSummary`: The public-facing, bedside-manner explanation.
- **`releasedMedicationsJson`**: A new text column formatted as structured JSON arrays allowing doctors to type out prescriptions inline (e.g., `["Paracetamol 500mg BID", "Bed rest"]`).
- `case_report_versions` creates an immutable row snapshot permanently locking `contentJson` and `patientSummary` the exact second a doctor clicks "Sign" or "Release", achieving HIPAA audit compliance.

### 3. Setup Scripts (`scripts/`)
- `seed-hospitals-mumbai.ts`: Bootstrapped Drizzle script to create "Apollo Mumbai", "Fortis Escorts", etc.
- `backfill-memberships.ts`: Backfills existing Clerk `users` into the `hospital_memberships` bridge table sequentially.

---

## Part 2: PR7 — Backend API Layer (12 New Routes)

The schema required strict Server-Side controllers to handle business logic, context resolution, and data validation.

### 1. `lib/api-auth.ts` (The Gatekeeper)
Centralized core logic utilized by *every* single route in PR7.
- **`resolveHospital(req, user)` Logic**:
  1.  Check URL query for `?hospitalId=X`.
  2.  If missing, check the serialized JSON body for `hospitalId`.
  3.  If missing, `SELECT` the user's `isPrimary=true, status='active'` row from `hospital_memberships`.
  4.  If no primary membership exists, instantly throw a `409 Conflict` (which the frontend intercepts to force the user to pick a hospital).

### 2. The Auto-Assignment Router (`POST /api/cases`)
When a pathologist hits "Submit Case", the backend runs this waterfall logic:
1.  **Direct Assignment:** Did the payload include a `primaryDoctorMembershipId`?
    *   Yes -> `INSERT INTO case_assignments` -> Fire `case_assigned` Notification -> End.
2.  **Specialty Matching:** Did the payload include a `primarySpecialtyId`?
    *   Yes -> `SELECT id FROM hospital_memberships WHERE specialtyId = primarySpecialtyId LIMIT 1`. Loop to assignment.
3.  **General Fallback:**
    *   `SELECT id FROM hospital_memberships WHERE hospitalId = X AND membershipRole = 'doctor' AND status = 'active' LIMIT 1`. Assign.

### 3. The Background Pipeline Trigger (`POST /api/artifacts/upload`)
Designed specifically to prevent the Next.js runtime from hanging while the external Python FastAPI ML model runs.
- **Synchronous Actions:** Parses `multipart/form-data`, saves raw binary to disk/S3, `INSERT INTO case_artifacts` with `status: 'processing'`, returns `HTTP 200 { artifactId }` to the Pathologist immediately.
- **Asynchronous Fire-and-Forget IIFE:**
  ```typescript
  (async () => {
    try {
        if (processingPipeline === "ml_scan") {
            // POST to http://localhost:8000/predict with Python ML Service logic
            // Wait for DenseNet GradCAM completion
            // UPDATE case_artifacts SET processingResultJson = result, status = 'processed'
        }
    } catch {
        // UPDATE case_artifacts SET status = 'failed'
    }
  })();
  ```

### 4. The Report State Machine (`PATCH /api/cases/[id]/reports`)
Handles intense validation rules:
- `action === 'save_draft'`: Unrestricted `UPDATE` to `contentJson` and `patientSummary`.
- `action === 'sign'`: Validates `findings` array is not empty. Sets `status='signed'`, locks the report, creates `INSERT INTO case_report_versions` snapshot.
- `action === 'release'`: Sets `status='released'`. Generates second snapshot. If `releaseArtifacts === true`, runs an `UPDATE case_artifacts SET patientVisible = true WHERE caseId = X`.

---

## Part 3: PR8 — Zero-Trust Visibility (Role-Based Projections)

Implemented natively in `lib/api-auth.ts`, these projections act as a database-tier firewall. We DO NOT rely on React to hide variables. The server strips them before casting them to JSON.

- **`patientCaseProjection`**: The `GET /api/cases` route for a patient is hard-coded to:
  `{ where: and(eq(cases.patientId, currentUserId), eq(cases.status, 'released')) }`.
- **`patientReportProjection`**: Inside `GET /api/cases/[id]`, if rule = patient:
  `contentJson: null, internalSummary: null, aiUncertainty: null`. Only `patientSummary` and `releasedMedicationsJson` serialize.
- **`patientArtifactProjection`**: Overrides the artifact array. `artifacts.filter(a => a.patientVisible === true)`.

---

## Part 4: PR9 — Pathologist Frontend (`app/pathologist/page.tsx`)

The UI for bulk clinical uploading.
- **Layout Shell**: Mapped to `app/pathologist/layout.tsx`, utilizing `Sidebar role="doctor"`.
- **React State Machine (`step`)**: Uses a string literal union type `'hospital' | 'patient' | 'file' | 'submitting' | 'success'` to conditionally render massive `<div className="bento-card">` components.
- **Step 1 & 2**: Live `<input type="text">` search bars querying the backend `/api/hospitals/[id]/patients` endpoint to cross-reference MRNs dynamically.
- **Step 3 File DropZone**: Intercepts `onDrop` events natively. Uses a CSS grid to allow the pathologist to tag `artifactType` (Pathology vs Scan) and `modality` (Skin, Lung, Brain) which updates the React payload state.
- **Step 4 Polling Hook**: Once the `POST` succeeds, a `useCallback` hook triggers a `setInterval()` every 2000 milliseconds:
  ```typescript
  const poll = setInterval(async () => {
    const res = await fetch(`/api/cases/${caseId}/artifacts`);
    if(res.data[0].status === 'processed') {
      clearInterval(poll);
      setArtifactStatus("processed"); // Triggers green checkmark UI
    }
  }, 2000)
  ```

---

## Part 5: PR10 — Doctor Diagnostic Portal Frontend

The tactical interface for clinical review and reporting.

### 1. `app/doctor/cases/page.tsx` (Inbox)
- Implements Tab components (`activeTab="assigned" | "in_review" | "signed" | "released"`).
- Implements Priority pills that live-filter the API parameters (`?priority=high`).
- Uses Tailwind CSS dynamic mapping (`priorityColors[c.priority]`) to render pulsing red dots specifically for `critical` flags.

### 2. `app/doctor/cases/[id]/page.tsx` (Diagnostic Dashboard)
A massive 3-column CSS Grid layout (`grid-cols-1 xl:grid-cols-3`).
- **Left Column (Context)**: Interates over the `artifacts[]` state. If clicked, sets `setSelectedArtifact(a)`.
- **Center Column (Viewport + ML)**:
  - Conditionally maps `selectedArtifact.mimeType`. If `pdf`, mounts an external link shortcut. If image, bounds an `<img className="object-contain">`.
  - Parses `mlResult = JSON.parse(selectedArtifact.processingResultJson)`. Directly maps `mlResult.heatmap_url` as an overlay. Dynamically constructs progress bars `<div style={{width: \`\${mlResult.confidence * 100}%\`}}>` for GradCAM AI feedback.
- **Right Column (Report Builder)**:
  - Uses managed `useState` for `reportTitle`, `findings` (locked for `contentJson`), `patientSummary`, and `medications`.
  - Conditional rendering checks `editingReport?.status`. If `draft`, renders Save/Sign. If `signed`, locks inputs and mounts `Release` and strict `Release + Show Images` buttons holding `action='release'` payloads for the PR7 Patch route.

### 3. `app/doctor/settings/hospital/page.tsx`
- Maps over `/api/memberships`. Finds `m.isPrimary === true` to inject a `ring-2 ring-olive-800` outline via Tailwind.
- The "Set Primary" button executes an optimistic UI update, placing a `Loader2` spin lock over the specific row's button using `setSaving(m.id)` until the atomic `PATCH /api/memberships` returns OK.

---

## Part 6: PR11 — Patient Frontend (`app/patient/cases/page.tsx`)

The highly constrained, public-facing portal.

- **The Inbox Grid (`page.tsx`)**: The UI renders a grid of case cards. Because PR8 strictly filtered this down to `status='released'`, the frontend purely maps over `cases.map()`. Extracts the dynamically nested `c.hospital.logoUrl` to build "Branded" UI headers (e.g., an Apollo-branded card vs a Fortis-branded card).
- **The Detailed View (`[id]/page.tsx`)**:
  - `medications` array parser: A safe `try/catch` block that manually runs `JSON.parse(latestReport.releasedMedicationsJson)` and maps them into green `<Pill className="w-4 h-4 text-olive-600" />` List Items in the UI.
  - The Artifact Image grid only maps through images implicitly stripped to safe outputs by `patientArtifactProjection` in the API. If none are sent down the pipe, it elegantly renders nothing.
  - A permanent "Privacy Note" component is painted at the bottom reading *"Only information approved by your doctor is shown... internal case data remains with your care team."* to establish absolute platform transparency while maintaining medical boundaries.
