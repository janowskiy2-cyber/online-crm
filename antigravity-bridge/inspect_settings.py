import sqlite3
import json

db_path = r'C:\Users\555\AppData\Roaming\Antigravity\User\globalStorage\state.vscdb'
con = sqlite3.connect(db_path)
cur = con.cursor()
rows = cur.execute("SELECT key, value FROM ItemTable").fetchall()

print(f"Total keys: {len(rows)}")
for k, v in rows:
    if any(x in k.lower() for x in ['policy', 'terminal', 'planning', 'review', 'auto', 'agent', 'confirm', 'sandbox', 'permission']):
        print(f"KEY: {k} ==> {str(v)[:160]}")
con.close()
