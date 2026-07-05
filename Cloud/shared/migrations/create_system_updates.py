import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.db_connection import execute_query

def migrate():
    query = """
    CREATE TABLE IF NOT EXISTS system_updates (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        agent VARCHAR(100),
        content TEXT
    );
    """
    if execute_query(query, fetch=False):
        print("Bảng system_updates đã được tạo thành công.")
    else:
        print("Lỗi tạo bảng system_updates.")

if __name__ == "__main__":
    migrate()
