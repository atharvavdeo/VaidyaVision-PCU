# REFACTOR REPORT

Generated: 2026-03-21 21:44:58

## Scope And Method
- Audited all detected frontend Next API route handlers under frontend/app/api/**/route.ts (78 endpoint-method combinations).
- Audited all detected backend FastAPI router handlers under backend/routers/*.py (20 endpoint-method combinations).
- Ran live HTTP smoke tests against running services: frontend on :3000, ML on :8000, backend API on :8001.
- For dynamic routes, sample IDs were auto-filled from backend/data/vaidyavision_full.db.

## Service Health
- Frontend root http://127.0.0.1:3000 -> 200
- Backend health http://127.0.0.1:8001/health -> 404, body: Not found
- ML service port 8000 was reachable during restart checks.

## Frontend API Audit Summary
- Total tested: 78
- Status distribution: {404: 78}

### Frontend Interpretation
- All CLI calls returned 404 HTML responses due auth protection behavior at middleware/Clerk boundary (no authenticated browser session/cookies in terminal test context).
- This does NOT prove the routes are missing; in-browser logs already showed authenticated 200 responses for critical dashboard routes: /api/doctor/stats, /api/appointments, /api/notifications.
- Classification: frontend auth/session-context issue for terminal-based smoke tests, not an API wiring break.

### Frontend Endpoint Results (All Tested)
| Method | Endpoint | Status | Classification | Error/Response Snippet |
|---|---|---:|---|---|
| POST | /api/ai/report | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/ai/suggest | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/ai/treatment | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/analytics | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/appointments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/appointments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/appointments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/artifacts/upload | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/call-reminder | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/cases | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/cases | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/cases/20 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/cases/20 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/cases/20/artifacts | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/cases/20/artifacts | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/cases/20/assignments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/cases/20/assignments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/cases/20/assignments | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/cases/20/reports | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/cases/20/reports | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/cases/20/reports | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/conversations | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/conversations | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/conversations/3/messages | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/conversations/3/messages | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| DELETE | /api/developer/keys | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/developer/keys | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/developer/keys | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/doctor/patients/7 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/doctor/profile | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PUT | /api/doctor/profile | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/doctor/stats | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/exercises | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/exercises | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| DELETE | /api/exercises/1 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/exercises/1 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/exercises/log | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| DELETE | /api/family | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/family | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/family | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/hospitals | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/hospitals/50/patients | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/medications | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/medications | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| DELETE | /api/medications/1 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/medications/1 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/medications/log | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/memberships | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/memberships | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/memberships | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/ml-proxy | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/notifications | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/notifications | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/ocr | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/ocr/save | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/patients/hospitals | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/report-templates | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/report-templates | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/reports | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/reports | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/reports/10 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/research | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/research/stats | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/scans | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/scans/20 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| PATCH | /api/scans/20 | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/schedule-followup | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/schedule-followup | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/send-report-email | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/twiml-confirm | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/twiml-reminder | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/upload | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/users/me | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/users/onboard | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| GET | /api/users/patients | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/users/patients | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/users/sync | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |
| POST | /api/voice-notes | 404 | Frontend auth/session protected (CLI unauth) | <!DOCTYPE html><html lang="en" class="scroll-smooth"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/css/app/layout.css?v=17741 |

## Backend API Audit Summary
- Total tested: 20
- Status distribution: {500: 20}

### Backend Interpretation
- All router endpoints under backend/routers returned 500.
- Root cause from server traceback: dependency function get_db is implemented with @contextmanager and yields a _GeneratorContextManager object that FastAPI cannot consume as a dependency iterator in this setup.
- Observed errors include: TypeError: '_GeneratorContextManager' object is not an iterator and AttributeError: '_GeneratorContextManager' object has no attribute 'throw'.
- Classification: backend runtime bug (dependency implementation), not frontend connection issue.

### Backend Endpoint Results (All Tested)
| Method | Endpoint | Status | Classification | Error/Response Snippet |
|---|---|---:|---|---|
| POST | /artifacts/upload | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /cases | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| POST | /cases | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /cases/20 | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| PATCH | /cases/20 | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /cases/20/artifacts | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /cases/20/assignments | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| PATCH | /cases/20/assignments | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| POST | /cases/20/assignments | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /cases/20/reports | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| PATCH | /cases/20/reports | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| POST | /cases/20/reports | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /hospitals | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /hospitals/50/patients | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /memberships | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| PATCH | /memberships | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| POST | /memberships | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /patients/hospitals | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| GET | /report-templates | 500 | Backend bug (dependency/runtime) | Internal Server Error |
| POST | /report-templates | 500 | Backend bug (dependency/runtime) | Internal Server Error |

## Functional Areas Status
| Functionality | Status | Evidence | Broken Layer |
|---|---|---|---|
| Doctor dashboard data (frontend app) | Partially Working | Live dev logs showed repeated 200 for /api/doctor/stats, /api/appointments, /api/notifications | Frontend+Next API path is working with authenticated session |
| Frontend API smoke from terminal | Blocked by auth context | 78/78 returned auth-protected 404 HTML in CLI test mode | Frontend auth/session test-context limitation |
| Backend split API routes (:8001) | Not Working | 20/20 returned 500 with get_db dependency traceback | Backend |
| ML inference service (:8000) | Working | Service process started and loaded experts successfully | Backend (ML) working |

## Priority Issues To Fix
1. Backend critical: fix backend/core/database.py dependency contract for FastAPI (remove @contextmanager wrapper pattern and expose a plain generator dependency).
2. Backend regression testing: rerun backend router tests after dependency fix; expected mix of 2xx/4xx/422 instead of blanket 500.
3. Frontend endpoint verification with auth: run browser-session or token-aware API tests to validate all protected routes beyond dashboard trio.
4. Keep port ownership explicit: ML on 8000 and backend API on 8001 (or move one service) to avoid collisions.

## Raw Data Artifact
- Detailed raw JSON output saved at REFACTOR_REPORT_DATA.json