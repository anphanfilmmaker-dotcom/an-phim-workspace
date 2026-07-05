import os
import sys
import argparse
import json
import datetime
import uuid
from db_connection import execute_query

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def check_quotation_exists(args):
    """
    Checks if a quotation exists for a given project in the DB.
    """
    query = "SELECT * FROM documents WHERE project = %s AND type = 'Quotation_Draft'"
    results = execute_query(query, (args.project_id,), fetch=True)
    
    if results and len(results) > 0:
        print(json.dumps({"status": "exists", "message": "Bao gia (Draft) da ton tai cho du an nay.", "data": results[0]}, ensure_ascii=False, default=str))
    else:
        print(json.dumps({"status": "not_found", "message": "Chua co bao gia. Co the tao moi."}, ensure_ascii=False))

def calculate_pricing(args):
    """
    Mock calculation logic for G1-G5 based on survey data.
    In real usage, Quoc Bao will pass complex params. Here we parse a simple JSON string.
    """
    try:
        survey_data = json.loads(args.survey_data)
        # Barem logic example
        total = 0
        if survey_data.get('type') == 'G1':
            total = 2000000 + 1500000 + (survey_data.get('images', 0) * 300000)
        elif survey_data.get('type') == 'G2':
            total = 10000000 + 5000000 + 10000000
            if survey_data.get('urgent'):
                total *= 1.10
                
        print(json.dumps({"status": "success", "total_vnd": total, "message": "Tinh toan chi phi thanh cong"}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))

def save_quotation_draft(args):
    """
    Saves the agreed quotation draft to the DB 'documents' table as a Virtual Hard Drive.
    """
    doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now().isoformat()
    
    query = """
        INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, fileSize)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET lastUpdated = EXCLUDED.lastUpdated
    """
    
    # Store the content inside 'fileSize' column temporarily or we should alter DB to add 'content'
    # Wait, the DB schema for documents: id, name, project, type, status, owner, lastUpdated, fileSize, isUrgent, urgentReason, priorityLevel
    # We will need to ALTER TABLE documents ADD COLUMN content TEXT; in the real system.
    # For now, let's just assume we add it. I will output a hint to alter the DB later.
    
    # To be safe, we will just print what we would do if 'content' isn't there, 
    # but actually we can just pass the draft text to a new column 'content'
    query_alter = "ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;"
    execute_query(query_alter, fetch=False)
    
    query_insert = """
        INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, content)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        doc_id, f"Quotation_Draft_{args.project_id}", args.project_id, 
        "Quotation_Draft", "Draft", "Quoc Bao", now, args.draft_content
    )
    
    success = execute_query(query_insert, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": "Da luu ban nhap bao gia vao Database thanh cong. San sang cho Minh Thu soan hop dong."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi ghi Database."}, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Quoc Bao (Sales Agent) Tool")
    subparsers = parser.add_subparsers(dest="action")

    p_check = subparsers.add_parser("check_quotation")
    p_check.add_argument("--project_id", required=True)

    p_calc = subparsers.add_parser("calculate_pricing")
    p_calc.add_argument("--survey_data", required=True, help="JSON string of survey")

    p_save = subparsers.add_parser("save_draft")
    p_save.add_argument("--project_id", required=True)
    p_save.add_argument("--draft_content", required=True, help="Text content of the quotation draft")

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "check_quotation":
        check_quotation_exists(args)
    elif args.action == "calculate_pricing":
        calculate_pricing(args)
    elif args.action == "save_draft":
        save_quotation_draft(args)

if __name__ == "__main__":
    main()
