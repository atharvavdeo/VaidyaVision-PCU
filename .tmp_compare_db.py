import sqlite3
src=r"C:/College/Hackathons/Ideathon_3_Pune/PCU/VaidyaVision-PCU/medical-ai-platform/data/vaidyavision.db"
dst=r"C:/College/Hackathons/Ideathon_3_Pune/PCU/VaidyaVision-PCU/backend/data/vaidyavision.db"

s=sqlite3.connect(src)
d=sqlite3.connect(dst)

st={r[0] for r in s.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
dt={r[0] for r in d.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
print('ONLY_IN_SRC', sorted(st-dt))
print('ONLY_IN_DST', sorted(dt-st))
