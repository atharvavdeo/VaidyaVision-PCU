# CODEBASE_STATUS

## Repository Overview

- Status: confirmed
- Monorepo root: VaidyaVision-PCU
- Primary app: medical-ai-platform (Next.js app router + API routes)
- Additional service: medical-ai-platform/ml-service (FastAPI/Python ML + OCR + research)
- Planning/docs: Plans/, medical-ai-platform/docs/

Tech stack (confirmed from code):
- Frontend/App server: Next.js 16 + React 18 + TypeScript
- API layer: Next.js route handlers under app/api
- Auth: Clerk (@clerk/nextjs + middleware auth.protect)
- ORM: Drizzle ORM
- DB driver in runtime code: @neondatabase/serverless (PostgreSQL)
- Migrations: drizzle-kit, SQL in medical-ai-platform/drizzle/
- ML service stack: FastAPI, uvicorn, torch/torchvision/timm, OCR libs

Port map:
- Frontend/API: 3000 (confirmed by Next scripts and docs)
- ML service: 8000 (confirmed by env example ML_SERVICE_URL and docs)

## Database Reality

- Status: confirmed
- Authority used: medical-ai-platform/lib/db/schema.ts
- ORM: Drizzle ORM
- Dialect/engine from config: PostgreSQL (drizzle.config.ts dialect=postgresql)
- Runtime DB wiring: Neon serverless HTTP client in lib/db/index.ts
- Migration output folder: medical-ai-platform/drizzle
- Naming convention: snake_case DB names + camelCase TS field names

Important conflict:
- Runtime DB path in code is PostgreSQL via Neon serverless driver.

Full table inventory (from schema.ts):
- users (confirmed)
- doctor_profiles (confirmed)
- scans (confirmed)
- reports (confirmed)
- conversations (confirmed)
- messages (confirmed)
- appointments (confirmed)
- templates (confirmed)
- notifications (confirmed)
- family_members (confirmed)
- follow_ups (confirmed)
- voice_notes (confirmed)
- email_connections (confirmed)
- prescriptions (confirmed)
- medications (confirmed)
- medication_logs (confirmed)
- exercise_routines (confirmed)
- exercise_logs (confirmed)
- api_keys (confirmed)
- hospitals (confirmed)
- departments (confirmed)
- specialties (confirmed)
- hospital_memberships (confirmed)
- patient_hospital_links (confirmed)
- cases (confirmed)
- case_artifacts (confirmed)
- case_assignments (confirmed)
- care_teams (confirmed)
- care_team_members (confirmed)
- hospital_report_templates (confirmed)
- case_reports (confirmed)
- case_report_versions (confirmed)
- report_deliveries (confirmed)
- call_outcomes (confirmed)
- appointment_intents (confirmed)

## API Surface

Source used:
- confirmed runtime API: medical-ai-platform/app/api/**/route.ts

All confirmed routes (method | path | auth | tables touched):
- POST | /api/ai/report | none | templates (confirmed)
- POST | /api/ai/suggest | clerk | unknown (confirmed)
- POST | /api/ai/treatment | none | unknown (confirmed)
- GET | /api/analytics | user | scans,users,appointments,reports,conversations,messages (confirmed)
- GET,POST,PATCH | /api/appointments | user | appointments,notifications (confirmed)
- POST | /api/artifacts/upload | user | caseArtifacts,cases (confirmed)
- POST | /api/call-reminder | none | unknown (confirmed)
- GET,POST | /api/cases/[id]/artifacts | user | caseArtifacts,cases (confirmed)
- GET,POST,PATCH | /api/cases/[id]/assignments | user | caseAssignments,cases,hospitalMemberships,notifications (confirmed)
- GET,POST,PATCH | /api/cases/[id]/reports | user | caseReports,caseReportVersions,caseArtifacts,cases (confirmed)
- GET,PATCH | /api/cases/[id] | user | cases,hospitalMemberships (confirmed)
- GET,POST | /api/cases | user | cases,caseAssignments,hospitalMemberships,notifications,users,patientHospitalLinks (confirmed)
- GET,POST | /api/conversations/[id]/messages | user | messages,conversations,notifications (confirmed)
- GET,POST | /api/conversations | user | conversations,users,messages (confirmed)
- GET | /api/deliveries | user | reportDeliveries,appointmentIntents (confirmed)
- GET,POST,DELETE | /api/developer/keys | user | apiKeys (confirmed)
- POST | /api/doctor/copilot | user | unknown (confirmed)
- GET | /api/doctor/patients/[id] | user | users,scans,reports,appointments (confirmed)
- GET,PUT | /api/doctor/profile | user | doctorProfiles (confirmed)
- GET | /api/doctor/stats | user | scans,users (confirmed)
- PATCH,DELETE | /api/exercises/[id] | user | exerciseRoutines (confirmed)
- POST | /api/exercises/log | user | exerciseLogs (confirmed)
- GET,POST | /api/exercises | user | exerciseRoutines,exerciseLogs (confirmed)
- GET,POST,DELETE | /api/family | user | familyMembers (confirmed)
- GET | /api/hospitals/[id]/patients | user | users,patientHospitalLinks,hospitals (confirmed)
- GET | /api/hospitals | user | hospitals (confirmed)
- GET | /api/integrations/google/callback | none | emailConnections (confirmed)
- POST | /api/integrations/google/disconnect | user | emailConnections (confirmed)
- GET | /api/integrations/google/start | user | unknown (confirmed)
- GET | /api/integrations/google/status | user | emailConnections (confirmed)
- PATCH,DELETE | /api/medications/[id] | user | medications (confirmed)
- POST | /api/medications/log | user | medicationLogs (confirmed)
- GET,POST | /api/medications | user | medications,medicationLogs (confirmed)
- GET,POST,PATCH | /api/memberships | user | hospitalMemberships,hospitals,specialties,users (confirmed)
- POST | /api/ml-proxy | none | unknown (confirmed)
- GET,PATCH | /api/notifications | user | notifications (confirmed)
- POST | /api/ocr | user | unknown (confirmed)
- POST | /api/ocr/save | user | prescriptions,medications (confirmed)
- GET | /api/patients/hospitals | user | patientHospitalLinks (confirmed)
- POST | /api/reports/[id]/notify | user | reports (confirmed)
- GET | /api/reports/[id]/pdf | user | reports (confirmed)
- POST | /api/reports/[id]/release | user | reports,emailConnections (confirmed)
- GET | /api/reports/[id] | user | reports (confirmed)
- GET,POST | /api/reports | user | reports,scans,users,hospitalReportTemplates (confirmed)
- GET,POST | /api/report-templates | user | hospitalReportTemplates (confirmed)
- POST | /api/research | none | unknown (confirmed)
- GET | /api/research/stats | none | unknown (confirmed)
- PATCH,GET | /api/scans/[id] | user | scans (confirmed)
- GET | /api/scans | user | scans (confirmed)
- POST,GET | /api/schedule-followup | none | followUps,users,scans (confirmed)
- POST | /api/transcribe | user | unknown (confirmed)
- POST | /api/twiml-confirm | none | unknown (confirmed)
- POST | /api/twiml-reminder | none | unknown (confirmed)
- POST | /api/upload | user | scans,users,notifications (confirmed)
- GET | /api/users/directory | user | users (confirmed)
- GET | /api/users/me | user | users (confirmed)
- POST | /api/users/onboard | clerk | users (confirmed)
- GET,POST | /api/users/patients | user | users (confirmed)
- POST | /api/users/sync | clerk | users (confirmed)
- POST | /api/voice-notes | none | voiceNotes,scans (confirmed)
- POST | /api/webhooks/twilio/inbound | none | users,appointments,callOutcomes,conversations,messages,notifications,appointmentIntents (confirmed)
- POST | /api/webhooks/twilio/status | none | reportDeliveries (confirmed)

## Authentication

- Status: confirmed

End-to-end auth flow:
- Global middleware applies Clerk auth protection to all non-public routes.
- Public routes include /, sign-in/up, and /api/webhooks/*.
- API handlers typically resolve DB user via helper in lib/api-auth.ts (getAuthUser/getCurrentUser pattern usage in handlers).
- Role checks are enforced in helpers (requireRoles and membership/hospital resolution).
- Some endpoints rely on direct Clerk session checks (tagged as auth=clerk).

Auth classification used in API section:
- clerk: direct Clerk session guard in route
- user: resolves authenticated DB user via auth helper
- none: public/system route (webhooks, twiml, some AI/integration callbacks)

## Frontend Pages

Source used:
- app/**/page.tsx inventory and inline /api/* references

Confirmed page routes with detected API dependencies:
- /(marketing)/page.tsx -> none (confirmed)
- /dashboard/page.tsx -> none (confirmed)
- /doctor/appointments/page.tsx -> none (confirmed)
- /doctor/cases/[id]/page.tsx -> /api/cases/ (partial)
- /doctor/cases/page.tsx -> /api/cases (confirmed)
- /doctor/copilot/page.tsx -> none (confirmed)
- /doctor/deliveries/page.tsx -> /api/deliveries (confirmed)
- /doctor/developer/page.tsx -> /api/developer/keys (confirmed)
- /doctor/messages/page.tsx -> none (confirmed)
- /doctor/page.tsx -> /api/doctor/stats,/api/appointments (confirmed)
- /doctor/patients/[id]/page.tsx -> /api/patients/[id],/api/doctor/patients/ (partial)
- /doctor/patients/page.tsx -> /api/users/patients (confirmed)
- /doctor/prescriptions/page.tsx -> /api/users/patients,/api/medications,/api/exercises,/api/medications/,/api/exercises/ (partial)
- /doctor/profile/page.tsx -> /api/doctor/profile (confirmed)
- /doctor/queue/page.tsx -> /api/scans (confirmed)
- /doctor/reports/[id]/page.tsx -> /api/reports/ (partial)
- /doctor/reports/page.tsx -> none (confirmed)
- /doctor/research/page.tsx -> none (confirmed)
- /doctor/scan/[id]/page.tsx -> /api/scans/,/api/ai/treatment,/api/ai/report,/api/reports,/api/reports/ (partial)
- /doctor/scan/new/page.tsx -> /api/doctor/patients/,/api/upload (partial)
- /doctor/scan/prescriptions/page.tsx -> /api/users/patients,/api/ocr,/api/ocr/save (confirmed)
- /doctor/settings/email/page.tsx -> /api/integrations/google/status,/api/integrations/google/start,/api/integrations/google/disconnect (confirmed)
- /doctor/settings/hospital/page.tsx -> /api/memberships (confirmed)
- /onboarding/page.tsx -> /api/users/sync,/api/users/me,/api/users/onboard (confirmed)
- /pathologist/page.tsx -> /api/hospitals,/api/cases,/api/hospitals/,/api/cases/,/api/artifacts/upload (partial)
- /patient/appointments/page.tsx -> none (confirmed)
- /patient/cases/[id]/page.tsx -> /api/cases/ (partial)
- /patient/cases/page.tsx -> /api/cases (confirmed)
- /patient/exercise/page.tsx -> /api/exercises,/api/exercises/log,/api/exercises/ (confirmed)
- /patient/family/page.tsx -> /api/family (confirmed)
- /patient/medications/page.tsx -> /api/medications,/api/medications/log,/api/medications/ (confirmed)
- /patient/messages/page.tsx -> none (confirmed)
- /patient/page.tsx -> /api/analytics (confirmed)
- /patient/reports/[id]/page.tsx -> /api/reports/ (partial)
- /patient/research/page.tsx -> none (confirmed)
- /patient/scans/[id]/page.tsx -> /api/scans/,/api/reports (partial)
- /patient/scans/page.tsx -> /api/scans (confirmed)
- /patient/upload/page.tsx -> /api/upload (confirmed)
- /patient/upload-prescription/page.tsx -> /api/ocr,/api/ocr/save (confirmed)
- /sign-in/[[...sign-in]]/page.tsx -> none (confirmed)
- /sign-up/[[...sign-up]]/page.tsx -> none (confirmed)

## Active Implementation Plans

- Status: current-codebase-only
- This status document reflects implemented code and runtime wiring only.
- No plan or proposal is used as a source of truth in this file.

## Known Schema Gaps

- Status: partial

Tables in schema with no confirmed current API route table-touch evidence:
- departments (confirmed table, unknown usage in route handlers)
- care_teams (confirmed table, unknown usage in route handlers)
- care_team_members (confirmed table, unknown usage in route handlers)

Likely partially-used bridge/legacy fields (from schema comments and route-level evidence):
- users.specialty, users.hospitalId (partial)
- doctor_profiles.specialty + specialtyId coexistence (partial)
- scans/reports/conversations/appointments bridge columns hospitalId/caseId/sourceArtifactId in multiple entities (partial)

Routes with DB touch currently unknown (usually external integration or proxy heavy):
- /api/ai/suggest, /api/ai/treatment, /api/call-reminder, /api/doctor/copilot
- /api/integrations/google/start, /api/ml-proxy, /api/ocr, /api/research, /api/research/stats
- /api/transcribe, /api/twiml-confirm, /api/twiml-reminder

## Agent Quick-Reference

- Use medical-ai-platform/lib/db/schema.ts as DB truth source; do not trust older docs over code.
- API handlers are implemented in medical-ai-platform/app/api/**/route.ts.
- Auth is Clerk + DB user resolution helpers in lib/api-auth.ts.
- Public API paths mainly include webhook/twiml/integration callback style endpoints.
- There are 35 confirmed DB tables in schema.ts and 62 confirmed API route handlers in app/api.
- Multi-hospital, case workflow, team, report-versioning, and delivery-tracking tables are already present in schema.ts.
- Be careful with docs mentioning SQLite: runtime DB code currently targets PostgreSQL via Neon.
