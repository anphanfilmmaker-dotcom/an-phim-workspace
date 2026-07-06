import sys
sys.path.append('E:\\.agents\\Cloud\\shared\\core')
from db_connection import execute_query

create_table_query = """
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    project VARCHAR(255),
    type VARCHAR(100),
    status VARCHAR(50),
    owner VARCHAR(100),
    lastUpdated VARCHAR(100),
    fileSize VARCHAR(50),
    content TEXT
);
"""

success = execute_query(create_table_query, fetch=False)
if success:
    print("Table 'documents' created successfully.")
else:
    print("Failed to create table.")
