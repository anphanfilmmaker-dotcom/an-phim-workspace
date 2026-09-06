import re
import datetime
import sys
import os

# Ensure we can import db_connection from core
core_dir = os.path.join(os.path.dirname(__file__), 'core')
if core_dir not in sys.path:
    sys.path.append(core_dir)

from db_connection import execute_query

def extract_raw_transaction(text, email_from):
    text_clean = text.replace('\r', '')
    import re
    text_clean = re.sub(r'<[^>]+>', '\n', text_clean)
    text_clean = re.sub(r'\n+', '\n', text_clean)
    is_expense = True
    amount = 0
    vendor = 'Unknown'
    note = ''
    transaction_code = None
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    amount_match = re.search('([\+\\-]?)\\s*(?:VND|₫|đ)?\\s*([0-9.,]+)\\s*(?:VND|₫|đ)', text_clean, re.IGNORECASE)
    if amount_match:
        if amount_match.group(1) == '+':
            is_expense = False
        elif ('khoản thanh toán' in amount_match.group(0).lower()) or ('số tiền' in amount_match.group(0).lower()):
            is_expense = True
        amount_str = amount_match.group(2).replace(',', '').replace('.', '')
        try:
            amount = float(amount_str)
        except ValueError:
            pass
    else:
        amount_match = re.search('Charged:\\s*[₫đ]?\\s*([0-9.,]+)', text_clean, re.IGNORECASE)
        if amount_match:
            is_expense = True
            amount_str = amount_match.group(1).replace(',', '').replace('.', '')
            try:
                amount = float(amount_str)
            except ValueError:
                pass
        else:
            amount_match = re.search('Số tiền thanh toán:\\s*([0-9.,]+)', text_clean, re.IGNORECASE)
            if amount_match:
                is_expense = True
                raw_amt = amount_match.group(1)
                if raw_amt.endswith('.00'):
                    raw_amt = raw_amt[:-3]
                amount_str = raw_amt.replace(',', '').replace('.', '')
                try:
                    amount = float(amount_str)
                except ValueError:
                    pass
    trans_type = ('expense' if is_expense else 'income')
    if (amount == 0):
        trans_type = 'unknown'
    note_match = re.search('(Nội dung|Noidung|Description|Chi tiết):\\s*(.*)', text_clean, re.IGNORECASE)
    if note_match:
        note = note_match.group(2).strip()
    else:
        vp_note_match = re.search('Changed Amount\\s*\\n(.*?)\\nNội dung/\\s*Transaction Content', text_clean, re.IGNORECASE)
        if vp_note_match:
            note = vp_note_match.group(1).strip()
        else:
            vp_note_match2 = re.search('Nội dung/\\s*Transaction Content\\s*\\n(.*?)\\n', text_clean, re.IGNORECASE)
            if vp_note_match2:
                note = vp_note_match2.group(1).strip()
            else:
                vp_neo_match = re.search('Nội dung chuyển tiền:\\s*(.*?)\\s*Details of Payment', text_clean, (re.IGNORECASE | re.DOTALL))
                if vp_neo_match:
                    note = vp_neo_match.group(1).strip()
                else:
                    vp_credit_match = re.search('(The \\d{4}x+\\d{4} GD thanh toan tai.*)', text_clean, re.IGNORECASE)
                    if vp_credit_match:
                        note = vp_credit_match.group(1).strip()
                    else:
                        vp_credit_match2 = re.search('(GD thanh toan tai.*)', text_clean, re.IGNORECASE)
                        if vp_credit_match2:
                            note = vp_credit_match2.group(1).strip()
    payee_match = re.search('thanh toan tai\\s+([A-Za-z0-9\\s]+)', note, re.IGNORECASE)
    if payee_match:
        vendor = payee_match.group(1).strip()
    else:
        neo_payee_match = re.search('Tên người hưởng:\\s*(.*?)\\s*Beneficiary Name', text_clean, (re.IGNORECASE | re.DOTALL))
        if neo_payee_match:
            vendor = neo_payee_match.group(1).strip()
        else:
            momo_vendor_match = re.search('Dịch vụ\\s*\\n\\s*(.*?)\\s*\\n', text_clean, re.IGNORECASE)
            if momo_vendor_match:
                vendor = momo_vendor_match.group(1).strip()
            elif 'canva' in email_from.lower():
                vendor = 'Canva'
            else:
                vpqr_match = re.search('Dịch vụ thanh toán:\\s*(.*?)\\s*Nhà cung cấp:\\s*(.*?)\\s*(?:Số tiền phí|Mã hóa đơn)', text_clean, re.IGNORECASE | re.DOTALL)
                if vpqr_match:
                    note = vpqr_match.group(1).strip()
                    vendor = vpqr_match.group(2).strip()
                    
    if (('balance changed' in text_clean.lower()) or ('biến động số dư' in text_clean.lower())):
        dc_amount_match = re.search('([\\+\\-])\\s*([0-9.,]+)\\s*VND\\s*\\n\\s*Số tiền thay đổi', text_clean, re.IGNORECASE)
        if dc_amount_match:
            if (dc_amount_match.group(1) == '-'):
                is_expense = True
            else:
                is_expense = False
            amount_str = dc_amount_match.group(2).replace(',', '').replace('.', '')
            try:
                amount = float(amount_str)
            except ValueError:
                pass
            trans_type = ('expense' if is_expense else 'income')
        dc_note_match = re.search('([^\\n]+)\\s*\\n\\s*Nội dung/\\s*Transaction Content', text_clean, re.IGNORECASE)
        if dc_note_match:
            note = dc_note_match.group(1).strip()
            payee_match = re.search('tai\\s+([A-Za-z0-9\\s]+?)(?:\\s+luc|\\s*$)', note, re.IGNORECASE)
            if payee_match:
                vendor = payee_match.group(1).strip()
        dc_date_match = re.search('(\\d{2})[-/](\\d{2})[-/](\\d{4}).*?\\s*\\n\\s*Thời gian', text_clean, re.IGNORECASE)
        if dc_date_match:
            date_str = f'{dc_date_match.group(3)}-{dc_date_match.group(2)}-{dc_date_match.group(1)}'
        dc_code_match = re.search('([A-Za-z0-9/-]+)\\s*\\n\\s*Mã giao dịch/\\s*Transaction Code', text_clean, re.IGNORECASE)
        if dc_code_match:
            transaction_code = dc_code_match.group(1).strip()
    if (not transaction_code):
        trans_code_match = re.search('(Mã giao dịch|Transaction code|Mã GD|Mã tham chiếu|Mã GD Momo|Mã GD/Trace|Mã giao dịch / Trace)\\s*:?\\s*([A-Za-z0-9/-]+)', text_clean, re.IGNORECASE)
        if trans_code_match:
            transaction_code = trans_code_match.group(2).strip()
        else:
            momo_trans_match = re.search('Mã giao dịch\\s*\\n\\s*([0-9A-Za-z]+)', text_clean, re.IGNORECASE)
            if momo_trans_match:
                transaction_code = momo_trans_match.group(1).strip()
            else:
                inv_match = re.search('Invoice\\s*\\n\\s*([0-9A-Za-z-]+)', text_clean, re.IGNORECASE)
                if inv_match:
                    transaction_code = inv_match.group(1).strip()
    paymentmethod = None
    pw_match = re.search('Paid with\\s*\\n\\s*([A-Za-z]+)', text_clean, re.IGNORECASE)
    if pw_match:
        pm = pw_match.group(1).lower()
        if ('momo' in pm):
            paymentmethod = 'Momo'
        elif (('credit' in pm) or ('visa' in pm) or ('master' in pm)):
            paymentmethod = 'Credit card'
        elif ('cash' in pm):
            paymentmethod = 'Cash'
        else:
            paymentmethod = 'Chuyển khoản'
    elif re.search(r'The\s+\d{4}|POS|quẹt thẻ|Credit card|Visa|Mastercard', text_clean, re.IGNORECASE):
        paymentmethod = 'Credit card'
    elif 'momo' in text_clean.lower():
        paymentmethod = 'Momo'
    else:
        paymentmethod = 'Chuyển khoản'
    if (date_str == datetime.datetime.now().strftime('%Y-%m-%d')):
        date_match = re.search('(\\d{2})[-/](\\d{2})[-/](\\d{4})', text_clean)
        if date_match:
            date_str = f'{date_match.group(3)}-{date_match.group(2)}-{date_match.group(1)}'
        else:
            date_match2 = re.search('(\\d{4})[-/](\\d{2})[-/](\\d{2})', text_clean)
            if date_match2:
                date_str = f'{date_match2.group(1)}-{date_match2.group(2)}-{date_match2.group(3)}'
    return (trans_type, amount, vendor, note, date_str, transaction_code, paymentmethod)

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
    return execute_query("SELECT id, name FROM projects WHERE status IN ('Đang làm', 'Chờ feedback', 'Cần revise')", fetch=True)

def normalize_text(text):
    if (not text):
        return ''
    return text.strip().lower()

def get_payees():
    payees_map = {}
    res = execute_query('SELECT vendor, alias, default_category, default_project_id, default_method FROM payees', fetch=True)
    for p in res:
        v = p['vendor']
        payees_map[normalize_text(v)] = p
        if p.get('alias'):
            aliases = [a.strip() for a in p['alias'].split(',')]
            for a in aliases:
                payees_map[normalize_text(a)] = p
    return payees_map
