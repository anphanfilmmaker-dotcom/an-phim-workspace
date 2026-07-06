import sys
sys.path.append('E:\\.agents\\Cloud\\shared\\core')
from db_connection import execute_query

query = """
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema='public'
   AND table_type='BASE TABLE';
"""
tables = execute_query(query, fetch=True)
if tables is not None:
    for t in tables:
        print(t['table_name'])
else:
    print('Failed to get tables')
