import sys
sys.path.append('E:\\.agents\\Cloud\\shared\\core')
from db_connection import execute_query

query = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projectdocuments';
"""
cols = execute_query(query, fetch=True)
if cols is not None:
    for c in cols:
        print(c['column_name'], c['data_type'])
else:
    print('failed')
