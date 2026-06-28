import os
import sys
import argparse
import json
import datetime
import uuid
import hashlib
from db_connection import execute_query
import google.generativeai as genai

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_active_projects():
    """Fetch active projects from DB to feed into AI context"""
    res = execute_query("SELECT id, name, client, status, budget FROM projects WHERE status != 'Hoàn thành'", fetch=True)
    return res if res else []

def get_payees():
    """Fetch known payees from DB"""
    res = execute_query("SELECT vendor, default_category, default_project, default_method, ai_metadata FROM payees", fetch=True)
    return {p['vendor'].lower(): p for p in res} if res else {}

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
    2. Nếu liên quan đến dự án, suy luận xem nó thuộc dự án nào dựa vào tên khách hàng (client) hoặc toán học (ví dụ: số tiền = 10% ngân sách dự án thì là hoa hồng Sales).
    3. Nếu là tiền trả cho nhân sự theo tháng (như Tít), ưu tiên gán vào dự án tương ứng của tháng hiện tại.
    
    Trả về ĐÚNG MỘT khối JSON với định dạng:
    {{
      "project": "Tên dự án hoặc Cá nhân hoặc Không rõ",
      "category": "Hạng mục (Personal, Sales, Marketing, AI Tools, Freelancer, Khác...)",
      "confidence_score": 98,
      "reasoning": "Giải thích ngắn gọn lý do"
    }}
    Không in ra gì khác ngoài JSON.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"AI Deduction Error: {e}")
        return None

def process_transaction(date, amount, vendor, note):
    payees_map = get_payees()
    active_projects = get_active_projects()
    
    v_lower = vendor.lower()
    project = "Không rõ"
    category = "Khác"
    need_task = True
    ai_metadata = {}
    
    # 1. Trực tiếp từ bảng Payee
    if v_lower in payees_map:
        p_info = payees_map[v_lower]
        category = p_info.get("default_category", "Khác")
        project = p_info.get("default_project", "Không rõ")
        need_task = False
    else:
        # 2. Gọi AI suy luận
        ai_result = ai_deduce_expense(vendor, amount, note, active_projects)
        if ai_result:
            if ai_result.get("confidence_score", 0) >= 95 and ai_result.get("project") != "Không rõ":
                project = ai_result["project"]
                category = ai_result["category"]
                need_task = False
                ai_metadata = ai_result
                
                # Tự học: Cập nhật thẳng vào Payee
                execute_query("""
                    INSERT INTO payees (vendor, default_category, default_project, default_method, ai_metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (vendor) DO NOTHING
                """, (vendor, category, project, "Chuyển khoản", json.dumps(ai_metadata)))
            else:
                ai_metadata = ai_result
                category = ai_result.get("category", "Chưa phân loại")
                project = "Không rõ"

    # Luôn ghi sổ expense
    uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
    t_id = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
    
    execute_query("""
        INSERT INTO expenseTransactions (id, date, vendor, amount, project, category, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, (t_id, date, vendor, amount, project, category, note))
    
    # Tạo task nếu thiếu thông tin
    if need_task:
        task_id = f"act_{uuid.uuid4().hex[:8]}"
        task_title = f"Bổ sung thông tin khoản chi {amount:,} VND cho {vendor} ({note})"
        
        execute_query("""
            INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, category)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (task_id, 1, task_title, project, "High", "Minh Thu", "Pending", "work"))
        return f"Saved expense. Created missing info task (AI Score: {ai_metadata.get('confidence_score', 'N/A')}%)"
        
    return f"Saved expense automatically via AI (Score: {ai_metadata.get('confidence_score', '100')}%)"

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
        res = process_transaction(args.date, args.amount, args.vendor, args.note or "")
        print(json.dumps({"status": "success", "message": res}, ensure_ascii=False))

    elif args.scan_mail:
        print(json.dumps({"status": "success", "message": "Quét mail (Giả lập) hoàn tất."}, ensure_ascii=False))
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
