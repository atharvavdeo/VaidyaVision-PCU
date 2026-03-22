import json
from collections import Counter
from pathlib import Path

ROOT = Path(r'c:/College/Hackathons/Ideathon_3_Pune/PCU/VaidyaVision-PCU')
data = json.loads((ROOT / 'REFACTOR_REPORT_DATA.json').read_text(encoding='utf-8'))

for surface in ('frontend','backend'):
    arr = data[surface]
    c = Counter(str(x['status']) for x in arr)
    print(surface, 'count', len(arr), 'status_counts', dict(sorted(c.items())))
    print('sample_failures')
    n=0
    for x in arr:
        s = x['status']
        ok = isinstance(s,int) and 200 <= s < 300
        if not ok:
            print(s, x['method'], x['endpoint'], '::', x['body'][:120])
            n += 1
        if n >= 20:
            break
    print('---')
