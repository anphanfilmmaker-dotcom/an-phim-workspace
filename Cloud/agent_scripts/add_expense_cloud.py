import sys
import os
import argparse
import uuid
import datetime
import json
import google.generativeai as genai

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.core.db_connection import execute_query

def main():
    parser = argparse.ArgumentParser(description="Add expense via natural language (Cloud)")
    parser.add_argument("--chat", required=True, help="Raw chat message from user")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("LOI: Thieu GEMINI_API_KEY")
        return
        
    genai.configure(api_key=api_key)
    
    prompt = f"""
    Bạn là trợ lý ảo Minh Thư phụ trách tài chính của công ty AN PHIM.
    Sếp vừa nhắn tin khai báo chi phí. Nhiệm vụ của bạn là trích xuất thông tin thành chuỗi JSON chuẩn.
    Tin nhắn: "{args.chat}"
    
    Định dạng JSON yêu cầu:
    {{
        "amount": (số nguyên, số tiền VND),
        "project": (chuỗi, tên dự án hoặc 'General' nếu không rõ),
        "category": (chuỗi, ví dụ 'Food', 'Freelancer', 'Props', 'Travel', 'Other'),
        "vendor": (chuỗi, tên người nhận hoặc 'Unknown'),
        "method": (chuỗi, ví dụ 'Bank Transfer', 'Cash', 'Momo'),
        "note": (chuỗi, ghi chú),
        "missing_info": (chuỗi, ghi rõ thông tin quan trọng nào bị thiếu như số tiền, dự án, hoặc để rỗng nếu đủ)
    }}
    Chỉ in ra JSON, không giải thích gì thêm.
    """
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        data = json.loads(text.strip())
    except Exception as e:
        print(f"LOI: Khong the phan tich tin nhan qua AI: {e}")
        return

    if data.get('missing_info') and len(data['missing_info'].strip()) > 0:
        print(f"THIEU THONG TIN: {data['missing_info']}")
        return
        
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    
    project_id = None
    actual_project_name = data.get('project', 'General')
    projects_data = execute_query("SELECT id, name FROM projects WHERE name ILIKE %s", params=(f"%{actual_project_name}%",), fetch=True)
    if projects_data:
        project_id = projects_data[0]['id']
        actual_project_name = projects_data[0]['name']

    eid = "exp_" + uuid.uuid4().hex[:12]

    query = """
        INSERT INTO expenseTransactions
        (id, date, vendor, amount, project, projectId, category, paymentMethod, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        eid, date_str, 
        data.get('vendor', 'Unknown'), 
        data.get('amount', 0), 
        actual_project_name, 
        project_id, 
        data.get('category', 'Other'), 
        data.get('method', 'Cash'), 
        data.get('note', '')
    )
    
    if execute_query(query, params, fetch=False):
        print(f"THANH CONG: Da luu chi phi {data.get('amount')} VND cho '{actual_project_name}' thong qua Cloud AI.")
    else:
        print("LOI: Khong the luu chi phi vao database.")

if __name__ == "__main__":
    main()
