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
sys.path.append(r'E:\.agents\Cloud\shared')
from finance_utils import extract_raw_transaction, apply_gmail_label, get_active_projects, get_all_projects, normalize_text, get_payees, classify_expense_smart_rules
try:
    from docxtpl import DocxTemplate
except ImportError:
    pass

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

ENV_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\01_MARKETING\AN PHIM_Fanpage\.env"

def get_composio_share_link(local_path):
    import os
    from dotenv import load_dotenv
    ENV_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\01_MARKETING\AN PHIM_Fanpage\.env"
    load_dotenv(dotenv_path=ENV_PATH)
    api_key = os.getenv("COMPOSIO_API_KEY")
    if not api_key:
        return local_path
        
    try:
        from composio import Composio
        client = Composio(api_key=api_key)
        # Attempt to upload or get link
        res = client.tools.execute(slug="googledrive_upload_file", arguments={"file_path": local_path}, dangerously_skip_version_check=True)
        if isinstance(res, dict) and res.get("data") and res["data"].get("webViewLink"):
            return res["data"]["webViewLink"]
    except Exception as e:
        print(f"Composio Drive Error: {e}")
        
    return local_path

def process_transaction(date, amount, vendor, note, payees_map, active_projects, trans_type="expense", transaction_code=None, parsed_paymentmethod=None):
    if trans_type == "income":
        net_amount = int(amount / 1.08)
        uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
        if transaction_code:
            t_id = "inc_" + transaction_code.replace("/", "_")
        else:
            t_id = "inc_" + hashlib.md5(uid_str).hexdigest()[:12]
            
        # Check if transaction already exists
        existing = execute_query("SELECT id FROM incomes WHERE id = %s", (t_id,), fetch=True)
        if existing:
            return {"status": "success", "message": "Transaction already exists, skipped."}
            
        execute_query("""
            INSERT INTO incomes (id, date, project, projectid, amount, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (t_id, date, None, None, net_amount, note))
        return {
            "status": "success", 
            "message": "Saved income transaction.",
            "amount": amount,
            "vendor": vendor,
            "note": note,
            "category": "Income",
            "project_id": None
        }
    else:
        # Business Rules Router ("Điểm đặc biệt" & Form Matching)
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
        
        uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
        if transaction_code:
            t_id = "exp_" + transaction_code.replace("/", "_")
        else:
            t_id = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
            
        # Check if transaction already exists
        existing = execute_query("SELECT id FROM expenseTransactions WHERE id = %s", (t_id,), fetch=True)
        if existing:
            return {"status": "success", "message": "Transaction already exists, skipped."}
            
        execute_query("""
            INSERT INTO expenseTransactions (id, date, vendor, amount, projectid, category, description, paymentmethod)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (t_id, date, vendor_final, amount, project_id, category, note_final, paymentmethod))
        
        if not auto_classified:
            return {
                "status": "pending_ai",
                "message": f"Cần sếp phân loại ({rule_matched})",
                "amount": amount,
                "vendor": vendor_final,
                "note": note_final,
                "category": category,
                "project_id": project_id,
                "rule_matched": rule_matched,
                "t_id": t_id
            }
            
        return {
            "status": "success",
            "message": f"Tự động lưu theo {rule_matched}",
            "amount": amount,
            "vendor": vendor_final,
            "note": note_final,
            "category": category,
            "project_id": project_id,
            "rule_matched": rule_matched
        }

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

    gmail_query = "(from:vpb.neo@vpbank.com.vn OR from:vpbankonline@vpb.com.vn OR from:*@care.vpb.com.vn OR from:no-reply@momo.vn OR from:*@canva.com) -label:Finance_Checked newer_than:30d"
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

    payees_map = get_payees()
    active_projects = get_active_projects()

    processed_count = 0
    pending_agents_tasks = []
    successful_transactions = []

    for email in emails:
        msg_id = email.get("messageId") or email.get("id", "unknown")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")
        text_content = email.get("messageText", "")
        if not text_content and "payload" in email:
            import base64
            p = email.get("payload", {})
            b64_data = ""
            if p.get("body", {}).get("data"):
                b64_data = p["body"]["data"]
            elif p.get("parts"):
                for part in p["parts"]:
                    if part.get("body", {}).get("data"):
                        b64_data = part["body"]["data"]
                        break
            if b64_data:
                try:
                    html = base64.urlsafe_b64decode(b64_data + "===").decode("utf-8", errors="ignore")
                    text_content = re.sub(r"<[^<]+?>", " ", html)
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
        
        res = process_transaction(date_str, amount, vendor, note, payees_map, active_projects, trans_type=trans_type, transaction_code=transaction_code, parsed_paymentmethod=parsed_paymentmethod)
        if res:
            if res.get("status") == "pending_ai":
                pending_agents_tasks.append(res)
            elif res.get("status") == "success" and "skipped" not in res.get("message", ""):
                successful_transactions.append({
                    "amount": amount,
                    "vendor": res.get("vendor", vendor),
                    "note": res.get("note", note),
                    "category": res.get("category", "Chưa rõ"),
                    "project_id": res.get("project_id", "Chưa rõ"),
                    "message": res.get("message")
                })
        
        apply_gmail_label(client, msg_id, "Finance_Checked") # Optional: uncomment if wanting to label local checks
        processed_count += 1
        
    output = {
        "status": "success", 
        "message": f"Đã quét {processed_count} email thành công.",
        "pending_ai_tasks": pending_agents_tasks,
        "successful_transactions": successful_transactions
    }
    return output

def generate_contract(project_id, doc_type):
    # Lấy thông tin dự án
    proj = execute_query("SELECT name, client FROM projects WHERE id = %s", (project_id,), fetch=True)
    if not proj:
        return {"status": "error", "message": f"Khong tim thay du an {project_id}"}
    project_name = proj[0]['name']
    client_name = proj[0]['client']

    # Lấy draft báo giá từ bảng documents
    doc = execute_query("SELECT content FROM documents WHERE project = %s ORDER BY id DESC LIMIT 1", (project_id,), fetch=True)
    if not doc or not doc[0].get('content'):
        return {"status": "error", "message": "Khong tim thay ban nhap (Draft) nao trong bang documents"}
    
    draft_content = doc[0]['content']

    # Đường dẫn
    template_dir = r"G:\My Drive\[ANPHIM] MASTER PLANN\00_COMPANY_MASTER\Template"
    if doc_type.upper() == "QUOTE":
        template_path = os.path.join(template_dir, "[000026]_Nhóm 2_AI FILM_quotation.xlsx")
        prefix = "BaoGia"
    elif doc_type.upper() == "ADVANCE":
        template_path = os.path.join(template_dir, "[270526] ĐỀ NGHỊ TẠM ỨNG_ Template.docx")
        prefix = "DeNghiTamUng"
    else:
        template_path = os.path.join(template_dir, "[280526]_HĐDV_Sản xuất Template.docx")
        prefix = "HopDong"
        
    out_dir = rf"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\{client_name}\{project_name}\documents"
    os.makedirs(out_dir, exist_ok=True)
    
    out_filename = f"{prefix}_{project_name}_{datetime.datetime.now().strftime('%Y%m%d')}.docx"
    out_path = os.path.join(out_dir, out_filename)

    try:
        from docxtpl import DocxTemplate
        
        import json
        try:
            draft_json = json.loads(draft_content)
            items = draft_json.get('items', [])
        except:
            items = []
        
        grand_total = sum(item.get('total', 0) for item in items) * 1.08 # Add 8% VAT
        
        # Payment terms logic
        if grand_total < 30000000:
            phan_tram_dot_1, phan_tram_dot_2, phan_tram_dot_3 = 100, 0, 0
        elif grand_total <= 100000000:
            phan_tram_dot_1, phan_tram_dot_2, phan_tram_dot_3 = 50, 50, 0
        else:
            phan_tram_dot_1, phan_tram_dot_2, phan_tram_dot_3 = 50, 40, 10
            
        hang_muc = "Dịch vụ AI Video"
        
        client_info = execute_query("SELECT * FROM clients WHERE name ILIKE %s OR id ILIKE %s", (f"%{client_name}%", f"%{client_name}%"), fetch=True)
        if client_info:
            c = client_info[0]
            c_name = c.get('name') or client_name
            c_address = c.get('address') or "..."
            c_tax_id = c.get('tax_id') or "..."
            c_rep_name = c.get('rep_name') or "..."
            c_rep_role = c.get('rep_role') or "..."
        else:
            c_name = client_name
            c_address = "..."
            c_tax_id = "..."
            c_rep_name = "..."
            c_rep_role = "..."
            
        doc = DocxTemplate(template_path)
        
        tam_ung = int(grand_total * phan_tram_dot_1 / 100)
        
        context = {
            "TEN_DU_AN": project_name,
            "MA_DU_AN": f"VR{datetime.datetime.now().strftime('%m%d')}",
            "KHACH_HANG": c_name,
            "TEN_CONG_TY_A": c_name,
            "DIA_CHI_A": c_address,
            "MA_SO_THUE_A": c_tax_id,
            "DAI_DIEN_A": c_rep_name,
            "CHUC_VU_A": c_rep_role,
            "HANG_MUC": hang_muc,
            "NGAY_THANG_NAM_SO": datetime.datetime.now().strftime("%d/%m/%Y"),
            "NGAY_THANG_NAM_CHU": f"{datetime.datetime.now().strftime('%d')} tháng {datetime.datetime.now().strftime('%m')} năm {datetime.datetime.now().strftime('%Y')}",
            "SO_LUONG_SAN_PHAM": "4",
            "TONG_GIA_TRI_SO_CHUA_VAT": "{:,.0f}".format(sum(item.get('total', 0) for item in items)).replace(",", "."),
            "VAT_SO": "{:,.0f}".format(sum(item.get('total', 0) for item in items) * 0.08).replace(",", "."),
            "TONG_GIA_TRI_SO": "{:,.0f}".format(grand_total).replace(",", "."),
            "TONG_GIA_TRI_CHU": "...",
            "PHAN_TRAM_DOT_1": phan_tram_dot_1,
            "PHAN_TRAM_DOT_2": phan_tram_dot_2,
            "PHAN_TRAM_DOT_3": phan_tram_dot_3,
            "DOT_1_SO": "{:,.0f}".format(tam_ung).replace(",", "."),
            "DOT_2_SO": "{:,.0f}".format(int(grand_total * phan_tram_dot_2 / 100)).replace(",", "."),
            "DOT_3_SO": "{:,.0f}".format(int(grand_total * phan_tram_dot_3 / 100)).replace(",", "."),
            "DOT_1_CHU": "...",
            "DOT_2_CHU": "...",
            "DOT_3_CHU": "..."
        }
        doc.render(context)
        doc.save(out_path)
        
        # Manually fill the table to bypass docxtpl issues
        from docx import Document
        out_doc = Document(out_path)
        target_table = None
        for table in out_doc.tables:
            try:
                if "PHẠM VI DỊCH VỤ" in table.rows[0].cells[0].text.upper():
                    target_table = table
                    break
            except: pass
            
        if target_table:
            while len(target_table.rows) > 1:
                target_table._tbl.remove(target_table.rows[1]._tr)
            
            for item in items:
                r = target_table.add_row()
                r.cells[0].text = item.get('name', '')
                r.cells[1].text = "gói"
                r.cells[2].text = "{:,.0f}".format(item.get('qty', 1)).replace(",", ".")
                r.cells[3].text = "{:,.0f}".format(item.get('price', 0)).replace(",", ".")
                r.cells[4].text = "{:,.0f}".format(item.get('total', 0)).replace(",", ".")
                
            # Totals
            r = target_table.add_row()
            r.cells[0].merge(r.cells[3])
            r.cells[0].text = "TỔNG CỘNG"
            r.cells[4].text = "{:,.0f}".format(sum(item.get('total', 0) for item in items)).replace(",", ".")
            
            r = target_table.add_row()
            r.cells[0].merge(r.cells[3])
            r.cells[0].text = "Thuế VAT 8%"
            r.cells[4].text = "{:,.0f}".format(sum(item.get('total', 0) for item in items) * 0.08).replace(",", ".")
            
            r = target_table.add_row()
            r.cells[0].merge(r.cells[3])
            r.cells[0].text = "TỔNG CỘNG SAU THUẾ"
            r.cells[4].text = "{:,.0f}".format(grand_total).replace(",", ".")
            
        # Clean up empty payment stage 3 if not applicable
        if phan_tram_dot_3 == 0:
            to_delete = []
            for p in out_doc.paragraphs:
                if "Đợt 3: Thanh toán  0%" in p.text or "Đợt 3: Thanh toán 0%" in p.text:
                    to_delete.append(p)
                elif "Hóa đơn giá trị gia tăng hợp lệ tương ứng giá trị Hợp đồng còn lại của Hợp đồng" in p.text:
                    to_delete.append(p)
            for p in to_delete:
                try:
                    p._element.getparent().remove(p._element)
                except: pass
                
        out_doc.save(out_path)
        
        # Cập nhật projectdocuments (Bật true cả 2 cột theo ý sếp)
        execute_query("""
            INSERT INTO projectdocuments (projectid, projectname, quote, contract, contract_link) 
            VALUES (%s, %s, True, True, %s) 
            ON CONFLICT (projectid) DO UPDATE SET quote = True, contract = EXCLUDED.contract, contract_link = EXCLUDED.contract_link
        """, (project_id, project_name, get_composio_share_link(out_path)), fetch=False)
        
        # Cập nhật Project_SOW
        sow_id = f"sow_{project_id}"
        payment_terms_str = f"Đợt 1: {phan_tram_dot_1}%, Đợt 2: {phan_tram_dot_2}%, Đợt 3: {phan_tram_dot_3}%"
        items_json = json.dumps(items, ensure_ascii=False)
        try:
            execute_query("""
                INSERT INTO "Project_SOW" (id, project_id, hang_muc, quotation, payment_terms, items)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET 
                    hang_muc = EXCLUDED.hang_muc,
                    quotation = EXCLUDED.quotation,
                    payment_terms = EXCLUDED.payment_terms,
                    items = EXCLUDED.items
            """, (sow_id, project_id, hang_muc, grand_total, payment_terms_str, items_json), fetch=False)
        except Exception as e:
            print(f"Lỗi khi lưu Project_SOW: {e}")
            
        # Đồng bộ budget vào bảng projects
        try:
            execute_query("""
                UPDATE projects SET budget = %s WHERE id = %s
            """, (grand_total, project_id), fetch=False)
        except Exception as e:
            print(f"Lỗi khi đồng bộ budget: {e}")
            
        return {"status": "success", "message": f"Da xuat file: {out_path} va cap nhat SOW, Budget thanh cong."}
    except Exception as e:
        return {"status": "error", "message": f"Loi sinh file Word: {e}"}

def main():
    parser = argparse.ArgumentParser(description="Minh Thu (Finance Agent) Tool - LOCAL MODE")
    parser.add_argument("--scan_mail", action="store_true")
    parser.add_argument("--simulate_tx", action="store_true")
    parser.add_argument("--generate_contract", action="store_true")
    parser.add_argument("--project_id", type=str)
    parser.add_argument("--doc_type", type=str, default="QUOTE")
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
        
    elif args.generate_contract:
        if not args.project_id:
            print(json.dumps({"status": "error", "message": "Missing --project_id"}))
            return
        res = generate_contract(args.project_id, args.doc_type)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
