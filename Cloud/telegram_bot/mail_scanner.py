#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mail Scanner Module for Trâm Anh Bot
Runs locally or on Cloud VM to scan banking / MoMo / SaaS expense emails.
"""

import os
import sys
import json
import uuid
import hashlib
import re
import datetime
import logging
from dotenv import load_dotenv

logger = logging.getLogger("MailScanner")

# Import helpers from finance_utils
try:
    from finance_utils import (
        extract_raw_transaction,
        apply_gmail_label,
        get_active_projects,
        get_all_projects,
        get_payees,
        classify_expense_smart_rules
    )
except ImportError:
    from .finance_utils import (
        extract_raw_transaction,
        apply_gmail_label,
        get_active_projects,
        get_all_projects,
        get_payees,
        classify_expense_smart_rules
    )

def get_db_executor():
    try:
        from tram_anh_bot import execute_query
        return execute_query
    except Exception:
        try:
            from db_connection import execute_query
            return execute_query
        except Exception:
            return None

def process_single_transaction(date, amount, vendor, note, payees_map, active_projects, trans_type="expense", transaction_code=None, parsed_paymentmethod=None):
    execute_query = get_db_executor()
    if not execute_query:
        return {"status": "error", "message": "No database connection executor found"}

    if trans_type == "income":
        net_amount = int(amount / 1.08)
        uid_str = f"{date}_{vendor}_{amount}".encode('utf-8')
        if transaction_code:
            t_id = "inc_" + transaction_code.replace("/", "_")
        else:
            t_id = "inc_" + hashlib.md5(uid_str).hexdigest()[:12]
            
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
            
        existing = execute_query("SELECT id FROM expenseTransactions WHERE id = %s", (t_id,), fetch=True)
        if existing:
            return {"status": "success", "message": "Transaction already exists, skipped."}
            
        insert_res = execute_query("""
            INSERT INTO expenseTransactions (id, date, vendor, amount, projectid, category, description, paymentmethod)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (t_id, date, vendor_final, amount, project_id, category, note_final, paymentmethod))
        if insert_res is None:
            return {"status": "error", "message": f"Database error inserting {t_id}"}
        
        if not auto_classified:
            task_id = f"act_{uuid.uuid4().hex[:8]}"
            task_title = f"Bổ sung thông tin khoản chi {amount:,} đ cho {vendor_final} ({note_final})"
            task_notes = f"Mã giao dịch: {t_id}. Sếp vui lòng xác nhận Dự án & Hạng mục."
            
            # Kiểm tra xem đã có action cho giao dịch này chưa
            act_exists = execute_query(
                "SELECT id FROM actions WHERE (notes LIKE %s OR title LIKE %s) AND status = 'Pending'",
                (f"%{t_id}%", f"%{t_id}%"),
                fetch=True
            )
            if not act_exists:
                execute_query("""
                    INSERT INTO actions (id, priorityorder, title, projectid, prioritylevel, suggestedagent, status, category, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (task_id, 1, task_title, project_id, "High", "Minh Thu", "Pending", "work", task_notes))
            else:
                task_id = act_exists[0]["id"]

            return {
                "status": "pending_ai",
                "message": f"Cần sếp phân loại ({rule_matched})",
                "amount": amount,
                "vendor": vendor_final,
                "note": note_final,
                "category": category,
                "project_id": project_id,
                "rule_matched": rule_matched,
                "t_id": t_id,
                "action_id": task_id
            }
            
        return {
            "status": "success",
            "message": f"Tự động lưu theo {rule_matched}",
            "amount": amount,
            "vendor": vendor_final,
            "note": note_final,
            "category": category,
            "project_id": project_id,
            "rule_matched": rule_matched,
            "t_id": t_id
        }

def scan_mail_job(limit=30, api_key=None):
    """
    Scans Gmail for expense emails via Composio and records into database.
    Returns dict with status, processed_count, successful_transactions, pending_ai_tasks.
    """
    if not api_key:
        api_key = os.getenv("COMPOSIO_API_KEY")
    if not api_key:
        return {"status": "error", "message": "Missing COMPOSIO_API_KEY"}
    
    try:
        from composio import Composio
        client = Composio(api_key=api_key)
    except Exception as e:
        return {"status": "error", "message": f"Lỗi khởi tạo Composio: {e}"}

    gmail_query = "(from:vpb.neo@vpbank.com.vn OR from:vpbankonline@vpb.com.vn OR from:*@care.vpb.com.vn OR from:no-reply@momo.vn OR from:*@canva.com OR from:*@email.capcut.com OR from:*@capcut.com) -label:Finance_Checked newer_than:30d"
    emails = []
    try:
        res = client.tools.execute(slug="gmail_fetch_emails", arguments={"query": gmail_query, "maxResults": limit}, user_id="default_user", dangerously_skip_version_check=True)
        if isinstance(res, dict) and "data" in res:
            emails = res.get("data", [])
            if isinstance(emails, dict) and "messages" in emails: 
                emails = emails["messages"]
        elif isinstance(res, list): 
            emails = res
        elif isinstance(res, dict) and "messages" in res: 
            emails = res["messages"]
    except Exception as e:
        return {"status": "error", "message": f"Lỗi khi đọc email qua Composio: {e}"}

    payees_map = get_payees()
    active_projects = get_active_projects()

    processed_count = 0
    pending_ai_tasks = []
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
                    if h.get("name", "").lower() == "from": 
                        email_from = h.get("value", "")
            elif isinstance(headers, dict):
                email_from = headers.get("From", headers.get("from", ""))

        full_text = f"{subject}\n{snippet}\n{text_content}"
        trans_type, amount, vendor, note, date_str, transaction_code, parsed_paymentmethod = extract_raw_transaction(full_text, email_from, subject=subject)
        
        if trans_type == "ignored" or amount <= 0:
            apply_gmail_label(client, msg_id, "Finance_Checked")
            continue

        res = process_single_transaction(
            date_str, amount, vendor, note, payees_map, active_projects, 
            trans_type=trans_type, transaction_code=transaction_code, 
            parsed_paymentmethod=parsed_paymentmethod
        )
        
        if res:
            if res.get("status") == "pending_ai":
                pending_ai_tasks.append(res)
                apply_gmail_label(client, msg_id, "Finance_Checked")
                processed_count += 1
            elif res.get("status") == "success":
                if "skipped" not in res.get("message", ""):
                    successful_transactions.append({
                        "amount": amount,
                        "vendor": res.get("vendor", vendor),
                        "note": res.get("note", note),
                        "category": res.get("category", "Chưa rõ"),
                        "project_id": res.get("project_id", "Chưa rõ"),
                        "message": res.get("message"),
                        "t_id": res.get("t_id")
                    })
                    processed_count += 1
                apply_gmail_label(client, msg_id, "Finance_Checked")
            elif res.get("status") == "error":
                logger.error(f"Lỗi khi xử lý email {msg_id}: {res.get('message')}")

    return {
        "status": "success",
        "processed_count": processed_count,
        "successful_transactions": successful_transactions,
        "pending_ai_tasks": pending_ai_tasks
    }
