import re, json, sqlite3
from pathlib import Path
import requests

ROOT = Path(r'c:/College/Hackathons/Ideathon_3_Pune/PCU/VaidyaVision-PCU')
FRONTEND_API_DIR = ROOT / 'frontend' / 'app' / 'api'
DB = ROOT / 'backend' / 'data' / 'vaidyavision_full.db'

con = sqlite3.connect(DB)
cur = con.cursor()

def q1(sql, default=1):
    try:
        row = cur.execute(sql).fetchone()
    except Exception:
        return default
    return row[0] if row and row[0] is not None else default

def qs(sql, default=''):
    try:
        row = cur.execute(sql).fetchone()
    except Exception:
        return default
    return row[0] if row and row[0] is not None else default

samples = {
    'id': 1,
    'scan_id': q1('select id from scans order by id desc limit 1', 1),
    'case_id': q1('select id from cases order by id desc limit 1', 1),
    'report_id': q1('select id from reports order by id desc limit 1', 1),
    'conversation_id': q1('select id from conversations order by id desc limit 1', 1),
    'hospital_id': q1('select id from hospitals order by id desc limit 1', 1),
    'patient_id': q1("select id from users where role='patient' order by id desc limit 1", 1),
    'doctor_id': q1("select id from users where role='doctor' order by id desc limit 1", 1),
    'artifact_id': q1('select id from artifacts order by id desc limit 1', 1),
}

doctor_clerk = qs("select clerk_id from users where role='doctor' limit 1", 'dev_clerk_user')

frontend_results = []
for p in FRONTEND_API_DIR.rglob('route.ts'):
    rel = p.relative_to(FRONTEND_API_DIR).as_posix()
    text = p.read_text(encoding='utf-8', errors='ignore')
    methods = sorted(set(re.findall(r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)', text)))
    if not methods:
        continue

    endpoint = '/api/' + rel.replace('/route.ts','')

    def repl(seg: str) -> str:
        if seg == '[id]':
            low = endpoint.lower()
            if '/scans/' in low: return str(samples['scan_id'])
            if '/cases/' in low: return str(samples['case_id'])
            if '/reports/' in low: return str(samples['report_id'])
            if '/conversations/' in low: return str(samples['conversation_id'])
            if '/hospitals/' in low: return str(samples['hospital_id'])
            if '/patients/' in low: return str(samples['patient_id'])
            if '/artifacts/' in low: return str(samples['artifact_id'])
            return '1'
        m = re.match(r'\[(.+)\]', seg)
        if not m:
            return seg
        name = m.group(1).lower()
        if 'hospital' in name: return str(samples['hospital_id'])
        if 'patient' in name: return str(samples['patient_id'])
        if 'doctor' in name: return str(samples['doctor_id'])
        if 'scan' in name: return str(samples['scan_id'])
        if 'case' in name: return str(samples['case_id'])
        if 'report' in name: return str(samples['report_id'])
        return '1'

    resolved = '/'.join(repl(s) for s in endpoint.split('/'))

    for method in methods:
        item = {'surface':'frontend','file':rel,'method':method,'endpoint':resolved,'status':None,'body':''}
        try:
            kwargs = {'timeout':12}
            if method in {'POST','PUT','PATCH','DELETE'}:
                kwargs['json'] = {}
            r = requests.request(method, f'http://127.0.0.1:3000{resolved}', **kwargs)
            item['status'] = r.status_code
            item['body'] = (r.text or '')[:220].replace('\n',' ')
        except Exception as e:
            item['status'] = 'ERROR'
            item['body'] = str(e)[:220]
        frontend_results.append(item)

backend_results = []
for f in (ROOT / 'backend' / 'routers').glob('*.py'):
    if f.name == '__init__.py':
        continue
    text = f.read_text(encoding='utf-8', errors='ignore')
    pm = re.search(r'APIRouter\(prefix="([^"]*)"', text)
    prefix = pm.group(1) if pm else ''
    for m in re.finditer(r'@router\.(get|post|put|patch|delete)\("([^"]*)"', text):
        method = m.group(1).upper()
        route = m.group(2)
        ep = (prefix + route) or '/'
        ep = ep.replace('{case_id}', str(samples['case_id'])).replace('{hospital_id}', str(samples['hospital_id'])).replace('{id}', '1')
        item = {'surface':'backend','file':f.name,'method':method,'endpoint':ep,'status':None,'body':''}
        try:
            kwargs = {'timeout':12, 'headers': {'Authorization': 'Bearer ' + doctor_clerk}}
            if method in {'POST','PUT','PATCH','DELETE'}:
                kwargs['json'] = {}
            r = requests.request(method, f'http://127.0.0.1:8001{ep}', **kwargs)
            item['status'] = r.status_code
            item['body'] = (r.text or '')[:220].replace('\n',' ')
        except Exception as e:
            item['status'] = 'ERROR'
            item['body'] = str(e)[:220]
        backend_results.append(item)

out = ROOT / 'REFACTOR_REPORT_DATA.json'
out.write_text(json.dumps({'samples': samples, 'frontend': frontend_results, 'backend': backend_results}, indent=2), encoding='utf-8')
print('written', out)
print('frontend_tests', len(frontend_results))
print('backend_tests', len(backend_results))
