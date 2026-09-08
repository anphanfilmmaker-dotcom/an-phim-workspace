import os
import sys
import argparse
import json
import datetime
import uuid
import hashlib
import re

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# CƠ CHẾ BẢO VỆ: Ngăn chặn Agent vô tình chạy script bản Cloud trong môi trường Local/IDE
if ('VSCODE_IPC_HOOK_CLI' in os.environ or 'ANTIGRAVITY_AGENT' in os.environ) and os.environ.get('BYPASS_AGENT_BLOCK') != '1':
    print("\n[!] LỖI VI PHẠM RULE HỆ THỐNG: KIẾN TRÚC SCRIPT (PC vs CLOUD)")
    print("Agent đang cố gắng chạy script bản Cloud (_cloud.py) trong môi trường Local/PC.")
    print("YÊU CẦU: Hãy sử dụng bản _local.py hoặc tự dùng LLM để xử lý logic thay vì gọi script này!")
    sys.exit(1)

from dotenv import load_dotenv

sys.path.append(r"E:\.agents\Cloud\shared\core")
from db_connection import execute_query
sys.path.append(r'E:\.agents\Cloud\shared')
from finance_utils import extract_raw_transaction, apply_gmail_label, get_active_projects, get_all_projects, normalize_text, get_payees, classify_expense_smart_rules
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

ENV_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\01_MARKETING\AN PHIM_Fanpage\.env"

def ai_deduce_expense(vendor, amount, note, active_projects):
    """Uses Gemini API to deduce project and category based on context."""
    if not os.getenv("GEMINI_API_KEY"):
        return None
        
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Bạn là AI chuyên gia tài chính. Hãy phân tích khoản chi sau:
    - Người nhận (Vendor): {vendor}
    - Số tiền: {amount} VND
    - Ghi chú: {note}
    
    Danh sách dự án đang chạy:
    {json.dumps(active_projects, ensure_ascii=False, indent=2)}
    
    Quy tắc:
    1. Nếu là chi phí sinh hoạt cá nhân (ăn uống, khám bệnh, grab, be, trà sữa...), Project = "Cá nhân", Category = "Personal".
    2. Nếu liên quan đến dự án, suy luận xem nó thuộc dự án nào dựa vào tên khách hàng (client) hoặc toán học.
    
    Trả về ĐÚNG MỘT khối JSON với định dạng:
    {{
      "project": "Tên dự án hoặc Cá nhân hoặc Không rõ",
      "category": "Hạng mục (Personal, Sales, Marketing, AI tools, Freelancer, Other...)",
      "confidence_score": 98,
      "reasoning": "Giải thích ngắn gọn lý do"
    }}
    Không in ra gì khác ngoài JSON.
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        text = response.text.strip()
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"AI Deduction Error: {e}")
        return None

def process_transaction(date, amount, vendor, note, payees_map, active_projects, trans_type="expense", transaction_code=None, parsed_paymentmethod=None):
    if trans_type == "income":
        net_amount = int(amount / 1.08)
        uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
        if transaction_code:
            t_id = "inc_" + transaction_code.replace("/", "_")
        else:
            t_id = "inc_" + hashlib.md5(uid_str).hexdigest()[:12]
            
        existing = execute_query("SELECT id FROM incomes WHERE id = %s", (t_id,), fetch=True)
        if existing:
            return "Transaction already exists, skipped."
            
        execute_query("""
            INSERT INTO incomes (id, date, projectid, amount, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (t_id, date, None, net_amount, note))
        return "Saved income transaction."
    else:
        # Tier 2: Business Rules Router ("Điểm đặc biệt" & Form Matching)
        smart_res = classify_expense_smart_rules(
            date_str=date,
            amount=amount,
            vendor=vendor,
            note=note,
            payees_map=payees_map,
            active_projects=active_projects,
            parsed_paymentmethod=parsed_paymentmethod
        )
        category = smart_res["category"]
        project_id = smart_res["project_id"]
        paymentmethod = smart_res["paymentmethod"]
        vendor_final = smart_res["vendor"]
        note_final = smart_res["description"]
        auto_classified = smart_res["auto_classified"]
        rule_matched = smart_res["rule_matched"]
        
        need_task = False
        if not auto_classified:
            # Fallback to Gemini AI deduction if rules didn't auto-classify
            ai_result = ai_deduce_expense(vendor_final, amount, note_final, active_projects)
            if ai_result and ai_result.get("confidence_score", 0) >= 95 and ai_result.get("project") != "Không rõ":
                project = ai_result["project"]
                category = ai_result.get("category", category)
                if project == "Cá nhân":
                    project_id = "PROJ-CANHAN"
                elif project == "Công ty":
                    project_id = "PROJ-CONGTY"
                else:
                    for p in active_projects:
                        if p['name'] == project:
                            project_id = p['id']
                            break
                need_task = False if project_id else True
            else:
                need_task = True
                
        uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
        if transaction_code:
            t_id = "exp_" + transaction_code.replace("/", "_")
        else:
            t_id = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
            
        # Check if transaction already exists
        existing = execute_query("SELECT id FROM expenseTransactions WHERE id = %s", (t_id,), fetch=True)
        if existing:
            return "Transaction already exists, skipped."
            
        execute_query("""
            INSERT INTO expenseTransactions (id, date, vendor, amount, projectid, category, description, paymentmethod)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (t_id, date, vendor_final, amount, project_id, category, note_final, paymentmethod))
        
        # Tạo task nếu thiếu thông tin
        if need_task:
            task_id = f"act_{uuid.uuid4().hex[:8]}"
            task_title = f"Bổ sung thông tin khoản chi {amount:,} VND cho {vendor_final} ({note_final})"
            execute_query("""
                INSERT INTO actions (id, priorityOrder, title, projectid, priorityLevel, suggestedAgent, status, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (task_id, 1, task_title, project_id, "High", "Minh Thu", "Pending", "work"))
            return f"Saved transaction ({rule_matched}). Created missing info task."
            
        return f"Saved transaction automatically ({rule_matched})."

def scan_mail():
    load_dotenv(dotenv_path=ENV_PATH)
    api_key = os.getenv("COMPOSIO_API_KEY")
    if not api_key:
        return {"status": "error", "message": "Missing COMPOSIO_API_KEY"}
    
    try:
        from composio import Composio
        client = Composio(api_key=api_key)
    except Exception as e:
        return {"status": "error", "message": f"Lỗi khởi tạo Composio: {e}"}

    gmail_query = "(from:vpb.neo@vpbank.com.vn OR from:vpbankonline@vpb.com.vn OR from:*@care.vpb.com.vn OR from:no-reply@momo.vn OR from:*@canva.com) after:2026/07/08 -label:Finance_Checked"
    emails = []
    try:
        res = client.tools.execute(slug="gmail_fetch_emails", arguments={"query": gmail_query, "maxResults": 30}, user_id="default_user", dangerously_skip_version_check=True)
        if isinstance(res, dict) and "data" in res:
            emails = res.get("data", [])
            if isinstance(emails, dict) and "messages" in emails: emails = emails["messages"]
        elif isinstance(res, list): emails = res
        elif isinstance(res, dict) and "messages" in res: emails = res["messages"]
    except Exception as e:
        return {"status": "error", "message": f"Lỗi khi lấy email: {e}"}

    # Load data once for all emails
    payees_map = get_payees()
    active_projects = get_all_projects()

    processed_count = 0
    for email in emails:
        msg_id = email.get("messageId") or email.get("id", "unknown")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")
        text_content = email.get("messageText", "")
        
        # Fallback to payload body if messageText is empty (e.g. VPBank debit card HTML email)
        if not text_content:
            payload = email.get("payload", {})
            body_data = payload.get("body", {}).get("data", "")
            if not body_data and "parts" in payload:
                for part in payload["parts"]:
                    if part.get("body", {}).get("data"):
                        body_data = part["body"]["data"]
                        break
            if body_data:
                try:
                    import base64
                    decoded_bytes = base64.urlsafe_b64decode(body_data + "==")
                    text_content = decoded_bytes.decode("utf-8", errors="ignore")
                except Exception:
                    pass
        
        headers = email.get("headers", {})
        email_from = email.get("sender", "")
        if not email_from:
            if isinstance(headers, list):
                for h in headers:
                    if h.get("name", "").lower() == "from": email_from = h.get("value", "")
            elif isinstance(headers, dict):
                email_from = headers.get("From", headers.get("from", ""))

        full_text = f"{subject}\n{snippet}\n{text_content}"
        trans_type, amount, vendor, note, date_str, transaction_code, parsed_paymentmethod = extract_raw_transaction(full_text, email_from)
        
        if amount <= 0: continue
        
        process_transaction(
            date_str, amount, vendor, note, payees_map, active_projects, 
            trans_type=trans_type, transaction_code=transaction_code, 
            parsed_paymentmethod=parsed_paymentmethod
        )
        apply_gmail_label(client, msg_id, "Finance_Checked")
        processed_count += 1
        
    return {"status": "success", "message": f"Đã quét và lưu {processed_count} email thành công."}

def main():
    parser = argparse.ArgumentParser(description="Minh Thu (Finance Agent) Tool")
    parser.add_argument("--scan_mail", action="store_true")
    parser.add_argument("--simulate_tx", action="store_true")
    parser.add_argument("--date", type=str)
    parser.add_argument("--amount", type=int)
    parser.add_argument("--vendor", type=str)
    parser.add_argument("--note", type=str)

    args = parser.parse_args()

    if args.simulate_tx:
        if not args.date or not args.amount or not args.vendor:
            print("Missing required fields for simulate_tx")
            return
        payees_map = get_payees()
        active_projects = get_active_projects()
        res = process_transaction(args.date, args.amount, args.vendor, args.note or "", payees_map, active_projects)
        print(json.dumps({"status": "success", "message": res}, ensure_ascii=False))

    elif args.scan_mail:
        res = scan_mail()
        print(json.dumps(res, ensure_ascii=False))
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
