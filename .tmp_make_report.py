import json
from pathlib import Path
from datetime import datetime

ROOT = Path(r'c:/College/Hackathons/Ideathon_3_Pune/PCU/VaidyaVision-PCU')
data = json.loads((ROOT / 'REFACTOR_REPORT_DATA.json').read_text(encoding='utf-8'))
frontend = data['frontend']
backend = data['backend']

# Add explicit health checks
import requests
health_backend = {'endpoint':'http://127.0.0.1:8001/health','status':'ERROR','body':''}
health_front = {'endpoint':'http://127.0.0.1:3000','status':'ERROR','body':''}
for target, obj in [('http://127.0.0.1:8001/health', health_backend), ('http://127.0.0.1:3000', health_front)]:
    try:
        r = requests.get(target, timeout=8)
        obj['status'] = r.status_code
        obj['body'] = (r.text or '')[:220].replace('\n',' ')
    except Exception as e:
        obj['body'] = str(e)

now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

lines = []
lines.append('# REFACTOR REPORT')
lines.append('')
lines.append(f'Generated: {now}')
lines.append('')
lines.append('## Scope And Method')
lines.append('- Audited all detected frontend Next API route handlers under frontend/app/api/**/route.ts (78 endpoint-method combinations).')
lines.append('- Audited all detected backend FastAPI router handlers under backend/routers/*.py (20 endpoint-method combinations).')
lines.append('- Ran live HTTP smoke tests against running services: frontend on :3000, ML on :8000, backend API on :8001.')
lines.append('- For dynamic routes, sample IDs were auto-filled from backend/data/vaidyavision_full.db.')
lines.append('')
lines.append('## Service Health')
lines.append(f"- Frontend root http://127.0.0.1:3000 -> {health_front['status']}")
lines.append(f"- Backend health http://127.0.0.1:8001/health -> {health_backend['status']}, body: {health_backend['body']}")
lines.append('- ML service port 8000 was reachable during restart checks.')
lines.append('')

f_status = {}
for r in frontend:
    f_status[r['status']] = f_status.get(r['status'], 0) + 1
b_status = {}
for r in backend:
    b_status[r['status']] = b_status.get(r['status'], 0) + 1

lines.append('## Frontend API Audit Summary')
lines.append(f"- Total tested: {len(frontend)}")
lines.append(f"- Status distribution: {f_status}")
lines.append('')
lines.append('### Frontend Interpretation')
lines.append('- All CLI calls returned 404 HTML responses due auth protection behavior at middleware/Clerk boundary (no authenticated browser session/cookies in terminal test context).')
lines.append('- This does NOT prove the routes are missing; in-browser logs already showed authenticated 200 responses for critical dashboard routes: /api/doctor/stats, /api/appointments, /api/notifications.')
lines.append('- Classification: frontend auth/session-context issue for terminal-based smoke tests, not an API wiring break.')
lines.append('')

lines.append('### Frontend Endpoint Results (All Tested)')
lines.append('| Method | Endpoint | Status | Classification | Error/Response Snippet |')
lines.append('|---|---|---:|---|---|')
for r in sorted(frontend, key=lambda x: (x['endpoint'], x['method'])):
    status = r['status']
    if status == 404:
        cls = 'Frontend auth/session protected (CLI unauth)'
    elif isinstance(status, int) and 200 <= status < 300:
        cls = 'Working'
    elif status == 'ERROR':
        cls = 'Test execution/network issue'
    else:
        cls = 'Needs investigation'
    body = (r.get('body') or '').replace('|','/')
    lines.append(f"| {r['method']} | {r['endpoint']} | {status} | {cls} | {body} |")

lines.append('')
lines.append('## Backend API Audit Summary')
lines.append(f"- Total tested: {len(backend)}")
lines.append(f"- Status distribution: {b_status}")
lines.append('')
lines.append('### Backend Interpretation')
lines.append('- All router endpoints under backend/routers returned 500.')
lines.append('- Root cause from server traceback: dependency function get_db is implemented with @contextmanager and yields a _GeneratorContextManager object that FastAPI cannot consume as a dependency iterator in this setup.')
lines.append("- Observed errors include: TypeError: '_GeneratorContextManager' object is not an iterator and AttributeError: '_GeneratorContextManager' object has no attribute 'throw'.")
lines.append('- Classification: backend runtime bug (dependency implementation), not frontend connection issue.')
lines.append('')

lines.append('### Backend Endpoint Results (All Tested)')
lines.append('| Method | Endpoint | Status | Classification | Error/Response Snippet |')
lines.append('|---|---|---:|---|---|')
for r in sorted(backend, key=lambda x: (x['endpoint'], x['method'])):
    status = r['status']
    if status == 500:
        cls = 'Backend bug (dependency/runtime)'
    elif isinstance(status, int) and 200 <= status < 300:
        cls = 'Working'
    elif status == 422:
        cls = 'Reachable; payload validation failure'
    elif status == 'ERROR':
        cls = 'Test execution/network issue'
    else:
        cls = 'Needs investigation'
    body = (r.get('body') or '').replace('|','/')
    lines.append(f"| {r['method']} | {r['endpoint']} | {status} | {cls} | {body} |")

lines.append('')
lines.append('## Functional Areas Status')
lines.append('| Functionality | Status | Evidence | Broken Layer |')
lines.append('|---|---|---|---|')
lines.append('| Doctor dashboard data (frontend app) | Partially Working | Live dev logs showed repeated 200 for /api/doctor/stats, /api/appointments, /api/notifications | Frontend+Next API path is working with authenticated session |')
lines.append('| Frontend API smoke from terminal | Blocked by auth context | 78/78 returned auth-protected 404 HTML in CLI test mode | Frontend auth/session test-context limitation |')
lines.append('| Backend split API routes (:8001) | Not Working | 20/20 returned 500 with get_db dependency traceback | Backend |')
lines.append('| ML inference service (:8000) | Working | Service process started and loaded experts successfully | Backend (ML) working |')
lines.append('')

lines.append('## Priority Issues To Fix')
lines.append('1. Backend critical: fix backend/core/database.py dependency contract for FastAPI (remove @contextmanager wrapper pattern and expose a plain generator dependency).')
lines.append('2. Backend regression testing: rerun backend router tests after dependency fix; expected mix of 2xx/4xx/422 instead of blanket 500.')
lines.append('3. Frontend endpoint verification with auth: run browser-session or token-aware API tests to validate all protected routes beyond dashboard trio.')
lines.append('4. Keep port ownership explicit: ML on 8000 and backend API on 8001 (or move one service) to avoid collisions.')
lines.append('')

lines.append('## Raw Data Artifact')
lines.append('- Detailed raw JSON output saved at REFACTOR_REPORT_DATA.json')

(ROOT / 'REFACTOR_REPORT.md').write_text('\n'.join(lines), encoding='utf-8')
print('written', ROOT / 'REFACTOR_REPORT.md')
