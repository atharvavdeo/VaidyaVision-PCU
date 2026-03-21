# Summary Feature Plan

## Goal

Build a doctor-facing global summary copilot that lets a doctor ask for a patient brief in natural language, fetches the latest patient data from the database, and returns a concise, clinically useful summary.

The feature should be:

- chat-first for the hackathon MVP
- easy to extend to voice input later
- low-conflict for teammates working on other features
- mostly additive, with minimal edits to existing files

---

## MVP Scope

The MVP will support this flow:

1. Doctor opens a dedicated summary chat page.
2. Doctor types a request like:
   - "Give me a full brief for Rahul Verma"
   - "What changed for Sneha Patel in the last 7 days?"
   - "Summarize latest scans, prescriptions, and appointments for Kawaljeet"
3. A small LLM converts the request into a structured query form.
4. Server-side code fetches the latest patient data from the DB.
5. A same LLM is called again and it summarizes the fetched context into a doctor-friendly patient brief.
6. The response is shown in a chat-like UI.

For MVP, this should be a one-shot interaction, not a full persistent AI chat system. Make it in a manner in which I can easily make it a AI chat system. i.e. I can easily extend it in a loop till the doctor stops the chat.

---

## Why This Approach

This is the easiest hackathon-safe option because:

- it reuses the current Next.js + Drizzle backend
- it avoids DB schema changes
- it avoids risky text-to-SQL generation
- it avoids touching the ML service
- it can reuse the existing voice input component later
- it minimizes merge conflicts with teammates

---

## Recommended Architecture

### High-level pipeline

1. Doctor input
2. Intent parsing by a small LLM
3. Structured request validation
4. Deterministic DB retrieval
5. Context formatting
6. Summary generation by LLM
7. Render result in chat UI

### Two-LLM pattern

#### Step 1: Parser model

Use a smaller/faster model to convert natural language into a structured request.

Suggested use:

- `llama-3.1-8b-instant`

Responsibilities:

- identify the patient
- identify intent
- identify timeframe
- identify which data categories to include
- ask for clarification if the patient is ambiguous

#### Step 2: Summary model

Use a stronger(for the MVP just reuse the llama-3.1-8b-instant) model to summarize the retrieved patient context.

Suggested use(Dont use now):

- `llama-3.3-70b-versatile`

Responsibilities:

- summarize the patient status
- highlight latest changes
- mention new scans/reports/uploads
- present doctor notes, prescriptions, and appointments clearly
- call out urgent items or pending follow-ups
- All of which will be in point format

---

## Core Design Principle

The LLM should not query the database directly.

Instead:

- LLM parses intent
- server code performs DB queries
- LLM summarizes trusted retrieved data

This keeps the feature safer, easier to debug, and faster to build.

---

## Structured Request Shape

For MVP, define a validated request object in TypeScript.

Use `zod` for validation in Next.js.

Example shape:

```ts
type SummaryIntent =
  | "full_brief"
  | "latest_updates"
  | "timeline"
  | "scans"
  | "reports"
  | "prescriptions"
  | "medications"
  | "appointments"
  | "notes";

type SummaryRequest = {
  patientRef: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    mrn?: string;
  };
  intent: SummaryIntent;
  include: Array<
    | "profile"
    | "scans"
    | "reports"
    | "prescriptions"
    | "medications"
    | "appointments"
    | "cases"
    | "artifacts"
    | "notes"
  >;
  timeframe?: {
    from?: string;
    to?: string;
  };
  askClarifyingQuestion?: boolean;
};
```

---

## Data Sources To Use

The summary context should pull from current DB entities already present in the app.

### Must-have tables for MVP

- `users`
- `scans`
- `reports`
- `appointments`
- `prescriptions`
- `medications`
- `cases`
- `case_artifacts`
- `case_reports`

### Nice-to-have tables

- `doctor_profiles`
- `medication_logs`
- `voice_notes`
- `messages`
- `patient_hospital_links`

### Where doctor notes likely come from

- `scans.doctorNotes`
- `reports.findings`
- `reports.recommendations`
- `reports.diagnosis`
- `cases.internalSummary`
- `case_reports.patientSummary`
- `case_reports.contentJson`

---

## Suggested Output Format

Return a structured doctor-facing summary with sections like:

1. Patient Overview
2. Latest Updates
3. Recent Scans and Reports
4. Medications and Prescriptions
5. Appointments and Follow-ups
6. Doctor Notes / Clinical Notes
7. Risks / Pending Attention Items

This format is predictable and demo-friendly.

---

## Hackathon MVP File Plan

### New files

- `app/api/doctor/copilot/route.ts`
- `app/doctor/copilot/page.tsx`
- `lib/doctor-copilot/types.ts`
- `lib/doctor-copilot/parseRequest.ts`
- `lib/doctor-copilot/getPatientContext.ts`
- `lib/doctor-copilot/summarizePatientContext.ts`
- `components/doctor/DoctorCopilotPanel.tsx`

### Existing files with likely small edits

- doctor navigation component for adding a link to the new page
- optional shared styling/util file if needed

### Files to avoid changing in MVP

- DB schema files
- migration files
- existing patient-doctor chat backend
- ML service
- existing report generation flow

---

## API Design

### Route

`POST /api/doctor/copilot`

### Input

```json
{
  "message": "Give me a complete brief for Rahul Verma including latest scans and prescriptions"
}
```

### Output

Example success:

```json
{
  "ok": true,
  "request": {
    "patientRef": { "name": "Rahul Verma" },
    "intent": "full_brief",
    "include": ["profile", "scans", "reports", "prescriptions", "medications", "appointments", "notes"]
  },
  "resolvedPatient": {
    "id": 4,
    "name": "Rahul Verma"
  },
  "summary": "..."
}
```

Example clarification:

```json
{
  "ok": false,
  "needsClarification": true,
  "question": "I found multiple patients matching Rahul. Which patient do you mean?"
}
```

---

## Retrieval Strategy

### Deterministic patient resolution

For MVP:

- first try exact patient name match
- then case-insensitive partial name match
- if multiple results, ask clarification
- do not guess silently

### Context assembly rules

Always fetch newest data first so the brief includes recent uploads and updates.

Suggested retrieval order:

1. Patient profile
2. Latest scans
3. Latest reports
4. Latest prescriptions
5. Current medications
6. Upcoming and recent appointments
7. Related cases and case artifacts
8. Doctor notes / internal notes

### Important requirement

If a new scan was uploaded after the previous review, it must appear in the summary automatically because retrieval should always use the latest DB state.

---

## UI Plan

### MVP UI

Build a separate doctor-only page instead of modifying the existing patient-doctor conversation system.

Why:

- lower merge conflict risk
- clearer UX for the hackathon
- easier to demo
- easier to remove or improve later

### UI behavior

- one input box for doctor queries
- submit button
- optional voice input button
- chat-like response area
- loading state while summary is generated
- optional "sources used" section below summary

### Reuse opportunities

- reuse existing chat styling patterns
- reuse existing voice input button component

---

## Voice Extension Plan

Voice should be an extension of the same input pipeline, not a separate backend.

### MVP+ voice approach

- use the current voice input button on the doctor copilot input
- voice transcription fills or submits the same text field
- backend stays unchanged

### Why this is ideal

- no separate voice orchestration required
- no new speech backend needed
- typed and voice requests follow exactly the same logic

### If extra time remains

Potential enhancements:

- automatic submit after transcript
- "listening" visual state
- voice response playback using browser speech synthesis
- turn-by-turn voice conversation UX

### Do not do in hackathon MVP unless time remains

- real-time streaming voice agent
- telephony integration
- separate Python voice pipeline

---

## Implementation Phases

### Phase 1: Backend foundation

- create request types/schema
- implement natural language parser prompt
- validate structured request
- resolve patient safely
- fetch patient context deterministically
- summarize context

### Phase 2: UI

- create doctor copilot page
- add chat-like interface
- call backend route
- render summary sections

### Phase 3: Voice input

- plug in existing voice input button
- route transcript to same input field

### Phase 4: Optional polish

- add source preview
- add recent prompt suggestions
- add clarification handling UI
- add copy/share button

---

## Edge Cases

The feature should handle:

- patient not found
- multiple patients with similar names
- no recent scans/reports/prescriptions
- summary request too vague
- missing Groq API key
- partial DB data for old records

Suggested behavior:

- ask a short clarifying question when ambiguity exists
- never hallucinate missing data
- clearly state when no data is available in a category

---

## Security and Access Control

This feature must be doctor-only in MVP.

Minimum controls:

- require authenticated user
- require `doctor` role
- ideally limit retrieval to patients visible to that doctor or hospital context

If time is limited, start with doctor-only access.
If time allows, extend to hospital-scoped access using existing auth helpers.

---

## Risks

### Low-risk

- new standalone page
- new API route
- reuse current LLM integration pattern
- reuse voice input component

### Medium-risk

- patient matching ambiguity
- overly large DB context payload
- inconsistent note formats across tables

### High-risk items to avoid for MVP

- text-to-SQL
- persistent AI thread storage
- DB schema changes
- moving logic into Python service
- streaming multi-agent orchestration

---

## Recommended Demo Script

1. Open doctor copilot page
2. Ask:
   "Give me a full brief for Rahul Verma"
3. Show that summary includes:
   - patient profile
   - recent scans
   - any new reports
   - medications/prescriptions
   - appointments
   - latest doctor notes
4. Ask:
   "What changed in the last 7 days?"
5. Show targeted update response
6. If time permits, repeat via voice input

---

## Final Recommendation

For the hackathon, implement this as:

- a standalone doctor copilot section(a button that opens a chat window looking UI element)
- one backend route
- deterministic DB retrieval
- small model for parsing
- Same model for summarization(for the MVP)
- typed chat input first
- voice input as a drop-in extension if time remains

This gives the best balance of:

- demo value
- low engineering risk
- minimal team conflict
- future extensibility

