import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.db_connection import execute_query

def migrate():
    query = """
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_emails JSONB;
    """
    if execute_query(query, fetch=False):
        print("Đã thêm cột contact_emails (JSONB) vào bảng clients.")
    else:
        print("Lỗi thêm cột contact_emails.")

if __name__ == "__main__":
    migrate()
