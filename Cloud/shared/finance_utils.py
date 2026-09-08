import re
import datetime
import sys
import os

# Ensure we can import db_connection from core
core_dir = os.path.join(os.path.dirname(__file__), 'core')
if core_dir not in sys.path:
    sys.path.append(core_dir)

from db_connection import execute_query

# =====================================================================
# TẦNG 1: FORM ROUTER BÓC TÁCH EMAIL (PARSER PIPELINE)
# =====================================================================

def _parse_form1_vpbank_debit(clean_lines):
    """
    FORM 1: VPBank Thẻ Ghi Nợ / Biến động số dư (Debit Card / ATM)
    """
    is_expense = True
    amount = 0.0
    vendor = "VPBank"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Cash"

    # 1. Số tiền: -8,500,000 VND   Số tiền thay đổi/ Changed Amount
    amt_match = re.search(r'([+\-])\s*([0-9.,]+)\s*VND\s*(?:\n|\s+)\s*Số tiền thay đổi', clean_lines, re.IGNORECASE)
    if not amt_match:
        amt_match = re.search(r'Số tiền thay đổi[^:]*:\s*([+\-])?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if amt_match:
        sign = amt_match.group(1) if amt_match.group(1) else '-'
        is_expense = (sign == '-')
        amt_val = amt_match.group(2).replace(',', '').replace('.', '')
        try:
            amount = float(amt_val)
        except ValueError:
            pass

    # 2. Nội dung giao dịch
    content_match = re.search(r'([^\n]+?)\s*(?:\n|\s{2,})\s*Nội dung/\s*Transaction Content', clean_lines, re.IGNORECASE)
    if not content_match:
        content_match = re.search(r'Nội dung/\s*Transaction Content\s*[:\n]\s*([^\n]+)', clean_lines, re.IGNORECASE)
    
    if content_match:
        raw_content = content_match.group(1).strip()
        note = raw_content
        if "RUT TIEN TAI ATM" in raw_content.upper():
            paymentmethod = "Cash"
            atm_loc = re.search(r'tai\s+(?:ATM\s+)?(VPBANK[A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', raw_content, re.IGNORECASE)
            if not atm_loc:
                atm_loc = re.search(r'tai\s+([A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', raw_content, re.IGNORECASE)
            vendor = atm_loc.group(1).strip() if atm_loc else "ATM VPBank"
        elif "thanh toan tai" in raw_content.lower() or "gd thanh toan" in raw_content.lower():
            paymentmethod = "Credit card"
            pos_loc = re.search(r'tai\s+([A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', raw_content, re.IGNORECASE)
            vendor = pos_loc.group(1).strip() if pos_loc else "VPBank POS"
        else:
            paymentmethod = "Chuyển khoản"
            vendor = "VPBank"

    # 3. Thời gian: 08/09/2026 16:37   Thời gian/ Time
    time_match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?\s*(?:\n|\s+)\s*Thời gian', clean_lines, re.IGNORECASE)
    if not time_match:
        time_match = re.search(r'Thời gian/\s*Time\s*[:\n]\s*(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines, re.IGNORECASE)
    if time_match:
        date_str = f"{time_match.group(3)}-{time_match.group(2)}-{time_match.group(1)}"

    # 4. Mã giao dịch: FT26251580616017 Mã giao dịch/  Transaction Code
    code_match = re.search(r'([A-Za-z0-9/-]+)\s*(?:\n|\s+)\s*Mã giao dịch/\s*Transaction Code', clean_lines, re.IGNORECASE)
    if not code_match:
        code_match = re.search(r'Mã giao dịch/\s*Transaction Code\s*[:\n]\s*([A-Za-z0-9/-]+)', clean_lines, re.IGNORECASE)
    if code_match:
        transaction_code = code_match.group(1).strip()

    trans_type = "expense" if is_expense else "income"
    return (trans_type, amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form2_vpbank_neo(clean_lines):
    """
    FORM 2: VPBank NEO - Chuyển tiền Internet Banking
    """
    amount = 0.0
    vendor = "VPBank NEO"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Chuyển khoản"

    amt_match = re.search(r'Số tiền giao dịch:?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if not amt_match:
        amt_match = re.search(r'Số tiền:?\s*([0-9.,]+)\s*(?:VND|đ|₫)', clean_lines, re.IGNORECASE)
    if amt_match:
        raw_amt = amt_match.group(1).replace(',', '').replace('.', '')
        try:
            amount = float(raw_amt)
        except ValueError:
            pass

    bene_match = re.search(r'Tên người hưởng:?\s*(.*?)\s*(?:Beneficiary Name|\n|$)', clean_lines, re.IGNORECASE)
    if bene_match and bene_match.group(1).strip():
        vendor = bene_match.group(1).strip()

    note_match = re.search(r'Nội dung chuyển tiền:?\s*(.*?)\s*(?:Details of Payment|\n|$)', clean_lines, re.IGNORECASE)
    if note_match and note_match.group(1).strip():
        note = note_match.group(1).strip()

    code_match = re.search(r'(?:Mã giao dịch / Trace|Mã tham chiếu|Mã GD|Trace):?\s*([A-Za-z0-9/_-]+)', clean_lines, re.IGNORECASE)
    if code_match:
        transaction_code = code_match.group(1).strip()

    date_match = re.search(r'Ngày giao dịch:?\s*(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines, re.IGNORECASE)
    if date_match:
        date_str = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form3_vpbank_credit(clean_lines):
    """
    FORM 3: VPBank Thẻ Tín Dụng (Credit Card Alert / POS / Online)
    """
    amount = 0.0
    vendor = "VPBank Credit"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Credit card"

    amt_match = re.search(r'(?:so tien|số tiền|charged:?)\s*[₫đ]?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if amt_match:
        raw_amt = amt_match.group(1).replace(',', '').replace('.', '')
        try:
            amount = float(raw_amt)
        except ValueError:
            pass

    vendor_match = re.search(r'thanh toan tai\s+([A-Za-z0-9\s.,&_-]+?)(?:\s+so\s+tien|\s+số\s+tiền|\s+luc|\s*$|\n)', clean_lines, re.IGNORECASE)
    if vendor_match:
        vendor = vendor_match.group(1).strip()
        note = f"Thanh toán thẻ tại {vendor}"

    code_match = re.search(r'(?:Mã giao dịch|Mã GD|Trace|Ma GD|Mã GD/Trace):?\s*([A-Za-z0-9/_-]+)', clean_lines, re.IGNORECASE)
    if code_match:
        transaction_code = code_match.group(1).strip()

    date_match = re.search(r'luc\s+(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines, re.IGNORECASE)
    if date_match:
        date_str = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form4_momo(clean_lines):
    """
    FORM 4: Ví điện tử MoMo
    """
    amount = 0.0
    vendor = "MoMo"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Momo"

    amt_match = re.search(r'Số tiền\s*\n\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if not amt_match:
        amt_match = re.search(r'([0-9.,]+)\s*(?:đ|VND)', clean_lines, re.IGNORECASE)
    if amt_match:
        raw_amt = amt_match.group(1).replace(',', '').replace('.', '')
        try:
            amount = float(raw_amt)
        except ValueError:
            pass

    service_match = re.search(r'Dịch vụ\s*\n\s*([^\n]+)', clean_lines, re.IGNORECASE)
    if service_match:
        vendor = service_match.group(1).strip()
        note = f"Thanh toán MoMo {vendor}"

    code_match = re.search(r'Mã giao dịch\s*\n\s*([0-9A-Za-z]+)', clean_lines, re.IGNORECASE)
    if code_match:
        transaction_code = code_match.group(1).strip()

    date_match = re.search(r'Thời gian\s*\n\s*(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines, re.IGNORECASE)
    if date_match:
        date_str = f"{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}"

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form5_saas(clean_lines, email_from):
    """
    FORM 5: Hóa đơn SaaS / Dịch vụ AI (Canva, OpenAI, Cursor...)
    """
    amount = 0.0
    vendor = "SaaS"
    note = "Phần mềm dịch vụ"
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Credit card"

    if 'canva' in email_from.lower():
        vendor = "Canva"
        note = "Canva Subscription"
    elif 'openai' in email_from.lower():
        vendor = "OpenAI"
        note = "OpenAI API / ChatGPT"

    amt_match = re.search(r'(?:total|amount paid|charged|tổng cộng|số tiền):?\s*[$₫đ]?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if amt_match:
        raw_amt = amt_match.group(1).replace(',', '').replace('.', '')
        try:
            amount = float(raw_amt)
        except ValueError:
            pass

    inv_match = re.search(r'(?:Invoice|Order ID|Mã hóa đơn|Invoice number):?\s*#?([0-9A-Za-z-]+)', clean_lines, re.IGNORECASE)
    if inv_match:
        transaction_code = inv_match.group(1).strip()

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form6_generic(clean_lines, email_from):
    """
    FORM 6: Generic Fallback Parser
    """
    is_expense = True
    amount = 0.0
    vendor = 'Unknown'
    note = ''
    transaction_code = None
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')

    amount_match = re.search(r'([\+\-])?\s*(?:VND|₫|đ)?\s*([0-9.,]+)\s*(?:VND|₫|đ)', clean_lines, re.IGNORECASE)
    if amount_match:
        if amount_match.group(1) == '+':
            is_expense = False
        raw_amt = amount_match.group(2).replace(',', '').replace('.', '')
        try:
            amount = float(raw_amt)
        except ValueError:
            pass
    else:
        amt_fallback = re.search(r'(?:Charged|Số tiền|Số tiền thanh toán):?\s*[₫đ]?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
        if amt_fallback:
            raw_amt = amt_fallback.group(1).replace(',', '').replace('.', '')
            try:
                amount = float(raw_amt)
            except ValueError:
                pass

    note_match = re.search(r'(?:Nội dung|Noidung|Description|Chi tiết):?\s*([^\n]+)', clean_lines, re.IGNORECASE)
    if note_match:
        note = note_match.group(1).strip()

    payee_match = re.search(r'thanh toan tai\s+([A-Za-z0-9\s]+)', note, re.IGNORECASE)
    if payee_match:
        vendor = payee_match.group(1).strip()
    else:
        neo_match = re.search(r'Tên người hưởng:?\s*([^\n]+)', clean_lines, re.IGNORECASE)
        if neo_match:
            vendor = neo_match.group(1).strip()
        elif 'canva' in email_from.lower():
            vendor = 'Canva'

    code_match = re.search(r'(?:Mã giao dịch|Transaction code|Mã GD|Mã tham chiếu|Trace):?\s*([A-Za-z0-9/_-]+)', clean_lines, re.IGNORECASE)
    if code_match:
        transaction_code = code_match.group(1).strip()

    paymentmethod = 'Chuyển khoản'
    if re.search(r'Credit card|The\s+\d{4}|POS|Visa|Mastercard', clean_lines, re.IGNORECASE):
        paymentmethod = 'Credit card'
    elif 'momo' in clean_lines.lower():
        paymentmethod = 'Momo'
    elif 'cash' in clean_lines.lower():
        paymentmethod = 'Cash'

    date_match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines)
    if date_match:
        date_str = f'{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}'

    trans_type = 'expense' if is_expense else 'income'
    return (trans_type, amount, vendor, note, date_str, transaction_code, paymentmethod)


def extract_raw_transaction(text, email_from):
    """
    MAIN FORM ROUTER
    Identifies signature features of incoming emails and routes directly to the specialized parser.
    """
    text_clean = text.replace('\r', '')
    clean_lines = re.sub(r'<[^>]+>', '\n', text_clean)
    clean_lines = re.sub(r'\n+', '\n', clean_lines)
    lower_clean = clean_lines.lower()
    lower_raw = text_clean.lower()
    lower_from = email_from.lower() if email_from else ''

    # FORM 1: VPBank Debit Card / Balance Changed
    if ('balance changed' in lower_clean or 'biến động số dư' in lower_clean) and \
       ('thẻ ghi nợ' in lower_clean or 'debit' in lower_clean or 'thẻ ghi nợ' in lower_raw):
        res = _parse_form1_vpbank_debit(clean_lines)
        if res and res[1] > 0:
            return res

    # FORM 2: VPBank NEO Internet Banking Transfer
    if 'vpb.neo' in lower_from or 'vpbank neo' in lower_clean or 'nội dung chuyển tiền:' in lower_clean or 'thông báo chuyển tiền' in lower_clean:
        res = _parse_form2_vpbank_neo(clean_lines)
        if res and res[1] > 0:
            return res

    # FORM 3: VPBank Credit Card Alert
    if 'thẻ tín dụng' in lower_clean or 'thẻ tín dụng' in lower_raw or \
       re.search(r'gd thanh toan tai', clean_lines, re.IGNORECASE) or \
       re.search(r'the\s+\d{4}x+\d{4}', clean_lines, re.IGNORECASE):
        res = _parse_form3_vpbank_credit(clean_lines)
        if res and res[1] > 0:
            return res

    # FORM 4: MoMo
    if 'momo.vn' in lower_from or 'mã giao dịch momo' in lower_clean or 'ví momo' in lower_clean:
        res = _parse_form4_momo(clean_lines)
        if res and res[1] > 0:
            return res

    # FORM 5: SaaS & AI Tools
    if 'canva' in lower_from or 'openai' in lower_from or 'invoice' in lower_clean:
        res = _parse_form5_saas(clean_lines, email_from)
        if res and res[1] > 0:
            return res

    # FORM 6: Fallback Generic
    return _parse_form6_generic(clean_lines, email_from)


# =====================================================================
# TẦNG 2: FORM PHÂN LOẠI NGHIỆP VỤ THÔNG MINH (SMART RULES ROUTER)
# =====================================================================

def classify_expense_smart_rules(date_str, amount, vendor, note, payees_map=None, active_projects=None, parsed_paymentmethod=None):
    """
    Business Rules Router ("Điểm đặc biệt"):
    Matches transactions against specialized domain forms to auto-resolve Project & Category
    without bothering the CEO for recurring or obvious items.
    """
    v_clean = vendor.strip() if vendor else "Unknown"
    n_clean = note.strip() if note else ""
    comb_text = f"{v_clean} {n_clean}".lower()
    
    paymentmethod = parsed_paymentmethod if parsed_paymentmethod else "Chuyển khoản"
    
    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 1: HỌC PHÍ CHO HẠ (TUITION FOR HA)
    # Rút ATM hoặc nộp học, số tiền 7.000.000 - 9.500.000đ, ngày 1 - 15 hàng tháng
    # -------------------------------------------------------------
    day_num = 0
    try:
        if date_str:
            day_num = int(date_str.split('-')[2])
    except Exception:
        pass
        
    is_atm_or_school = any(k in comb_text for k in ['rut tien tai atm', 'atm', 'dong tien hoc', 'tien hoc', 'học phí'])
    if is_atm_or_school and (7000000 <= amount <= 9500000) and (1 <= day_num <= 15 or day_num == 0):
        return {
            "category": "Gia đình & Định kỳ",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": "Cash",
            "vendor": "Đóng tiền học cho Hạ",
            "description": "Rút tiền đóng tiền học cho Hạ",
            "auto_classified": True,
            "rule_matched": "Form Học phí Hạ (Định kỳ đầu tháng)"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 2: FREELANCE THEO DỰ ÁN
    # Có chữ 'freelance' trong nội dung và nhắc đến tên dự án
    # -------------------------------------------------------------
    if 'freelance' in comb_text:
        matched_proj = None
        projects_to_check = active_projects if active_projects else get_all_projects()
        for p in projects_to_check:
            p_name = p.get('name', '').lower()
            if len(p_name) >= 3 and p_name in comb_text:
                matched_proj = p
                break
            p_clean = p_name.replace(' ', '')
            if len(p_clean) >= 4 and p_clean in comb_text.replace(' ', ''):
                matched_proj = p
                break

        if matched_proj:
            return {
                "category": "Freelancer",
                "project_id": matched_proj['id'],
                "paymentmethod": paymentmethod,
                "vendor": v_clean,
                "description": n_clean,
                "auto_classified": True,
                "rule_matched": f"Form Freelancer (Khớp dự án {matched_proj['name']})"
            }
        else:
            return {
                "category": "Freelancer",
                "project_id": None,
                "paymentmethod": paymentmethod,
                "vendor": v_clean,
                "description": n_clean,
                "auto_classified": False,
                "rule_matched": "Form Freelancer (Chưa rõ dự án)"
            }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 3: F&B / ĂN UỐNG / GẶP MẶT
    # -------------------------------------------------------------
    fnb_keywords = [
        'sukiya', 'unatoto', 'dotori', 'highland', 'starbuck', 'phuc long', 'katinat', 
        'koi the', 'haidilao', 'pizza', 'golden gate', 'pho ', 'banh bo', 'quan nhat', 
        'com tam', 'coffee', 'cafe', 'tra sua', 'kfc', 'lotteria', 'mcdonald'
    ]
    if any(k in comb_text for k in fnb_keywords):
        return {
            "category": "Food / Meeting",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Ăn uống / Cafe tại {v_clean}",
            "auto_classified": True,
            "rule_matched": "Form F&B / Ăn uống cá nhân"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 4: SAAS & AI TOOLS CÔNG TY
    # -------------------------------------------------------------
    ai_keywords = ['openai', 'chatgpt', 'canva', 'midjourney', 'cursor', 'claude', 'anthropic', 'elevenlabs', 'runway', 'luma', 'pika']
    saas_keywords = ['github', 'google workspace', 'adobe', 'figma', 'notion', 'apple.com/bill', 'zoom', 'hostinger', 'godaddy']
    
    if any(k in comb_text for k in ai_keywords):
        return {
            "category": "AI tools",
            "project_id": "proj_congty",
            "paymentmethod": "Credit card",
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Chi phí AI {v_clean}",
            "auto_classified": True,
            "rule_matched": "Form AI Tools Công ty"
        }
    if any(k in comb_text for k in saas_keywords):
        return {
            "category": "Software / SaaS",
            "project_id": "proj_congty",
            "paymentmethod": "Credit card",
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Phần mềm {v_clean}",
            "auto_classified": True,
            "rule_matched": "Form Software / SaaS Công ty"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 5: KHỚP VỚI BẢNG PAYEES TRONG DATABASE
    # -------------------------------------------------------------
    if payees_map:
        v_lower = v_clean.lower()
        matched_p = None
        if v_lower in payees_map:
            matched_p = payees_map[v_lower]
        else:
            for alias_key, p_info in payees_map.items():
                if len(alias_key) >= 3 and alias_key in v_lower:
                    matched_p = p_info
                    break

        if matched_p:
            p_cat = matched_p.get("default_category", "Other")
            p_proj = matched_p.get("default_project_id", None)
            p_method = matched_p.get("default_method", paymentmethod)
            if p_proj:
                return {
                    "category": p_cat,
                    "project_id": p_proj,
                    "paymentmethod": p_method,
                    "vendor": v_clean,
                    "description": n_clean,
                    "auto_classified": True,
                    "rule_matched": f"Form Payee ({matched_p.get('vendor')})"
                }
            else:
                return {
                    "category": p_cat,
                    "project_id": None,
                    "paymentmethod": p_method,
                    "vendor": v_clean,
                    "description": n_clean,
                    "auto_classified": False,
                    "rule_matched": f"Form Payee ({matched_p.get('vendor')} - Chưa gán dự án)"
                }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 6: RÚT TIỀN ATM KHÁC
    # -------------------------------------------------------------
    if 'rut tien tai atm' in comb_text or 'atm' in comb_text:
        return {
            "category": "Personal",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": "Cash",
            "vendor": v_clean if v_clean != "Unknown" else "Rút tiền ATM",
            "description": n_clean if n_clean else "Rút tiền mặt ATM",
            "auto_classified": True,
            "rule_matched": "Form Rút tiền mặt cá nhân"
        }

    # FALLBACK
    return {
        "category": "Other",
        "project_id": None,
        "paymentmethod": paymentmethod,
        "vendor": v_clean,
        "description": n_clean,
        "auto_classified": False,
        "rule_matched": "Form Chung (Chưa phân loại)"
    }


# =====================================================================
# CÁC HÀM TIỆN ÍCH DỮ LIỆU
# =====================================================================

def apply_gmail_label(client, msg_id, label_name='Finance_Checked'):
    if ((not client) or (not msg_id)):
        return
    print(f"Đang gán label '{label_name}' cho email {msg_id}...")
    try:
        res = client.tools.execute(slug='gmail_list_labels', arguments={}, user_id='default_user', dangerously_skip_version_check=True)
        label_id = None
        if res.get('successful'):
            labels = res['data'].get('labels', [])
            for lbl in labels:
                if (lbl['name'] == label_name):
                    label_id = lbl['id']
                    break
        if label_id:
            client.tools.execute(slug='gmail_add_label_to_email', arguments={'message_id': msg_id, 'addLabelIds': [label_id], 'removeLabelIds': ['UNREAD']}, user_id='default_user', dangerously_skip_version_check=True)
            print(f'Đã gán label {label_name} thành công.')
            print(f'Đã gỡ nhãn UNREAD cho email {msg_id}.')
        else:
            print(f'Không tìm thấy label {label_name} trong tài khoản Gmail.')
    except Exception as e:
        print(f'Lỗi khi gán nhãn: {e}')

def get_active_projects():
    return execute_query("SELECT id, name FROM projects WHERE status IN ('Đang làm', 'Chờ feedback', 'Cần revise')", fetch=True) or []

def get_all_projects():
    return execute_query("SELECT id, name FROM projects", fetch=True) or []

def normalize_text(text):
    if not text:
        return ''
    return text.strip().lower()

def get_payees():
    payees_map = {}
    res = execute_query('SELECT vendor, alias, default_category, default_project_id, default_method FROM payees', fetch=True) or []
    for p in res:
        v = p['vendor']
        payees_map[normalize_text(v)] = p
        if p.get('alias'):
            aliases = [a.strip() for a in p['alias'].split(',')]
            for a in aliases:
                payees_map[normalize_text(a)] = p
    return payees_map
