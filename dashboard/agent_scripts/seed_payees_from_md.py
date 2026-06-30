import sys
import os
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def parse_and_seed_payees():
    file_path = 'g:/My Drive/[ANPHIM] MASTER PLANN/.agents/rules/payees.md'
    if not os.path.exists(file_path):
        print("payees.md not found!")
        return

    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            # Clean up the old junk data from previous naive import
            print("Cleaning up old payees...")
            cur.execute("TRUNCATE TABLE payees CASCADE")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            in_table = False
            inserted = 0
            for line in lines:
                line = line.strip()
                if line.startswith('| Payee |'):
                    in_table = True
                    continue
                if in_table and line.startswith('| :---'):
                    continue
                if in_table and line.startswith('|'):
                    parts = [p.strip() for p in line.split('|')[1:-1]]
                    if len(parts) >= 5:
                        vendor = parts[0]
                        alias = parts[1]
                        category = parts[2]
                        project = parts[3]
                        method = parts[4]
                        
                        # Generate simple ID based on iteration
                        inserted += 1
                        
                        cur.execute("""
                            INSERT INTO payees (id, vendor, alias, default_category, default_project, default_method)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (inserted, vendor, alias, category, project, method))
            
            conn.commit()
            print(f"Successfully seeded {inserted} payees from Markdown with Alias/Keywords!")
    except Exception as e:
        print(f"Error updating database: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    parse_and_seed_payees()
