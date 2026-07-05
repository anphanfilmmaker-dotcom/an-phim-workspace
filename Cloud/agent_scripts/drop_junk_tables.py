import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def drop_junk_tables():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Dropping junk tables...")
            cur.execute("""
                DROP TABLE IF EXISTS cash_flow CASCADE;
                DROP TABLE IF EXISTS expenses CASCADE;
                DROP TABLE IF EXISTS alerts CASCADE;
                DROP TABLE IF EXISTS stats CASCADE;
                DROP TABLE IF EXISTS recent_expenses CASCADE;
            """)
            
            conn.commit()
            print("Junk tables dropped successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    drop_junk_tables()
