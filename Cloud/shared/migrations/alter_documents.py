import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def alter_documents():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Altering projectDocuments table...")
            cur.execute("""
                ALTER TABLE projectDocuments 
                DROP COLUMN IF EXISTS quote,
                DROP COLUMN IF EXISTS contract,
                DROP COLUMN IF EXISTS vatR1,
                DROP COLUMN IF EXISTS vatR2,
                DROP COLUMN IF EXISTS vatR3,
                DROP COLUMN IF EXISTS liquidation,
                ADD COLUMN IF NOT EXISTS quote_link TEXT,
                ADD COLUMN IF NOT EXISTS contract_link TEXT,
                ADD COLUMN IF NOT EXISTS liquidation_link TEXT,
                ADD COLUMN IF NOT EXISTS folder_link TEXT
            """)
            
            conn.commit()
            print("Table projectDocuments altered successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    alter_documents()
