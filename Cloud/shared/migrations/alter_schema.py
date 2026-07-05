import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def alter_schema():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Creating clients table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    tax_id VARCHAR(50),
                    address TEXT,
                    rep_name VARCHAR(100),
                    rep_role VARCHAR(100),
                    payment_habits TEXT,
                    notes TEXT
                )
            """)

            print("Altering projects table to add client and contract columns...")
            columns_to_add = [
                ("client_id", "VARCHAR(255)"),
                ("phase1_percent", "INT DEFAULT 0"),
                ("phase1_amount", "BIGINT DEFAULT 0"),
                ("phase2_percent", "INT DEFAULT 0"),
                ("phase2_amount", "BIGINT DEFAULT 0"),
                ("phase3_percent", "INT DEFAULT 0"),
                ("phase3_amount", "BIGINT DEFAULT 0"),
                ("contract_notes", "TEXT")
            ]
            
            for col_name, col_type in columns_to_add:
                try:
                    cur.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
                    print(f"Added column {col_name}")
                except Exception as e:
                    # Column might already exist
                    conn.rollback()
                    print(f"Column {col_name} might already exist: {e}")

            print("Adding foreign key constraints if not exist...")
            try:
                cur.execute("""
                    ALTER TABLE projects 
                    ADD CONSTRAINT fk_projects_client 
                    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
                """)
                print("Added foreign key projects -> clients")
            except Exception as e:
                conn.rollback()
                print(f"Foreign key fk_projects_client might already exist: {e}")

            # Also ensure incomes and expensetransactions have proper foreign keys.
            # We already have foreign keys on projectId in init_schema.py, so they should be intact.
            
            conn.commit()
            print("Schema altered successfully!")
    except Exception as e:
        print(f"Error altering schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    alter_schema()
