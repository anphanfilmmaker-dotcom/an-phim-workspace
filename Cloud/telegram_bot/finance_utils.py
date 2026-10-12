import re
import datetime
import sys
import os

# Ensure UTF-8 output on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure we can import db_connection or fallback to tram_anh_bot
try:
    from db_connection import execute_query
except ImportError:
    try:
        from tram_anh_bot import execute_query
    except ImportError:
        def execute_query(*args, **kwargs):
            return None

# =====================================================================
# TẦNG 1: FORM ROUTER BÓC TÁCH EMAIL (PARSER PIPELINE)
# =====================================================================

def _parse_form0_non_transaction(subject, text_clean):
    """
    FORM 0: NON-TRANSACTION GATEKEEPER
    Nhận diện ngay lập tức các email quảng cáo, thông báo nâng cấp, cảnh báo lừa đảo.
    Bỏ qua nhanh trong 0.001s, không để lọt vào parser giao dịch.
    """
    s_low = (subject or "").lower()
    t_low = (text_clean or "").lower()
    
    non_tx_keywords = [
        '[qc]', 'quảng cáo', 'khuyến mại', 'hoàn tiền kép', 'thưởng thức quán ngon',
        'tạm gián đoạn', 'nâng cấp hệ thống', 'cảnh báo lừa đảo', 'đánh tráo chip',
        'thủ đoạn lừa đảo', 'chiêu thức lừa đảo', 'chúc mừng sinh nhật', 'bảo mật tài khoản',
        'chúc mừng năm mới', 'tri ân khách hàng', 'ưu đãi đặc biệt'
    ]
    for kw in non_tx_keywords:
        if kw in s_low:
            return ("ignored", 0.0, "Non-transaction", f"Bỏ qua email phi giao dịch ({kw}): {subject}", datetime.date.today().strftime('%Y-%m-%d'), None, None)
            
    # If subject says notice/warning and has no amount or balance change keywords
    if any(k in s_low for k in ['thông báo:', 'cảnh báo:', 'tin tức']) and not any(k in s_low or k in t_low[:600] for k in ['vnd', 'đ', '₫', 'usd', '$', 'thay đổi số dư', 'biến động', 'số tiền']):
        return ("ignored", 0.0, "Non-transaction", f"Bỏ qua email phi giao dịch: {subject}", datetime.date.today().strftime('%Y-%m-%d'), None, None)
        
    return None


def parse_money_amount(raw_amt_str):
    """
    Chuẩn hóa và chuyển đổi chuỗi số tiền Việt Nam / Quốc tế thành float an toàn tuyệt đối.
    Xử lý triệt để:
    - Tránh bug nhân 100 lần khi có số thập phân .00 hoặc ,00 (ví dụ: '468,000.00' -> 468000.0)
    - Xử lý định dạng VN: '468.000' -> 468000.0
    - Xử lý định dạng QT: '468,000' -> 468000.0
    """
    if not raw_amt_str:
        return 0.0
    s = str(raw_amt_str).strip()
    s = re.sub(r'(?i)(vnd|đ|₫|\$|\s)', '', s)
    # Loại bỏ phần thập phân xu/cents .00 hoặc ,00 ở cuối
    s = re.sub(r'[.,]00$', '', s)
    if ',' in s and '.' in s:
        if s.rfind('.') > s.rfind(','):
            s = s.replace(',', '')
        else:
            s = s.replace('.', '').replace(',', '.')
    else:
        s = s.replace(',', '').replace('.', '')
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_form1_vpbank_debit(clean_lines):
    """
    FORM 1: VPBank Thẻ Ghi Nợ / Biến động số dư (Debit Card / ATM)
    Bóc tách trực tiếp theo cấu trúc cặp nhãn trong bảng thông báo của VPBank.
    """
    is_expense = True
    amount = 0.0
    vendor = "VPBank"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Cash"

    lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]

    for i, line in enumerate(lines):
        line_l = line.lower()
        
        # 1. Số tiền thay đổi
        if "số tiền thay đổi" in line_l or "changed amount" in line_l:
            for j in range(max(0, i-3), i):
                m = re.search(r'([+\-])?\s*([0-9.,]+)\s*(?:vnd)?', lines[j], re.IGNORECASE)
                if m and any(c.isdigit() for c in lines[j]):
                    sign = m.group(1) if m.group(1) else '-'
                    is_expense = (sign == '-')
                    parsed_amt = parse_money_amount(m.group(2))
                    if parsed_amt > 0:
                        amount = parsed_amt
                        break

        # 2. Nội dung giao dịch
        if "nội dung" in line_l or "transaction content" in line_l or (line_l.startswith("nội") and i+1 < len(lines) and "dung" in lines[i+1].lower()):
            for j in range(i-1, max(-1, i-6), -1):
                lj = lines[j].strip().lower()
                if lj and not any(k in lj for k in ["số tiền", "changed amount", "vnd", "nội", "dung", "transaction", "content"]):
                    note = lines[j].strip()
                    break

        # 3. Thời gian
        if "thời gian" in line_l or "time" in line_l:
            for j in range(max(0, i-2), min(len(lines), i+3)):
                tm = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', lines[j])
                if tm:
                    date_str = f"{tm.group(3)}-{tm.group(2)}-{tm.group(1)}"
                    break

        # 4. Mã giao dịch
        if "mã giao dịch" in line_l or "transaction code" in line_l:
            for j in range(max(0, i-2), min(len(lines), i+3)):
                cm = re.search(r'\b(FT[0-9A-Za-z]+)\b', lines[j])
                if cm:
                    transaction_code = cm.group(1).strip()
                    break
                else:
                    cm2 = re.search(r'\b([0-9A-Za-z]{10,})\b', lines[j])
                    if cm2 and not any(w in lines[j].lower() for w in ["transaction", "giao dịch", "mã"]):
                        transaction_code = cm2.group(1).strip()
                        break

    if note:
        raw_upper = note.upper()
        if "RUT TIEN TAI ATM" in raw_upper:
            paymentmethod = "Cash"
            atm_loc = re.search(r'tai\s+(?:ATM\s+)?(VPBANK[A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', note, re.IGNORECASE)
            if not atm_loc:
                atm_loc = re.search(r'tai\s+([A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', note, re.IGNORECASE)
            vendor = atm_loc.group(1).strip() if atm_loc else "ATM VPBank"
        elif "thanh toan tai" in note.lower() or "gd thanh toan" in note.lower():
            paymentmethod = "Credit card"
            pos_loc = re.search(r'tai\s+([A-Za-z0-9\s.,_-]+?)(?:\s+luc|\s*$)', note, re.IGNORECASE)
            vendor = pos_loc.group(1).strip() if pos_loc else "VPBank POS"
        else:
            paymentmethod = "Chuyển khoản"
            vendor = "VPBank"

    trans_type = "expense" if is_expense else "income"
    return (trans_type, amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form2_vpbank_neo(clean_lines):
    """
    FORM 2: VPBank NEO - Chuyển tiền Internet Banking & Thanh toán QRPay / VNPay
    """
    amount = 0.0
    vendor = "VPBank NEO"
    note = ""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Chuyển khoản"
    is_expense = True

    lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]

    for i, line in enumerate(lines):
        line_l = line.lower()
        
        # Số tiền: bỏ qua nếu là dòng phí
        if any(k in line_l for k in ["số tiền", "so tien", "số tiền trích nợ", "số tiền ghi có", "số tiền thanh toán"]):
            if any(k in line_l for k in ["phí", "fee", "loại phí"]):
                continue
            if "ghi có" in line_l or "nhận tiền" in line_l:
                is_expense = False
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                if any(k in lines[check_idx].lower() for k in ["số tiền phí", "fee amount", "0 vnd", "0.00"]):
                    continue
                m = re.search(r'([+\-])?\s*([0-9.,]+)\s*(?:vnd|đ|₫)?', lines[check_idx], re.IGNORECASE)
                if m and any(c.isdigit() for c in lines[check_idx]):
                    parsed_amt = parse_money_amount(m.group(2))
                    if parsed_amt > 0:
                        amount = parsed_amt
                        break

        # Tên người hưởng / Người nhận
        if any(k in line_l for k in ["tên người hưởng", "người thụ hưởng", "người nhận", "beneficiary name"]):
            if ":" in line:
                val = line.split(":", 1)[1].strip()
                if val: vendor = val
            elif i + 1 < len(lines):
                vendor = lines[i+1].strip()

        # Dịch vụ thanh toán / Nhà cung cấp (QRPay, VNPay, Biller...)
        if any(k in line_l for k in ["dịch vụ thanh toán", "dich vu thanh toan", "nhà cung cấp", "nha cung cap", "biller"]):
            if ":" in line:
                val = line.split(":", 1)[1].strip()
                if val and val.lower() not in ["thanh toán qrpay", "qrpay"]:
                    vendor = val
                elif not vendor or vendor == "VPBank NEO":
                    vendor = "VNPay (QRPay)"
            elif i + 1 < len(lines):
                val = lines[i+1].strip()
                if val:
                    if val.lower() == "vnpay":
                        vendor = "VNPay (QRPay)"
                    elif val.lower() not in ["billing category", "biller", "thanh toán qrpay"]:
                        vendor = val

        # Nội dung chuyển tiền
        if any(k in line_l for k in ["nội dung chuyển tiền", "nội dung", "details of payment"]):
            if ":" in line:
                val = line.split(":", 1)[1].strip()
                if val: note = val
            elif i + 1 < len(lines):
                note = lines[i+1].strip()

        # Mã giao dịch / Trace
        if any(k in line_l for k in ["mã giao dịch", "mã gd", "mã tham chiếu", "trace"]):
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                m = re.search(r'\b([A-Za-z0-9/_-]{8,})\b', lines[check_idx])
                if m:
                    transaction_code = m.group(1).strip()
                    break

        # Ngày giờ
        if any(k in line_l for k in ["ngày, giờ", "ngày giao dịch", "thời gian"]):
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                tm = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', lines[check_idx])
                if tm:
                    date_str = f"{tm.group(3)}-{tm.group(2)}-{tm.group(1)}"
                    break

    if not note and "qrpay" in clean_lines.lower():
        note = f"Thanh toán QRPay qua {vendor}"

    trans_type = "expense" if is_expense else "income"
    return (trans_type, amount, vendor, note, date_str, transaction_code, paymentmethod)


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

    lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]

    for i, line in enumerate(lines):
        line_l = line.lower()

        # Số tiền
        if any(k in line_l for k in ["số tiền", "so tien", "charged"]):
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                m = re.search(r'([0-9.,]+)\s*(?:vnd|đ|₫)?', lines[check_idx], re.IGNORECASE)
                if m and any(c.isdigit() for c in lines[check_idx]):
                    parsed_amt = parse_money_amount(m.group(1))
                    if parsed_amt > 0:
                        amount = parsed_amt
                        break

        # Địa điểm thanh toán / Vendor
        if "thanh toan tai" in line_l or "gd thanh toan" in line_l:
            m = re.search(r'tai\s+([A-Za-z0-9\s.,&_-]+?)(?:\s+so\s+tien|\s+số\s+tiền|\s+luc|\s*$)', line, re.IGNORECASE)
            if m:
                vendor = m.group(1).strip()
                note = f"Thanh toán thẻ tại {vendor}"
            else:
                note = line

        # Mã giao dịch
        if any(k in line_l for k in ["mã giao dịch", "mã gd", "trace"]):
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                m = re.search(r'\b([A-Za-z0-9/_-]{6,})\b', lines[check_idx])
                if m:
                    transaction_code = m.group(1).strip()
                    break

        # Thời gian
        if "luc" in line_l or "thời gian" in line_l:
            tm = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', line)
            if tm:
                date_str = f"{tm.group(3)}-{tm.group(2)}-{tm.group(1)}"

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

    lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]

    for i, line in enumerate(lines):
        line_l = line.lower()

        # Số tiền
        if "số tiền" in line_l or "so tien" in line_l:
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                m = re.search(r'([0-9.,]+)\s*(?:đ|vnd|₫)?', lines[check_idx], re.IGNORECASE)
                if m and any(c.isdigit() for c in lines[check_idx]):
                    parsed_amt = parse_money_amount(m.group(1))
                    if parsed_amt > 0:
                        amount = parsed_amt
                        break

        # Dịch vụ / Nhà cung cấp
        if any(k in line_l for k in ["dịch vụ", "dich vu", "nhà cung cấp"]):
            if ":" in line:
                val = line.split(":", 1)[1].strip()
                if val:
                    vendor = val
                    note = f"Thanh toán MoMo {val}"
            elif i + 1 < len(lines):
                val = lines[i+1].strip()
                vendor = val
                note = f"Thanh toán MoMo {val}"

        # Mã giao dịch MoMo
        if "mã giao dịch" in line_l or "ma giao dich" in line_l:
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                m = re.search(r'\b([0-9A-Za-z]{8,})\b', lines[check_idx])
                if m:
                    transaction_code = m.group(1).strip()
                    break

        # Thời gian
        if "thời gian" in line_l or "thoi gian" in line_l:
            for check_idx in ([i, i+1] if i+1 < len(lines) else [i]):
                tm = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', lines[check_idx])
                if tm:
                    date_str = f"{tm.group(3)}-{tm.group(2)}-{tm.group(1)}"
                    break

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form5_saas(clean_lines, email_from):
    """
    FORM 5: Hóa đơn SaaS / Dịch vụ AI (Canva, OpenAI, Adobe, Cursor, Midjourney...)
    """
    amount = 0.0
    vendor = "SaaS"
    note = "Phần mềm dịch vụ"
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    transaction_code = None
    paymentmethod = "Credit card"

    if 'canva' in email_from.lower():
        vendor = "Canva"
        note = "Canva Pro" if "canva pro" in clean_lines.lower() else "Canva Subscription"
    elif 'openai' in email_from.lower():
        vendor = "OpenAI"
        note = "OpenAI API / ChatGPT"

    amt_match = re.search(r'(?:total|amount paid|charged|tổng cộng|số tiền):?\s*[$₫đ]?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
    if amt_match:
        amount = parse_money_amount(amt_match.group(1))

    # Extract invoice ID (ensure it starts with or contains numbers, avoiding 'Your')
    inv_match = re.search(r'(?:Invoice(?:\s*number)?|Order ID|Mã hóa đơn|Invoice\s*#)[\s:\n]*#?\s*([0-9][0-9A-Za-z_-]{3,})', clean_lines, re.IGNORECASE)
    if inv_match:
        transaction_code = inv_match.group(1).strip()
    else:
        lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]
        for i, l in enumerate(lines):
            if l.lower() == 'invoice' and i + 1 < len(lines):
                next_l = lines[i+1].strip()
                if re.match(r'^[0-9][0-9A-Za-z_-]{3,}$', next_l):
                    transaction_code = next_l
                    break

    # Date
    date_match = re.search(r'([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})', clean_lines)
    if date_match:
        try:
            parsed_dt = datetime.datetime.strptime(date_match.group(1).replace(',', ''), "%b %d %Y")
            date_str = parsed_dt.strftime('%Y-%m-%d')
        except Exception:
            pass
    if not date_match:
        d_match = re.search(r'(\d{2})[-/](\d{2})[-/](\d{4})', clean_lines)
        if d_match:
            date_str = f"{d_match.group(3)}-{d_match.group(2)}-{d_match.group(1)}"

    # Payment method
    if 'momo' in clean_lines.lower():
        paymentmethod = 'Momo'
    elif any(k in clean_lines.lower() for k in ['credit', 'visa', 'mastercard', 'thẻ tín dụng', 'the tin dung']):
        paymentmethod = 'Credit card'

    return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)


def _parse_form_capcut_pipopay(clean_lines, email_from):
    """
    FORM 5B: CapCut / PipoPay (ByteDance)
    Tự động truy vấn session từ PipoPay API và trích xuất hóa đơn PDF.
    """
    import zlib
    import requests
    import base64
    import json
    
    url_m = re.search(r'https://[^\s"\'<>]*pipopay\.com/pipo_fe/invoice/preview[^\s"\'<>]*', clean_lines)
    if not url_m:
        return None
        
    preview_url = url_m.group(0)
    try:
        s = requests.Session()
        r = s.get(preview_url, timeout=10)
        m = re.findall(r'window\.__PIPO_INVOICE_SESSION__\s*=\s*(\{.*?\});', r.text)
        if not m:
            return None
        session_obj = json.loads(m[0])
        session_id = session_obj.get("session_id")
        if not session_id:
            return None

        trade_id = re.search(r'trade_id=([^&]+)', preview_url)
        merchant_id = re.search(r'merchant_id=([^&]+)', preview_url)
        trade_type = re.search(r'trade_type=([^&]+)', preview_url)
        scenario_type = re.search(r'scenario_type=([^&]+)', preview_url)

        headers = {
            "pipo-fp-session-id": session_id,
            "Content-Type": "application/json",
            "Origin": "https://cashier-my4a.pipopay.com",
            "Referer": preview_url,
            "User-Agent": "Mozilla/5.0"
        }

        download_payload = {
            "trade_id": trade_id.group(1) if trade_id else "",
            "trade_type": trade_type.group(1) if trade_type else "Payin",
            "merchant_id": merchant_id.group(1) if merchant_id else "",
            "scenario_type": scenario_type.group(1) if scenario_type else "9",
            "invoice_type": 2
        }

        res = s.post("https://cashier-my4a.pipopay.com/pipo_fe/invoice/api/download_invoice_v2", headers=headers, json=download_payload, timeout=10)
        j = res.json()
        contents = j.get("data", {}).get("contents", [])
        if not contents:
            return None

        item = contents[0]
        transaction_code = item.get("invoice_number") or item.get("trade_id")
        date_str = item.get("invoice_date") or datetime.datetime.now().strftime('%Y-%m-%d')
        
        pdf_b64 = item.get("body", "")
        amount = 0.0
        note = "CapCut Pro Space (ByteDance)"
        vendor = "CapCut"
        paymentmethod = "Momo"

        if pdf_b64:
            pdf_bytes = base64.b64decode(pdf_b64)
            cid_map = {}
            for m_b in re.finditer(rb'stream[\r\n]+(.*?)[\r\n]+endstream', pdf_bytes, re.DOTALL):
                try:
                    dec_s = zlib.decompress(m_b.group(1))
                    for m1 in re.finditer(rb'beginbfrange(.*?)endbfrange', dec_s, re.DOTALL):
                        for line in m1.group(1).decode('latin1', errors='ignore').splitlines():
                            m_range = re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>', line.strip())
                            if m_range:
                                st, en, dst = m_range[0]
                                st_val, en_val, dst_val = int(st, 16), int(en, 16), int(dst, 16)
                                for idx_c in range(en_val - st_val + 1):
                                    cid_map[st_val + idx_c] = chr(dst_val + idx_c)
                    for m2 in re.finditer(rb'beginbfchar(.*?)endbfchar', dec_s, re.DOTALL):
                        for line in m2.group(1).decode('latin1', errors='ignore').splitlines():
                            m_char = re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>', line.strip())
                            if m_char:
                                c, u = m_char[0]
                                cid_map[int(c, 16)] = chr(int(u, 16))
                except Exception:
                    pass

            for m_stream in re.finditer(rb'stream[\r\n]+(.*?)[\r\n]+endstream', pdf_bytes, re.DOTALL):
                try:
                    dec = zlib.decompress(m_stream.group(1))
                    if b'Tj' in dec:
                        for token in re.finditer(rb'<([0-9a-fA-F]+)>\s*Tj', dec):
                            hex_str = token.group(1).decode('ascii')
                            chars = [cid_map.get(int(hex_str[k:k+4], 16), "") for k in range(0, len(hex_str), 4)]
                            line_txt = "".join(chars)
                            m_vnd = re.search(r'([0-9.,]+)\s*VND', line_txt)
                            if m_vnd:
                                try:
                                    val = float(m_vnd.group(1).replace(',', '').replace('.', ''))
                                    if val > amount:
                                        amount = val
                                except Exception:
                                    pass
                            if 'space_' in line_txt:
                                note = f"CapCut Pro Space ({line_txt})"
                except Exception:
                    pass

        return ("expense", amount, vendor, note, date_str, transaction_code, paymentmethod)
    except Exception as e:
        print(f"Lỗi khi phân tích CapCut PipoPay: {e}")
        return None


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
        amount = parse_money_amount(amount_match.group(2))
    else:
        amt_fallback = re.search(r'(?:Charged|Số tiền|Số tiền thanh toán|Số tiền trích nợ):?\s*[₫đ]?\s*([0-9.,]+)', clean_lines, re.IGNORECASE)
        if amt_fallback:
            amount = parse_money_amount(amt_fallback.group(1))

    note_match = re.search(r'(?:Nội dung chuyển tiền|Nội dung|Noidung|Description|Chi tiết):?\s*\n?\s*([^\n]+)', clean_lines, re.IGNORECASE)
    if note_match:
        note = note_match.group(1).strip()
        if note.lower() in ['chuyển tiền:', 'chuyen tien:', 'chuyển tiền', 'chuyen tien']:
            after = clean_lines[note_match.end():].strip().split('\n')
            if after and after[0].strip():
                note = after[0].strip()

    payee_match = re.search(r'thanh toan tai\s+([A-Za-z0-9\s]+)', note, re.IGNORECASE)
    if payee_match:
        vendor = payee_match.group(1).strip()
    else:
        neo_match = re.search(r'Tên người hưởng:?\s*([^\n]+)', clean_lines, re.IGNORECASE)
        if neo_match:
            vendor = neo_match.group(1).strip()
        elif 'canva' in email_from.lower():
            vendor = 'Canva'
        elif any(k in clean_lines.lower() for k in ['vnpay', 'qrpay']):
            vendor = 'VNPay (QRPay)'

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


def extract_raw_transaction(text, email_from, subject=""):
    """
    MAIN FORM ROUTER
    Identifies signature features of incoming emails and routes directly to the specialized parser.
    """
    text_no_script = re.sub(r'(?is)<(style|script).*?>.*?</\1>', ' ', text)
    text_clean = text_no_script.replace('\r', '')
    clean_lines = re.sub(r'<[^>]+>', '\n', text_clean)
    clean_lines = re.sub(r'\n+', '\n', clean_lines)
    lower_clean = clean_lines.lower()
    lower_raw = text_clean.lower()
    lower_from = email_from.lower() if email_from else ''
    
    if not subject:
        first_lines = [l.strip() for l in clean_lines.split('\n') if l.strip()]
        subject = first_lines[0] if first_lines else ""
        
    lower_subj = subject.lower()

    # =========================================================
    # FORM 0: NON-TRANSACTION FILTER (GATEKEEPER)
    # Bỏ qua ngay lập tức các email quảng cáo, bảo trì, cảnh báo
    # =========================================================
    res0 = _parse_form0_non_transaction(subject, lower_clean)
    if res0:
        return res0

    # =========================================================
    # FORM 1: VPBank Debit Card / Biến động số dư thẻ ghi nợ
    # =========================================================
    if ('balance changed' in lower_subj or 'biến động số dư' in lower_subj or 'balance changed' in lower_clean or 'biến động số dư' in lower_clean) and \
       ('thẻ ghi nợ' in lower_clean or 'debit' in lower_clean or 'thẻ ghi nợ' in lower_raw or 'debit' in lower_subj):
        res = _parse_form1_vpbank_debit(clean_lines)
        if res and res[1] > 0:
            return res

    # =========================================================
    # FORM 2: VPBank NEO Internet Banking Transfer
    # =========================================================
    if 'vpb.neo' in lower_from or 'vpbank neo' in lower_subj or 'vpbank neo' in lower_clean or \
       'nội dung chuyển tiền:' in lower_clean or 'thông báo chuyển tiền' in lower_subj or 'kết quả giao dịch' in lower_subj:
        res = _parse_form2_vpbank_neo(clean_lines)
        if res and res[1] > 0:
            return res

    # =========================================================
    # FORM 3: VPBank Credit Card Alert
    # =========================================================
    if 'thẻ tín dụng' in lower_clean or 'thẻ tín dụng' in lower_subj or \
       re.search(r'gd thanh toan tai', clean_lines, re.IGNORECASE) or \
       re.search(r'the\s+\d{4}x+\d{4}', clean_lines, re.IGNORECASE):
        res = _parse_form3_vpbank_credit(clean_lines)
        if res and res[1] > 0:
            return res

    # =========================================================
    # FORM 4: MoMo
    # =========================================================
    if 'momo.vn' in lower_from or 'mã giao dịch momo' in lower_clean or 'ví momo' in lower_clean:
        res = _parse_form4_momo(clean_lines)
        if res and res[1] > 0:
            return res

    # =========================================================
    # FORM 5: SaaS & AI Tools
    # =========================================================
    if 'pipopay.com' in lower_clean or 'capcut' in lower_from or 'capcut' in lower_subj:
        res = _parse_form_capcut_pipopay(clean_lines, email_from)
        if res and res[1] > 0:
            return res

    if 'canva' in lower_from or 'openai' in lower_from or 'invoice' in lower_subj or 'receipt' in lower_subj or 'invoice' in lower_clean:
        res = _parse_form5_saas(clean_lines, email_from)
        if res and res[1] > 0:
            return res

    # =========================================================
    # FORM 6: Fallback Generic
    # =========================================================
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
    # ĐẶC ĐIỂM 3: Y TẾ & SỨC KHỎE (HEALTH CARE)
    # Nhà thuốc Long Châu, Pharmacity, Bệnh viện, Phòng khám...
    # -------------------------------------------------------------
    health_keywords = [
        'long chau', 'long châu', 'nha thuoc', 'nhà thuốc', 'pharmacity', 'an khang', 
        'benh vien', 'bệnh viện', 'phong kham', 'phòng khám', 'bac si', 'bác sĩ', 
        'tiem thuoc', 'thuốc', 'y te', 'y tế', 'medlatec', 'tam anh', 'tâm anh', 
        'hoan my', 'hoàn mỹ', 'vinmec', 'nhi dong', 'nhi đồng', 'tu du', 'từ dũ',
        'rang ham mat', 'răng hàm mặt', 'nha khoa', 'tiem chung', 'tiêm chủng', 'vnvc'
    ]
    if any(k in comb_text for k in health_keywords):
        return {
            "category": "Health Care",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean if v_clean != "Unknown" else "Nhà thuốc / Y tế",
            "description": n_clean if n_clean else f"Khám bệnh / Thuốc men ({v_clean})",
            "auto_classified": True,
            "rule_matched": "Form Sức khỏe & Y tế (Health Care)"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 4: F&B / ĂN UỐNG / GẶP MẶT (CHAGEE, HIGHLANDS, PHÚC LONG...)
    # -------------------------------------------------------------
    fnb_keywords = [
        'sukiya', 'unatoto', 'dotori', 'highland', 'starbuck', 'phuc long', 'phúc long', 
        'katinat', 'koi the', 'haidilao', 'pizza', 'golden gate', 'pho ', 'phở', 'banh bo', 
        'quan nhat', 'quán nhật', 'com tam', 'cơm tấm', 'coffee', 'cafe', 'ca phe', 'cà phê', 
        'tra sua', 'trà sữa', 'kfc', 'lotteria', 'mcdonald', 'jollibee', 'chagee', 'mixue', 
        'gong cha', 'the coffee house', 'cheese coffee', 'trung nguyen', 'tocotoco', 
        'ding tea', 'dookki', 'manwah', 'kichi', 'gogi', 'king bbq', 'bbq', 'lau ', 'lẩu', 
        'quan an', 'quán ăn', 'nha hang', 'nhà hàng', 'banh canh', 'bánh canh', 'bun bo', 
        'bún bò', 'bun cha', 'bún chả', 'banh mi', 'bánh mì', 'an uong', 'ăn uống', 
        'bakery', 'breadtalk', 'tous les jours'
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
    # ĐẶC ĐIỂM 5: MUA SẮM & SIÊU THỊ (SHOPPING)
    # -------------------------------------------------------------
    shopping_keywords = [
        'uniqlo', 'shopee', 'lazada', 'tiki', 'tiktok shop', 'winmart', 'bach hoa xanh', 
        'bách hóa xanh', 'coopmart', 'co.op', 'lotte', 'aeon', 'circle k', 'family mart', 
        '7-eleven', 'gs25', 'ministop', 'the gioi di dong', 'tgdd', 'dien may xanh', 
        'fpt shop', 'cellphones', 'hasaki', 'guardian', 'concung', 'con cưng', 
        'kidsplaza', 'an phuoc', 'canifa', 'routine', 'coolmate', 'yame', 'mua sam', 'sieu thi'
    ]
    if any(k in comb_text for k in shopping_keywords):
        return {
            "category": "Shopping",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Mua sắm tại {v_clean}",
            "auto_classified": True,
            "rule_matched": "Form Mua sắm & Siêu thị (Shopping)"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 6: DI CHUYỂN / ĐI LẠI (TRANSPORT)
    # -------------------------------------------------------------
    transit_keywords = [
        'grab', 'be ', 'be group', 'xanh sm', 'mai linh', 'vinasun', 'petrolimex', 
        'xang dau', 'xăng dầu', 'pvoil', 've xe', 've may bay', 'vietnam airlines', 
        'vietjet', 'bamboo airways', 'epass', 'vetc', 'thu phi khong dung', 'tram thu phi'
    ]
    if any(k in comb_text for k in transit_keywords):
        return {
            "category": "Di chuyển",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Di chuyển / Đi lại ({v_clean})",
            "auto_classified": True,
            "rule_matched": "Form Di chuyển / Đi lại"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 7: GIA ĐÌNH & ĐỊNH KỲ (ĐIỆN, NƯỚC, BÔNG, HAHA...)
    # -------------------------------------------------------------
    family_keywords = [
        'dien luc', 'điện lực', 'evn', 'cap nuoc', 'cấp nước', 'sawaco', 'internet', 
        'viettel', 'vnpt', 'fpt telecom', 'phi quan ly', 'phí quản lý', 'chung cu', 
        'tien nha', 'tiền nhà', 'bong', 'bông', 'haha'
    ]
    if any(k in comb_text for k in family_keywords):
        return {
            "category": "Gia đình & Định kỳ",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Chi phí gia đình ({v_clean})",
            "auto_classified": True,
            "rule_matched": "Form Gia đình & Định kỳ"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 8: AI & TOOLS CÔNG TY
    # -------------------------------------------------------------
    ai_tools_keywords = [
        'openai', 'chatgpt', 'canva', 'midjourney', 'cursor', 'claude', 'anthropic', 'elevenlabs', 'runway', 'luma', 'pika',
        'github', 'google workspace', 'adobe', 'figma', 'notion', 'apple.com/bill', 'zoom', 'hostinger', 'godaddy',
        'beeble ai', 'huggingface', 'replicate', 'leonardo'
    ]
    
    if any(k in comb_text for k in ai_tools_keywords):
        return {
            "category": "AI / Tools",
            "project_id": "PROJ-CONGTY",
            "paymentmethod": paymentmethod if paymentmethod in ["Credit card", "Momo"] else "Credit card",
            "vendor": v_clean,
            "description": n_clean if n_clean else f"Chi phí AI / Tools {v_clean}",
            "auto_classified": True,
            "rule_matched": "Form AI / Tools Công ty"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 9: THANH TOÁN VNPAY / QRPAY TIÊU DÙNG CÁ NHÂN (< 2.000.000 VNĐ)
    # -------------------------------------------------------------
    if ('vnpay' in comb_text or 'qrpay' in comb_text) and amount < 2000000:
        return {
            "category": "Personal",
            "project_id": "PROJ-CANHAN",
            "paymentmethod": paymentmethod,
            "vendor": v_clean if v_clean != "Unknown" else "VNPay (QRPay)",
            "description": n_clean if n_clean else "Thanh toán QRPay qua VNPay",
            "auto_classified": True,
            "rule_matched": "Form VNPay / QRPay Tiêu dùng cá nhân"
        }

    # -------------------------------------------------------------
    # ĐẶC ĐIỂM 10: KHỚP VỚI BẢNG PAYEES TRONG DATABASE
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
            if p_proj == 'proj_congty':
                p_proj = 'PROJ-CONGTY'
            elif p_proj == 'proj_canhan':
                p_proj = 'PROJ-CANHAN'

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
    # ĐẶC ĐIỂM 11: RÚT TIỀN ATM KHÁC
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

_CACHED_LABELS = {}

def apply_gmail_label(client, msg_id, label_name='Finance_Checked'):
    if not client or not msg_id:
        return
    print(f"Đang gán label '{label_name}' cho email {msg_id}...")
    try:
        global _CACHED_LABELS
        label_id = _CACHED_LABELS.get(label_name)
        if not label_id:
            res = client.tools.execute(slug='gmail_list_labels', arguments={}, user_id='default_user', dangerously_skip_version_check=True)
            if res.get('successful'):
                labels = res['data'].get('labels', [])
                for lbl in labels:
                    _CACHED_LABELS[lbl['name']] = lbl['id']
                    if lbl['name'] == label_name:
                        label_id = lbl['id']
        if label_id:
            client.tools.execute(slug='gmail_add_label_to_email', arguments={'message_id': msg_id, 'addLabelIds': [label_id], 'removeLabelIds': ['UNREAD']}, user_id='default_user', dangerously_skip_version_check=True)
            print(f"Đã gán label {label_name} và gỡ UNREAD thành công.")
        else:
            print(f"Không tìm thấy label {label_name} trong tài khoản Gmail.")
    except Exception as e:
        print(f"Lỗi khi gán nhãn: {e}")


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
