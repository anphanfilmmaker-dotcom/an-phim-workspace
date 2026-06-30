import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def recreate_documents():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Recreating documents table...")
            cur.execute("""
                DROP TABLE IF EXISTS documents CASCADE;
                CREATE TABLE documents (
                    id VARCHAR(255) PRIMARY KEY,
                    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
                    doc_type VARCHAR(50),
                    summary TEXT,
                    file_link TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            conn.commit()
            print("Table documents recreated successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    recreate_documents()
