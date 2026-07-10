import sys
import os
import argparse
import uuid
import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.core.db_connection import execute_query

def main():
    parser = argparse.ArgumentParser(description="Add expense locally")
    parser.add_argument("--amount", type=int, required=True, help="So tien (VND)")
    parser.add_argument("--project", required=True, help="Ten du an")
    parser.add_argument("--category", required=True, help="Loai chi phi")
    parser.add_argument("--vendor", required=True, help="Ten nha cung cap / Nguoi nhan")
    parser.add_argument("--method", required=True, help="Phuong thuc thanh toan")
    parser.add_argument("--note", default="", help="Ghi chu / Mo ta")
    parser.add_argument("--date", default=None, help="Ngay (YYYY-MM-DD), mac dinh la hom nay")

    args = parser.parse_args()

    date_str = args.date if args.date else datetime.datetime.now().strftime('%Y-%m-%d')
    
    # Lookup projectId
    project_id = None
    projects_data = execute_query("SELECT id, name FROM projects WHERE name ILIKE %s", params=(f"%{args.project}%",), fetch=True)
    if projects_data:
        project_id = projects_data[0]['id']
        actual_project_name = projects_data[0]['name']
    else:
        print(f"Warning: Khong tim thay du an '{args.project}' trong database. Van luu voi ID = Null.")
        actual_project_name = args.project

    import hashlib
    uid_str = f"{date_str}_{args.vendor}_{args.amount}".encode('utf-8')
    eid = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]

    query = """
        INSERT INTO expenseTransactions
        (id, date, vendor, amount, project, projectId, category, paymentMethod, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    params = (eid, date_str, args.vendor, args.amount, actual_project_name, project_id, args.category, args.method, args.note)
    
    if execute_query(query, params, fetch=False):
        print(f"THANH CONG: Da luu chi phi {args.amount:,} VND cho '{actual_project_name}'.")
        # Auto-learn payee
        payee_query = """
            INSERT INTO payees (vendor, default_category, default_project, default_method)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (vendor) DO UPDATE SET 
                default_category = EXCLUDED.default_category,
                default_project = EXCLUDED.default_project,
                default_method = EXCLUDED.default_method
        """
        execute_query(payee_query, (args.vendor, args.category, actual_project_name, args.method), fetch=False)
    else:
        print("LOI: Khong the luu chi phi vao database.")

if __name__ == "__main__":
    main()
