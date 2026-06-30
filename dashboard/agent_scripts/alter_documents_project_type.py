import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def alter_documents_project_type():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Altering documents table to add project_type...")
            cur.execute("""
                ALTER TABLE documents
                ADD COLUMN IF NOT EXISTS project_type VARCHAR(50)
            """)
            
            conn.commit()
            print("Table documents altered successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    alter_documents_project_type()
