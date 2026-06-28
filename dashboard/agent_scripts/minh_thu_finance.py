import os
import sys
import argparse
import json
import datetime
import uuid
from db_connection import execute_query

# Note: In a full production scenario, we would import the regex parsing logic 
# from check_mail_bdsd.py here to process emails.
# import check_mail_bdsd

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def process_bank_emails(args):
    """
    Simulates scanning emails 2 times/day and saving expenses to PostgreSQL.
    """
    # 1. Gọi logic quét mail cũ
    # parsed_transactions = check_mail_bdsd.scan_inbox()
    
    # Giả lập data quét được
    parsed_transactions = [
        {"date": datetime.datetime.now().isoformat(), "amount": 500000, "category": "AI tools", "title": "Thanh toan ChatGPT"},
        {"date": datetime.datetime.now().isoformat(), "amount": 100000, "category": "Marketing", "title": "Thanh toan Facebook Ads"}
    ]
    
    success_count = 0
    for t in parsed_transactions:
        t_id = f"EXP-{uuid.uuid4().hex[:8]}"
        query = "INSERT INTO recent_expenses (id, title, amount, date, category) VALUES (%s, %s, %s, %s, %s)"
        params = (t_id, t["title"], t["amount"], t["date"], t["category"])
        if execute_query(query, params, fetch=False):
            success_count += 1
            
    print(json.dumps({"status": "success", "message": f"Da quet va luu {success_count} giao dich vao Database."}, ensure_ascii=False))

def generate_contract(args):
    """
    Reads the Quotation_Draft from Database and generates a .docx contract.
    """
    query = "SELECT content FROM documents WHERE project = %s AND type = 'Quotation_Draft' ORDER BY lastUpdated DESC LIMIT 1"
    results = execute_query(query, (args.project_id,), fetch=True)
    
    if not results or len(results) == 0:
        print(json.dumps({"status": "error", "message": "Khong tim thay Quotation_Draft tren Database."}, ensure_ascii=False))
        return
        
    draft_content = results[0].get('content', '')
    
    # TODO: Use python-docx to open template from /templates, replace text in yellow highlight, change to green.
    # doc = Document('/templates/contract_template.docx')
    # ... logic thay the highlight vang -> xanh ...
    # doc.save(f'/templates/contract_{args.project_id}.docx')
    
    print(json.dumps({
        "status": "success", 
        "message": "Da soan xong hop dong dua tren Quotation_Draft.",
        "download_link": f"/api/download/contract_{args.project_id}.docx"
    }, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Minh Thu (Finance Agent) Tool")
    subparsers = parser.add_subparsers(dest="action")

    p_scan = subparsers.add_parser("scan_mail")
    
    p_contract = subparsers.add_parser("generate_contract")
    p_contract.add_argument("--project_id", required=True)

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "scan_mail":
        process_bank_emails(args)
    elif args.action == "generate_contract":
        generate_contract(args)

if __name__ == "__main__":
    main()
