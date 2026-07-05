import os
import sys
import argparse
import json
import datetime
import uuid
import hashlib
import re
from dotenv import load_dotenv

sys.path.append(r"E:\.agents\Cloud\shared\core")
from db_connection import execute_query

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

ENV_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\01_MARKETING\AN PHIM_Fanpage\.env"

def extract_raw_transaction(text, email_from):
    amount = 0
    note = ""
    vendor = ""
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")

    text_clean = re.sub(r'<[^>]+>', '\n', text)
    text_clean = re.sub(r'\n+', '\n', text_clean)

    is_expense = False
    if "ghi nợ" in text_clean.lower() or "sotienghino" in text_clean.lower() or "trừ" in text_clean.lower():
        is_expense = True

    amount_match = re.search(r'([\+\-])\s*([0-9.,]+)\s*(VND|VNĐ|đ)', text_clean, re.IGNORECASE)
    if amount_match:
        sign = amount_match.group(1)
        if sign == '-': is_expense = True
        amount_str = amount_match.group(2).replace(',', '').replace('.', '')
        try: amount = float(amount_str)
        except ValueError: pass
    else:
        amount_match = re.search(r'(Số tiền giao dịch|SotienghiCO|SotienghiNO|Amount|Số tiền trích nợ:|Số tiền ghi có:|Khoản thanh toán|Số tiền)\s*([\+\-])?\s*([0-9.,]+)', text_clean, re.IGNORECASE)
        if amount_match:
            if amount_match.group(2) == '-' or "sotienghino" in amount_match.group(1).lower() or "trích nợ" in amount_match.group(1).lower():
                is_expense = True
            elif "khoản thanh toán" in amount_match.group(1).lower() or "số tiền" in amount_match.group(1).lower():
                is_expense = True
            amount_str = amount_match.group(3).replace(',', '').replace('.', '')
            try: amount = float(amount_str)
            except ValueError: pass
        else:
            amount_match = re.search(r'Charged:\s*[₫đ]?\s*([0-9.,]+)', text_clean, re.IGNORECASE)
            if amount_match:
                is_expense = True
                amount_str = amount_match.group(1).replace(',', '').replace('.', '')
                try: amount = float(amount_str)
                except ValueError: pass

    trans_type = "expense" if is_expense else "income"
    if amount == 0:
        trans_type = "unknown"

    note_match = re.search(r'(Nội dung|Noidung|Description|Chi tiết):\s*(.*)', text_clean, re.IGNORECASE)
    if note_match:
        note = note_match.group(2).strip()
    else:
        vp_note_match = re.search(r'Changed Amount\s*\n(.*?)\nNội dung/\s*Transaction Content', text_clean, re.IGNORECASE)
        if vp_note_match:
            note = vp_note_match.group(1).strip()
        else:
            vp_note_match2 = re.search(r'Nội dung/\s*Transaction Content\s*\n(.*?)\n', text_clean, re.IGNORECASE)
            if vp_note_match2:
                note = vp_note_match2.group(1).strip()
            else:
                vp_neo_match = re.search(r'Nội dung chuyển tiền:\s*(.*?)\s*Details of Payment', text_clean, re.IGNORECASE|re.DOTALL)
                if vp_neo_match:
                    note = vp_neo_match.group(1).strip()
                else:
                    vp_credit_match = re.search(r'(The \d{4}x+\d{4} GD thanh toan tai.*)', text_clean, re.IGNORECASE)
                    if vp_credit_match:
                        note = vp_credit_match.group(1).strip()
                    else:
                        vp_credit_match2 = re.search(r'(GD thanh toan tai.*)', text_clean, re.IGNORECASE)
                        if vp_credit_match2:
                            note = vp_credit_match2.group(1).strip()

    payee_match = re.search(r'thanh toan tai\s+([A-Za-z0-9\s]+)', note, re.IGNORECASE)
    if payee_match:
        vendor = payee_match.group(1).strip()
    else:
        neo_payee_match = re.search(r'Tên người hưởng:\s*(.*?)\s*Beneficiary Name', text_clean, re.IGNORECASE|re.DOTALL)
        if neo_payee_match:
            vendor = neo_payee_match.group(1).strip()
        else:
            momo_vendor_match = re.search(r'Dịch vụ\s*\n\s*(.*?)\s*\n', text_clean, re.IGNORECASE)
            if momo_vendor_match:
                vendor = momo_vendor_match.group(1).strip()

    if not vendor:
        if "vpb.neo" in email_from: vendor = "VPBank"
        elif "momo" in email_from: vendor = "MoMo"
        elif "canva" in email_from.lower(): vendor = "Canva"

    date_match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', text_clean)
    if date_match:
        date_str = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

    return trans_type, amount, vendor, note, date_str

def apply_gmail_label(client, msg_id, label_name="Finance_Checked"):
    if not client or not msg_id:
        return
    try:
        res = client.tools.execute(slug='gmail_list_labels', arguments={}, user_id='default_user', dangerously_skip_version_check=True)
        label_id = None
        if res.get('successful'):
            labels = res['data'].get('labels', [])
            for lbl in labels:
                if lbl['name'] == label_name:
                    label_id = lbl['id']
                    break
        if not label_id:
            res_create = client.tools.execute(slug='gmail_create_label', arguments={'name': label_name, 'labelListVisibility': 'labelShow', 'messageListVisibility': 'show'}, user_id='default_user', dangerously_skip_version_check=True)
            if res_create.get('successful'):
                label_id = res_create['data'].get('id')
        if label_id:
            client.tools.execute(slug='gmail_add_label_to_email', arguments={'message_id': msg_id, 'label_id': label_id}, user_id='default_user', dangerously_skip_version_check=True)
        try:
            client.tools.execute(slug='gmail_add_label_to_email', arguments={'message_id': msg_id, 'removeLabelIds': ['UNREAD']}, user_id='default_user', dangerously_skip_version_check=True)
        except Exception:
            pass
    except Exception:
        pass

def get_active_projects():
    """Fetch active projects from DB to feed into AI context"""
    res = execute_query("SELECT id, name, client FROM projects WHERE status != 'Hoàn thành'", fetch=True)
    return res if res else []

def get_payees():
    """Fetch known payees from DB"""
    res = execute_query("SELECT vendor, default_category, default_project, default_method FROM payees", fetch=True)
    return {p['vendor'].lower(): p for p in res} if res else {}

def process_transaction(date, amount, vendor, note, payees_map, active_projects, trans_type="expense"):
    v_lower = vendor.lower() if vendor else ""
    project = "Không rõ"
    category = "Khác"
    need_task = True
    
    if trans_type == "income":
        category = "Income"
        project = "Không rõ"
    else:
        # 1. Trực tiếp từ bảng Payee
        if v_lower in payees_map:
            p_info = payees_map[v_lower]
            category = p_info.get("default_category", "Khác")
            project = p_info.get("default_project", "Không rõ")
            need_task = False
        else:
            # BÁO CÁO CHO AGENT (KHÔNG GỌI GEMINI API CỨNG)
            return {
                "status": "pending_ai",
                "vendor": vendor,
                "amount": amount,
                "note": note,
                "date": date,
                "trans_type": trans_type,
                "projects_list": active_projects,
                "message": f"AGENT_ACTION_REQUIRED: Please deduce project and category for vendor '{vendor}' and run SQL to insert."
            }

    # Ghi sổ với Payee đã biết
    uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
    t_prefix = "inc_" if trans_type == "income" else "exp_"
    t_id = t_prefix + hashlib.md5(uid_str).hexdigest()[:12]
    
    execute_query("""
        INSERT INTO expenseTransactions (id, date, vendor, amount, project, category, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, (t_id, date, vendor, amount, project, category, note))
    
    # Tạo task nếu thiếu thông tin
    if need_task:
        task_id = f"act_{uuid.uuid4().hex[:8]}"
        task_title = f"Bổ sung thông tin khoản {'thu' if trans_type=='income' else 'chi'} {amount:,} VND {'từ' if trans_type=='income' else 'cho'} {vendor} ({note})"
        
        execute_query("""
            INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, category)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (task_id, 1, task_title, project, "High", "Minh Thu", "Pending", "work"))
        
    return {"status": "success", "message": "Saved known transaction automatically."}

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

    gmail_query = "(from:vpb.neo@vpbank.com.vn OR from:no-reply@momo.vn) -label:Finance_Checked"
    emails = []
    try:
        res = client.tools.execute(slug="gmail_fetch_emails", arguments={"q": gmail_query, "maxResults": 20}, user_id="default_user", dangerously_skip_version_check=True)
        if isinstance(res, dict) and "data" in res:
            emails = res.get("data", [])
            if isinstance(emails, dict) and "messages" in emails: emails = emails["messages"]
        elif isinstance(res, list): emails = res
        elif isinstance(res, dict) and "messages" in res: emails = res["messages"]
    except Exception as e:
        return {"status": "error", "message": f"Lỗi khi lấy email: {e}"}

    payees_map = get_payees()
    active_projects = get_active_projects()

    processed_count = 0
    pending_agents_tasks = []

    for email in emails:
        msg_id = email.get("messageId") or email.get("id", "unknown")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")
        text_content = email.get("messageText", "")
        
        headers = email.get("headers", {})
        email_from = ""
        if isinstance(headers, list):
            for h in headers:
                if h.get("name", "").lower() == "from": email_from = h.get("value", "")
        elif isinstance(headers, dict):
            email_from = headers.get("From", headers.get("from", ""))

        full_text = f"{subject}\n{snippet}\n{text_content}"
        trans_type, amount, vendor, note, date_str = extract_raw_transaction(full_text, email_from)
        
        if amount <= 0: continue
        
        res = process_transaction(date_str, amount, vendor, note, payees_map, active_projects, trans_type=trans_type)
        if res.get("status") == "pending_ai":
            pending_agents_tasks.append(res)
        
        # apply_gmail_label(client, msg_id, "Finance_Checked") # Optional: uncomment if wanting to label local checks
        processed_count += 1
        
    output = {
        "status": "success", 
        "message": f"Đã quét {processed_count} email thành công.",
        "pending_ai_tasks": pending_agents_tasks
    }
    return output

def main():
    parser = argparse.ArgumentParser(description="Minh Thu (Finance Agent) Tool - LOCAL MODE")
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
        print(json.dumps(res, ensure_ascii=False, indent=2))

    elif args.scan_mail:
        res = scan_mail()
        print(json.dumps(res, ensure_ascii=False, indent=2))
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
