import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def fix_documents():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Reverting projectDocuments table...")
            cur.execute("""
                ALTER TABLE projectDocuments 
                DROP COLUMN IF EXISTS quote_link,
                DROP COLUMN IF EXISTS contract_link,
                DROP COLUMN IF EXISTS liquidation_link,
                DROP COLUMN IF EXISTS folder_link,
                ADD COLUMN IF NOT EXISTS quote BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS contract BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS vatR1 BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS vatR2 BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS vatR3 BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS liquidation BOOLEAN DEFAULT FALSE
            """)
            
            print("Altering documents table to add file_link...")
            cur.execute("""
                ALTER TABLE documents 
                ADD COLUMN IF NOT EXISTS file_link TEXT
            """)
            
            conn.commit()
            print("Tables altered successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_documents()
