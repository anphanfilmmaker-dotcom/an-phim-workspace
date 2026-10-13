#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Trâm Anh - AI PM Assistant Bot for Telegram (AI-Powered with Gemini 2.5 Flash)
Running 24/7 on Google Cloud VM
Author: Trâm Anh (An Phim Workspace)
"""

import os
import sys
import time
import json
import uuid
import re
import hashlib
import logging
import threading
import decimal
from datetime import datetime, timedelta, timezone, date
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import telebot
from telebot import types
import google.generativeai as genai

try:
    from mail_scanner import scan_mail_job
except ImportError:
    scan_mail_job = None

# Setup logging
logging.basicConfig(
    format='%(asctime)s [%(levelname)s] %(message)s',
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("TramAnhBot")

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TARGET_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not BOT_TOKEN or not DATABASE_URL:
    logger.error("Missing critical environment variables (TELEGRAM_BOT_TOKEN or DATABASE_URL)!")
    sys.exit(1)

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini AI API configured successfully.")
else:
    logger.warning("GEMINI_API_KEY is not set. Bot will run with fallback rules.")

bot = telebot.TeleBot(BOT_TOKEN)

# Vietnam Timezone (UTC+7)
VN_TZ = timezone(timedelta(hours=7))

def get_now():
    return datetime.now(VN_TZ)

def get_today_str():
    return get_now().strftime('%Y-%m-%d')

# ==================== DATABASE HELPERS ====================

def get_db_connection():
    try:
        return psycopg2.connect(DATABASE_URL, sslmode='require')
    except Exception as e:
        logger.error(f"Error connecting to DB: {e}")
        return None

def execute_query(query, params=None, fetch=False):
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                res = cur.fetchall()
            else:
                res = True
            conn.commit()
        return res
    except Exception as e:
        logger.error(f"DB Query Error: {e} | Query: {query}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def clean_data(data):
    """
    Recursively sanitizes dictionary/list to ensure 100% JSON-serializable types.
    Converts Decimal -> float/int, datetime/date -> ISO string.
    """
    if isinstance(data, list):
        return [clean_data(item) for item in data]
    elif isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            cleaned[k] = clean_data(v)
        return cleaned
    elif isinstance(data, decimal.Decimal):
        return int(data) if data % 1 == 0 else float(data)
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    return data

def safe_json_dumps(obj):
    cleaned = clean_data(obj)
    return json.dumps(cleaned, ensure_ascii=False)

# ==================== TOPICS CONFIGURATION & MANAGEMENT ====================
TOPICS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'topics_config.json')

def load_topics_config():
    if os.path.exists(TOPICS_FILE):
        try:
            with open(TOPICS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading topics_config: {e}")
    return {}

def save_topics_config(cfg):
    try:
        with open(TOPICS_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving topics_config: {e}")

def get_topic_thread_id(topic_key):
    cfg = load_topics_config()
    return cfg.get('topics', {}).get(topic_key)

def get_group_chat_id():
    cfg = load_topics_config()
    return cfg.get('group_chat_id')

def get_notification_targets(topic_key="schedule"):
    """
    Trả về danh sách (chat_id, message_thread_id) để gửi thông báo.
    """
    targets = []
    grp_id = get_group_chat_id()
    thread_id = get_topic_thread_id(topic_key)
    if grp_id and thread_id:
        targets.append((grp_id, thread_id))
    elif TARGET_CHAT_ID:
        targets.append((TARGET_CHAT_ID, None))
    return targets

# Authorization check
def is_authorized(message_or_chat_id, from_user_id=None):
    if not TARGET_CHAT_ID:
        return True

    chat_id = None
    user_id = None

    if hasattr(message_or_chat_id, 'chat'):
        chat_id = message_or_chat_id.chat.id
        if message_or_chat_id.from_user:
            user_id = message_or_chat_id.from_user.id
    else:
        chat_id = message_or_chat_id
        user_id = from_user_id

    # NGUYÊN TẮC BẢO MẬT TUYỆT ĐỐI:
    # Dù ở chat riêng hay trong bất kỳ Group nào, CHỈ DUY NHẤT Sếp An Phan (user_id == TARGET_CHAT_ID) mới ra lệnh được cho Trâm Anh!
    if user_id:
        return str(user_id) == str(TARGET_CHAT_ID)

    return str(chat_id) == str(TARGET_CHAT_ID)

# ==================== SAFE MESSAGE SENDER ====================

def send_safe_message(target, text, reply_markup=None, reply_to_msg_id=None, message_thread_id=None):
    """
    Sends message with markdown formatting.
    If Telegram raises Markdown parsing error, safely falls back to plain text.
    Handles message splitting if length > 4000 characters.
    Automatically respects message_thread_id from target Message object or argument.
    """
    if not text:
        return None

    if hasattr(target, 'chat'):
        chat_id = target.chat.id
        if message_thread_id is None:
            message_thread_id = getattr(target, 'message_thread_id', None)
    else:
        chat_id = target

    # Telegram max limit is 4096 chars
    max_len = 3900
    chunks = [text[i:i+max_len] for i in range(0, len(text), max_len)] if len(text) > max_len else [text]

    last_sent = None
    for idx, chunk in enumerate(chunks):
        markup = reply_markup if idx == len(chunks) - 1 else None
        rep_id = reply_to_msg_id if idx == 0 else None
        try:
            last_sent = bot.send_message(chat_id, chunk, reply_markup=markup, reply_to_message_id=rep_id, message_thread_id=message_thread_id, parse_mode="Markdown")
        except Exception as err:
            logger.warning(f"Markdown send failed ({err}), falling back to plain text...")
            try:
                last_sent = bot.send_message(chat_id, chunk, reply_markup=markup, reply_to_message_id=rep_id, message_thread_id=message_thread_id, parse_mode=None)
            except Exception as e2:
                logger.error(f"Fatal error sending message: {e2}")
    return last_sent

# ==================== AGGREGATED SCHEDULE (WEB DASHBOARD SYNC) ====================

def parse_date_to_yyyy_mm_dd(date_str):
    if not date_str:
        return None
    s = str(date_str).strip()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m:
        d, m_val, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{y:04d}-{m_val:02d}-{d:02d}"
    m2 = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', s)
    if m2:
        y, m_val, d = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        return f"{y:04d}-{m_val:02d}-{d:02d}"
    return None

def get_aggregated_events(start_date_str, end_date_str):
    """
    Hợp nhất Lịch trình (Schedule) + Hạn chót dự án (Projects DueDate) + Cột mốc dự án (Projects Milestones)
    đồng bộ 100% với giao diện Calendar trên Web Dashboard của AN PHIM.
    """
    events = []

    # 1. Base schedule events
    s_rows = execute_query(
        'SELECT id, title, description, "startTime", "endTime", category, status, date FROM schedule WHERE date >= %s AND date <= %s ORDER BY date, "startTime"',
        (start_date_str, end_date_str),
        fetch=True
    ) or []

    for r in s_rows:
        events.append({
            "id": r['id'],
            "title": r['title'],
            "description": r['description'] or '',
            "date": r['date'],
            "startTime": r['startTime'] or '09:00',
            "endTime": r['endTime'] or '10:00',
            "category": r['category'] or 'work',
            "status": r['status'] or 'todo',
            "type": "schedule"
        })

    # 2. Projects Deadlines & Milestones
    projects = execute_query(
        "SELECT id, name, client, status, duedate, milestones FROM projects WHERE status != 'Tạm dừng'",
        fetch=True
    ) or []

    for proj in projects:
        # B. Milestones (Hạn chót dự án đã được thể hiện chính xác qua milestone cuối cùng)

        # B. Milestones
        ms_list = proj.get('milestones')
        if ms_list and isinstance(ms_list, list):
            for idx, ms in enumerate(ms_list):
                ms_date_raw = ms.get('date')
                if ms_date_raw:
                    p_ms = parse_date_to_yyyy_mm_dd(ms_date_raw)
                    if p_ms and start_date_str <= p_ms <= end_date_str:
                        is_completed = ms.get('completed', False) or proj['status'] == 'Hoàn thành'
                        events.append({
                            "id": f"proj_ms_{proj['id']}_{idx}",
                            "title": f"{ms.get('name', 'Milestone')} ({proj['name']})",
                            "description": f"Khách hàng: {proj['client']}",
                            "date": p_ms,
                            "startTime": "09:00",
                            "endTime": "10:00",
                            "category": "milestone",
                            "status": "done" if is_completed else "todo",
                            "type": "project_milestone"
                        })

    # Sort by date, startTime
    events.sort(key=lambda x: (x['date'], x['startTime']))
    return events

# ==================== GEMINI AI TOOLS ====================

def get_schedule(target_date: str = None, days_ahead: int = 0, days_count: int = 1):
    """
    Tra cứu lịch trình, công việc, deadline và cột mốc dự án (đồng bộ với Web Calendar).
    - target_date: Ngày bắt đầu cụ thể định dạng YYYY-MM-DD (ví dụ '2026-09-23'). Nếu để trống sẽ lấy từ ngày hiện tại + days_ahead.
    - days_ahead: Số ngày tính từ hôm nay nếu không truyền target_date (0: hôm nay, 1: ngày mai, 2: ngày kia).
    - days_count: Số ngày cần xem liên tiếp tính từ ngày bắt đầu (mặc định 1 ngày. Nếu xem cả tuần thì truyền 7).
    """
    now = get_now()
    if target_date:
        start_date = target_date.strip()
    else:
        start_date = (now + timedelta(days=days_ahead)).strftime('%Y-%m-%d')

    if days_count > 1:
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = (start_dt + timedelta(days=days_count - 1)).strftime('%Y-%m-%d')
    else:
        end_date = start_date

    events = get_aggregated_events(start_date, end_date)
    if not events:
        return f"Không có lịch trình hay mốc dự án nào từ {start_date} đến {end_date}."

    return safe_json_dumps({
        "from_date": start_date,
        "to_date": end_date,
        "total_tasks": len(events),
        "tasks": clean_data(events)
    })

def create_schedule_task(title: str, date: str, start_time: str = "09:00", end_time: str = None, category: str = "work", description: str = ""):
    """
    Tạo lịch hẹn hoặc công việc mới vào cơ sở dữ liệu schedule.
    CHỈ gọi hàm này khi người dùng thực sự yêu cầu note việc, hẹn giờ hoặc tạo công việc cần làm.
    - title: Tên công việc hoặc cuộc hẹn.
    - date: Định dạng YYYY-MM-DD (ví dụ '2026-09-23').
    - start_time: Định dạng HH:MM (ví dụ '09:00', '14:30').
    - end_time: Định dạng HH:MM (ví dụ '10:00', '15:30'). Nếu không truyền, mặc định là 1 tiếng sau start_time.
    - category: Một trong các giá trị: 'work', 'meeting', 'personal', 'finance'.
    - description: Chi tiết bổ sung nếu có.
    """
    task_id = f"sch_{uuid.uuid4().hex[:8]}"
    query = """
        INSERT INTO schedule (id, title, description, "startTime", "endTime", date, category, priority, status, owner, agent, "projectId")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    if not end_time or end_time == "10:00":
        try:
            st = datetime.strptime(start_time, '%H:%M')
            if not end_time or datetime.strptime(end_time, '%H:%M') <= st:
                end_time = (st + timedelta(hours=1)).strftime('%H:%M')
        except Exception:
            if not end_time:
                end_time = "10:00"

    desc = description or f"Ghi chú qua Telegram lúc {get_now().strftime('%H:%M %d/%m/%Y')}"
    params = (
        task_id,
        title,
        desc,
        start_time,
        end_time,
        date,
        category or "work",
        "high",
        "todo",
        "An Phan",
        "Trâm Anh",
        None
    )
    success = execute_query(query, params)
    if success:
        return safe_json_dumps({
            "status": "success",
            "task_id": task_id,
            "title": title,
            "date": date,
            "startTime": start_time,
            "endTime": end_time,
            "category": category,
            "message": f"Đã lưu thành công lịch hẹn '{title}' vào ngày {date} lúc {start_time}-{end_time}."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi lưu vào database schedule."})

def find_schedule_task(search_keyword_or_id: str):
    """
    Tìm kiếm thông minh một task trong schedule bằng task_id hoặc từ khóa tự nhiên.
    Hỗ trợ:
    1. Khớp chính xác ID.
    2. Khớp chuỗi ILIKE nguyên cụm.
    3. Tách từ khóa quan trọng (bỏ các từ nối tiếng Việt: với, cùng, về, cho, của, ở, tại, lại, lịch, cuộc, họp, hẹn...).
    4. Ưu tiên các task chưa hoàn thành ('todo') và gần ngày hôm nay nhất.
    """
    if not search_keyword_or_id:
        return None

    kw = search_keyword_or_id.strip()

    # 1. Exact ID match
    row = execute_query(
        'SELECT id, title, date, "startTime", "endTime", status FROM schedule WHERE id = %s LIMIT 1',
        (kw,),
        fetch=True
    )
    if row:
        return row[0]

    # 2. Exact ILIKE match (ưu tiên task chưa xong 'todo')
    rows = execute_query(
        """SELECT id, title, date, "startTime", "endTime", status FROM schedule 
           WHERE title ILIKE %s 
           ORDER BY CASE WHEN status = 'todo' THEN 0 ELSE 1 END, date DESC LIMIT 1""",
        (f"%{kw}%",),
        fetch=True
    )
    if rows:
        return rows[0]

    # 3. Tách từ khóa loại bỏ từ nối tiếng Việt
    stopwords = {
        'với', 'cùng', 'về', 'cho', 'của', 'ở', 'tại', 'lại', 'lịch', 'cuộc', 'buổi',
        'họp', 'hẹn', 'gặp', 'làm', 'việc', 'hôm nay', 'hnay', 'ngày mai', 'tuần sau',
        'chuyển', 'dời', 'đổi', 'qua', 'sang', 'đi', 'nhé', 'nha', 'giúp', 'em'
    }
    raw_tokens = re.split(r'[\s,._\-+]+', kw.lower())
    meaningful_tokens = [t for t in raw_tokens if t and t not in stopwords and len(t) >= 2]

    # Nếu sau khi lọc không còn từ nào, dùng lại các từ có độ dài >= 2
    if not meaningful_tokens:
        meaningful_tokens = [t for t in raw_tokens if len(t) >= 2]

    if meaningful_tokens:
        # Xây dựng câu query tìm kiếm chứa TẤT CẢ các từ khóa ý nghĩa (AND)
        and_conditions = ["title ILIKE %s" for _ in meaningful_tokens]
        and_params = [f"%{t}%" for t in meaningful_tokens]
        query = f"""
            SELECT id, title, date, "startTime", "endTime", status FROM schedule 
            WHERE {" AND ".join(and_conditions)}
            ORDER BY CASE WHEN status = 'todo' THEN 0 ELSE 1 END, date DESC LIMIT 1
        """
        rows = execute_query(query, tuple(and_params), fetch=True)
        if rows:
            return rows[0]

        # Nếu AND không ra, thử tìm chứa BẤT KỲ từ khóa quan trọng nào (OR), ưu tiên khớp nhiều từ nhất
        or_conditions = ["title ILIKE %s" for _ in meaningful_tokens]
        or_params = [f"%{t}%" for t in meaningful_tokens]
        query = f"""
            SELECT id, title, date, "startTime", "endTime", status FROM schedule 
            WHERE {" OR ".join(or_conditions)}
            ORDER BY CASE WHEN status = 'todo' THEN 0 ELSE 1 END, date DESC LIMIT 5
        """
        candidate_rows = execute_query(query, tuple(or_params), fetch=True)
        if candidate_rows:
            def count_matches(r):
                t_lower = (r['title'] or '').lower()
                return sum(1 for tok in meaningful_tokens if tok in t_lower)
            best_cand = max(candidate_rows, key=count_matches)
            return best_cand

    return None

def update_schedule_task(search_keyword_or_id: str, new_date: str = None, new_start_time: str = None, new_end_time: str = None, new_title: str = None, new_status: str = None):
    """
    Cập nhật, dời giờ, đổi ngày hoặc đổi tên một lịch hẹn trong schedule.
    Hỗ trợ tìm kiếm mờ thông minh theo từ khóa tên hoặc theo task ID.
    - search_keyword_or_id: Từ khóa tên công việc (ví dụ 'họp amber', 'họp kịch bản') hoặc task_id (ví dụ 'sch_634f9868').
    - new_date: Ngày mới định dạng YYYY-MM-DD nếu cần dời ngày.
    - new_start_time: Giờ bắt đầu mới HH:MM nếu dời giờ.
    - new_end_time: Giờ kết thúc mới HH:MM.
    - new_title: Tên mới nếu cần đổi tên.
    - new_status: Trạng thái mới ('todo', 'done', 'cancelled').
    """
    task = find_schedule_task(search_keyword_or_id)
    if not task:
        return f"Không tìm thấy công việc nào khớp với '{search_keyword_or_id.strip()}' để cập nhật."

    task_id = task['id']
    old_title = task['title']

    updates = []
    params = []
    if new_date:
        updates.append("date = %s")
        params.append(new_date)
    if new_start_time:
        updates.append('"startTime" = %s')
        params.append(new_start_time)
    if new_end_time:
        updates.append('"endTime" = %s')
        params.append(new_end_time)
    if new_title:
        updates.append("title = %s")
        params.append(new_title)
    if new_status:
        updates.append("status = %s")
        params.append(new_status)

    if not updates:
        return f"Không có thông tin mới nào để cập nhật cho task '{old_title}'."

    params.append(task_id)
    query = f"UPDATE schedule SET {', '.join(updates)} WHERE id = %s"
    if execute_query(query, tuple(params)):
        return safe_json_dumps({
            "status": "success",
            "task_id": task_id,
            "title": new_title or old_title,
            "message": f"Đã cập nhật thành công công việc '{old_title}'."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi cập nhật database."})

def mark_schedule_task_done(search_keyword_or_id: str):
    """
    Đánh dấu một lịch hẹn hoặc công việc trong schedule là ĐÃ HOÀN THÀNH (status = 'done').
    - search_keyword_or_id: Từ khóa tên công việc hoặc task_id.
    """
    return update_schedule_task(search_keyword_or_id, new_status="done")

def delete_schedule_task(search_keyword_or_id: str):
    """
    Xóa hoặc hủy một lịch hẹn trong schedule.
    - search_keyword_or_id: Từ khóa tên công việc hoặc task_id.
    """
    task = find_schedule_task(search_keyword_or_id)
    if not task:
        return f"Không tìm thấy công việc nào khớp với '{search_keyword_or_id.strip()}' để xóa."

    task_id = task['id']
    old_title = task['title']

    if execute_query("DELETE FROM schedule WHERE id = %s", (task_id,)):
        return safe_json_dumps({
            "status": "success",
            "task_id": task_id,
            "message": f"Đã xóa thành công lịch hẹn '{old_title}'."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi xóa khỏi database."})

def record_expense(amount: int, category: str, description: str, vendor: str = "Tiền mặt", project_name: str = "Công ty", payment_method: str = "Cash"):
    """
    Ghi nhận một khoản chi tiêu (đặc biệt là CHI TIỀN MẶT - Cash) vào bảng expensetransactions.
    Tuân thủ nghiêm ngặt quy chuẩn AGENTS.md (Category, Payment Method, Project mapping và deduplication).
    - amount: Số tiền (VND, số nguyên dương).
    - category: Hạng mục chi (Food / Meeting, AI / Tools, Freelancer, Office / Admin, Shopping, Sales, Personal, Health Care, Gia đình & Định kỳ, Di chuyển, Other).
    - description: Ghi chú nội dung chi.
    - vendor: Tên người nhận / nơi mua (mặc định 'Tiền mặt' nếu không rõ).
    - project_name: 'Công ty' (PROJ-CONGTY), 'Cá nhân' (PROJ-CANHAN) hoặc tên dự án cụ thể.
    - payment_method: Mặc định là 'Cash' (Tiền mặt).
    """
    date_str = get_now().strftime('%Y-%m-%d')

    # Mapping category
    valid_categories = [
        'AI / Tools', 'Freelancer', 'Vay / Nợ', 'Shopping', 'Sales',
        'Food / Meeting', 'Marketing', 'Office / Admin', 'Tax / Fees',
        'Personal', 'Health Care', 'Gia đình & Định kỳ', 'Di chuyển', 'Other'
    ]
    matched_cat = "Other"
    for vc in valid_categories:
        if vc.lower() in category.lower() or category.lower() in vc.lower():
            matched_cat = vc
            break

    # Mapping project ID
    proj_id = "PROJ-CONGTY"
    clean_p = (project_name or "").strip().lower()
    if any(k in clean_p for k in ["cá nhân", "canhan", "personal", "riêng"]):
        proj_id = "PROJ-CANHAN"
    elif any(k in clean_p for k in ["công ty", "congty", "internal", "chung"]):
        proj_id = "PROJ-CONGTY"
    else:
        prows = execute_query("SELECT id, name FROM projects WHERE name ILIKE %s OR id ILIKE %s LIMIT 1", (f"%{project_name}%", f"%{project_name}%"), fetch=True)
        if prows:
            proj_id = prows[0]['id']

    # Smart Matching: Kiểm tra xem có giao dịch ngân hàng / thẻ / MoMo nào trong vòng 2 ngày qua có cùng số tiền mà chưa được phân loại rõ (category 'Other' hoặc description 'Amount' / chung chung hoặc projectid IS NULL)
    unclassified_tx = execute_query(
        """SELECT id, amount, vendor, description, paymentmethod FROM expensetransactions 
           WHERE amount = %s AND date >= %s AND (category = 'Other' OR description ILIKE '%amount%' OR projectid IS NULL)
           ORDER BY date DESC LIMIT 1""",
        (amount, (get_now() - timedelta(days=2)).strftime('%Y-%m-%d')),
        fetch=True
    )
    if unclassified_tx:
        utx = unclassified_tx[0]
        execute_query("""
            UPDATE expensetransactions 
            SET category = %s, projectid = %s, description = %s
            WHERE id = %s
        """, (matched_cat, proj_id, description, utx['id']))

        # Đóng action item nếu có liên quan
        execute_query("""
            UPDATE actions 
            SET status = 'Done', notes = COALESCE(notes, '') || %s
            WHERE (notes LIKE %s OR title LIKE %s) AND status = 'Pending'
        """, (f" -> Đã duyệt: {description} ({matched_cat} - {proj_id})", f"%{utx['id']}%", f"%{amount:,}%"))

        return safe_json_dumps({
            "status": "success",
            "id": utx['id'],
            "amount": amount,
            "category": matched_cat,
            "project": proj_id,
            "method": utx.get('paymentmethod', 'Chuyển khoản'),
            "message": f"Dạ em đã đối soát và cập nhật trực tiếp vào giao dịch {utx['id']} ({utx.get('paymentmethod', 'Chuyển khoản')}): '{description}' (Hạng mục: {matched_cat}, Dự án: {proj_id}) rồi ạ! Sếp yên tâm không bị trùng lặp nhé."
        })

    # Cross-check deduplication (+/- 2 days, same amount)
    check_dup = execute_query(
        """SELECT id, amount, vendor, description, paymentmethod FROM expensetransactions 
           WHERE amount = %s AND date >= %s LIMIT 1""",
        (amount, (get_now() - timedelta(days=2)).strftime('%Y-%m-%d')),
        fetch=True
    )
    if check_dup:
        return safe_json_dumps({
            "status": "warning",
            "message": f"Cảnh báo: Đã có khoản chi {amount:,} đ ({check_dup[0]['description']} - {check_dup[0]['paymentmethod']}) trong vòng 2 ngày qua. Chưa ghi thêm để tránh trùng lặp."
        })

    # Generate unique expense id
    uid_raw = f"{date_str}_{vendor}_{amount}_{uuid.uuid4().hex[:4]}".encode('utf-8')
    eid = f"exp_{hashlib.md5(uid_raw).hexdigest()[:10]}"

    query = """
        INSERT INTO expensetransactions (id, date, vendor, amount, projectid, category, paymentmethod, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (eid, date_str, vendor or "Tiền mặt", amount, proj_id, matched_cat, payment_method, description)
    success = execute_query(query, params)

    if success:
        return safe_json_dumps({
            "status": "success",
            "id": eid,
            "amount": amount,
            "category": matched_cat,
            "project": proj_id,
            "method": payment_method,
            "message": f"Đã ghi nhận khoản chi tiền mặt {amount:,} đ ({matched_cat} - {proj_id}): {description}. Sẽ đối soát cùng sao kê."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi lưu chi phí vào database."})

def resolve_pending_expense_action(item_description: str, category: str = "Food / Meeting", project_type_or_name: str = "PROJ-CANHAN", action_id_or_transaction_code: str = None):
    """
    Cập nhật phân loại cho khoản chi ngân hàng/MoMo đang chờ sếp duyệt và đánh dấu hoàn thành Action item.
    Dùng khi sếp phản hồi về một khoản chi đang cần sếp duyệt (ví dụ: 'cái này là bánh tráng trộn', 'khoản 27k là ăn uống cá nhân', 'mua đạo cụ Ensure').
    - item_description: Tên món hàng/dịch vụ sếp đã chi (ví dụ: 'Bánh tráng trộn', 'Ăn trưa', 'Mua đạo cụ quay').
    - category: Hạng mục chi phí hợp lệ (Food / Meeting, AI / Tools, Freelancer, Shopping, Di chuyển, Personal, Office / Admin, Gia đình & Định kỳ, Other). Mặc định là 'Food / Meeting' nếu là đồ ăn/uống.
    - project_type_or_name: 'PROJ-CANHAN' (Cá nhân) hoặc 'PROJ-CONGTY' (Công ty) hoặc tên/ID dự án cụ thể. Mặc định chi tiêu cá nhân/ăn uống là 'PROJ-CANHAN'.
    - action_id_or_transaction_code: Mã Action (act_...) hoặc mã giao dịch (exp_...) nếu biết. Nếu để trống, hệ thống sẽ tự động tìm Action item đang Pending gần nhất.
    """
    target_action = None
    if action_id_or_transaction_code:
        target_action = execute_query(
            "SELECT * FROM actions WHERE (id = %s OR notes LIKE %s OR title LIKE %s) AND status = 'Pending'",
            (action_id_or_transaction_code, f"%{action_id_or_transaction_code}%", f"%{action_id_or_transaction_code}%"),
            fetch=True
        )
    if not target_action:
        target_action = execute_query(
            "SELECT * FROM actions WHERE status = 'Pending' ORDER BY priorityorder ASC, id DESC LIMIT 1",
            fetch=True
        )

    if not target_action:
        return safe_json_dumps({"status": "not_found", "message": "Hiện không có Action item nào đang ở trạng thái Pending cần duyệt."})

    act = target_action[0]
    act_id = act['id']
    act_notes = act.get('notes') or ''
    act_title = act.get('title') or ''

    m = re.search(r'(exp_[A-Za-z0-9_]+)', f"{act_notes} {act_title}")
    t_id = m.group(1) if m else None

    valid_categories = [
        'AI / Tools', 'Freelancer', 'Vay / Nợ', 'Shopping', 'Sales',
        'Food / Meeting', 'Marketing', 'Office / Admin', 'Tax / Fees',
        'Personal', 'Health Care', 'Gia đình & Định kỳ', 'Di chuyển', 'Other'
    ]
    matched_cat = "Food / Meeting"
    for vc in valid_categories:
        if vc.lower() in category.lower() or category.lower() in vc.lower():
            matched_cat = vc
            break

    proj_id = "PROJ-CANHAN"
    clean_p = (project_type_or_name or "").strip().lower()
    if any(k in clean_p for k in ["cá nhân", "canhan", "personal", "riêng"]):
        proj_id = "PROJ-CANHAN"
    elif any(k in clean_p for k in ["công ty", "congty", "internal", "chung"]):
        proj_id = "PROJ-CONGTY"
    else:
        prows = execute_query("SELECT id, name FROM projects WHERE name ILIKE %s OR id ILIKE %s LIMIT 1", (f"%{project_type_or_name}%", f"%{project_type_or_name}%"), fetch=True)
        if prows:
            proj_id = prows[0]['id']

    if t_id:
        tx_rows = execute_query("SELECT * FROM expensetransactions WHERE id = %s", (t_id,), fetch=True)
        if tx_rows:
            tx = tx_rows[0]
            curr_desc = tx.get('description') or ''
            new_desc = f"{item_description} - {curr_desc}".strip(" -")
            execute_query("""
                UPDATE expensetransactions 
                SET category = %s, projectid = %s, description = %s
                WHERE id = %s
            """, (matched_cat, proj_id, new_desc, t_id))

            vendor = tx.get('vendor')
            if vendor and vendor != 'Unknown':
                v_exists = execute_query("SELECT vendor FROM payees WHERE vendor = %s", (vendor,), fetch=True)
                if not v_exists:
                    execute_query("""
                        INSERT INTO payees (vendor, alias, default_category, default_project_id, default_method)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (vendor, item_description.lower(), matched_cat, proj_id, tx.get('paymentmethod', 'Chuyển khoản')))

    execute_query("""
        UPDATE actions 
        SET status = 'Done', notes = COALESCE(notes, '') || %s
        WHERE id = %s
    """, (f" -> Đã duyệt: {item_description} ({matched_cat} - {proj_id})", act_id))

    return safe_json_dumps({
        "status": "success",
        "action_id": act_id,
        "transaction_id": t_id,
        "item": item_description,
        "category": matched_cat,
        "project": proj_id,
        "message": f"Dạ em đã cập nhật phân loại thành công: '{item_description}' (Hạng mục: {matched_cat}, Dự án: {proj_id}) và đóng Action item rồi sếp nhé! Em cũng đã lưu vào danh bạ Payee để các lần sau mua chỗ này hệ thống tự động ghi nhận luôn ạ."
    })

def check_income_transactions(search_keyword: str = None, date: str = None, limit: int = 15):
    """
    Tra cứu các giao dịch tiền về, thu nhập, chuyển khoản khách hàng thanh toán từ bảng incomes.
    Dùng khi sếp hỏi: 'Thảo mới ck 140tr đúng ko?', 'hôm nay có khoản tiền nào về?', 'ai chuyển tiền?'.
    - search_keyword: Tên người chuyển (ví dụ 'Thảo', 'Quách Xuân Thảo', 'Sơn'), tên dự án hoặc nội dung ghi chú.
    - date: Ngày chuyển định dạng YYYY-MM-DD (mặc định tìm các giao dịch gần nhất).
    - limit: Số lượng giao dịch tối đa (mặc định 15).
    """
    conditions = []
    params = []

    if date:
        conditions.append("date = %s")
        params.append(date.strip())

    if search_keyword:
        kw = search_keyword.strip()
        kw_lower = kw.lower()
        if any(w in kw_lower for w in ['winterland', 'k87k', 'winter']):
            conditions.append("(project ILIKE %s OR id ILIKE %s OR projectid IN ('proj_02', 'proj_08', 'proj_14', 'proj_17'))")
            params.extend([f"%{kw}%", f"%{kw}%"])
        else:
            conditions.append("(notes ILIKE %s OR project ILIKE %s OR id ILIKE %s)")
            params.extend([f"%{kw}%", f"%{kw}%", f"%{kw}%"])

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"SELECT id, date, project, amount, notes FROM incomes {where_clause} ORDER BY date DESC, id DESC LIMIT %s"
    params.append(limit if limit > 15 else 30)

    rows = execute_query(query, tuple(params), fetch=True)
    if not rows:
        return f"Không tìm thấy khoản thu / chuyển khoản nào khớp với yêu cầu (Từ khóa: '{search_keyword or ''}', Ngày: '{date or ''}')."

    cleaned = clean_data(rows)
    actual_transfers = []
    offsets = []
    for r in cleaned:
        t_id = (r.get('id') or '')
        if '_offset' in t_id.lower():
            offsets.append(r)
        else:
            actual_transfers.append(r)

    total_actual_vnd = sum(r.get('amount', 0) for r in actual_transfers)
    total_offset_vnd = sum(r.get('amount', 0) for r in offsets)
    total_all_vnd = total_actual_vnd + total_offset_vnd

    return safe_json_dumps({
        "total_records": len(cleaned),
        "actual_transfer_amount_vnd": total_actual_vnd,
        "offset_amount_vnd": total_offset_vnd,
        "total_amount_vnd": total_all_vnd,
        "explanation": (
            f"Tiền chuyển khoản thực tế qua ngân hàng là {total_actual_vnd:,.0f} VNĐ. "
            f"Khoản cấn trừ chi phí đối ứng là {total_offset_vnd:,.0f} VNĐ. "
            f"Tổng giá trị quyết toán là {total_all_vnd:,.0f} VNĐ. "
            "Khi trả lời sếp, hãy khẳng định rõ số tiền THỰC TẾ CHUYỂN KHOẢN trước, sau đó mới liệt kê chi tiết các dòng phân bổ và các khoản cấn trừ đối ứng."
        ),
        "actual_transactions": actual_transfers,
        "offset_transactions": offsets
    })

def get_actions_pending():
    """
    Lấy danh sách các việc cần sếp input / phê duyệt từ bảng actions.
    """
    rows = execute_query(
        "SELECT id, title, prioritylevel, suggestedagent FROM actions WHERE status = 'Pending' ORDER BY priorityorder ASC",
        fetch=True
    )
    if not rows:
        return "Hiện không có action item nào đang chờ sếp xử lý."
    return safe_json_dumps(clean_data(rows))

def create_action_task(title: str, project_name_or_id: str = None, priority_level: str = "Medium", suggested_agent: str = "Trâm Anh", notes: str = ""):
    """
    Tạo một Action Item (Việc cần làm / Cần Sếp Input / To-Do tồn đọng không có khung giờ cụ thể) vào bảng actions.
    Phân biệt rõ ràng với bảng schedule (việc có giờ giấc cụ thể).
    - title: Tên công việc hoặc yêu cầu cần sếp duyệt/xử lý.
    - project_name_or_id: Tên hoặc mã dự án liên quan nếu có.
    - priority_level: 'High', 'Medium', 'Low'. Mặc định 'Medium'.
    - suggested_agent: Agent phụ trách hoặc liên quan ('Trâm Anh', 'Minh Thư', 'Quốc Bảo', 'Minh Đan', 'Chí Hải').
    - notes: Chi tiết bổ sung nếu có.
    """
    act_id = f"act_{uuid.uuid4().hex[:8]}"

    proj_id = None
    if project_name_or_id:
        prows = execute_query(
            "SELECT id FROM projects WHERE id = %s OR name ILIKE %s LIMIT 1",
            (project_name_or_id.strip(), f"%{project_name_or_id.strip()}%"),
            fetch=True
        )
        if prows:
            proj_id = prows[0]['id']

    query = """
        INSERT INTO actions (id, priorityorder, title, projectid, prioritylevel, suggestedagent, status, category, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        act_id,
        1,
        title.strip(),
        proj_id,
        priority_level or "Medium",
        suggested_agent or "Trâm Anh",
        "Pending",
        "work",
        notes or f"Tạo qua Telegram lúc {get_now().strftime('%H:%M %d/%m/%Y')}"
    )
    success = execute_query(query, params)
    if success:
        return safe_json_dumps({
            "status": "success",
            "task_id": act_id,
            "title": title,
            "priority": priority_level,
            "agent": suggested_agent,
            "message": f"Đã thêm công việc '{title}' vào danh sách Cần Sếp Duyệt (Actions)."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi lưu Action vào database."})

def mark_action_done(search_keyword_or_id: str, resolution_notes: str = ""):
    """
    Đánh dấu một Action Item trong bảng actions là ĐÃ HOÀN THÀNH (status = 'Done').
    Dùng khi sếp duyệt xong hoặc hoàn thành bất kỳ việc nào trong Today Task / Actions pending (duyệt báo giá, duyệt hợp đồng, xong việc tồn đọng...).
    - search_keyword_or_id: Mã action (act_...) hoặc từ khóa tên công việc (ví dụ 'duyệt báo giá', 'hợp đồng', 'kiểm tra mail').
    - resolution_notes: Ghi chú kết quả xử lý nếu có.
    """
    kw = (search_keyword_or_id or "").strip()

    # 1. Exact ID
    act_rows = execute_query(
        "SELECT id, title FROM actions WHERE id = %s AND status = 'Pending' LIMIT 1",
        (kw,),
        fetch=True
    )

    # 2. Match by title or notes
    if not act_rows:
        act_rows = execute_query(
            "SELECT id, title FROM actions WHERE (title ILIKE %s OR notes ILIKE %s) AND status = 'Pending' ORDER BY priorityorder ASC LIMIT 1",
            (f"%{kw}%", f"%{kw}%"),
            fetch=True
        )

    if not act_rows:
        return safe_json_dumps({"status": "not_found", "message": f"Không tìm thấy Action item Pending nào khớp với '{kw}'."})

    act = act_rows[0]
    act_id = act['id']
    act_title = act['title']

    res_note = f" -> Đã hoàn thành lúc {get_now().strftime('%H:%M %d/%m/%Y')}"
    if resolution_notes:
        res_note += f": {resolution_notes}"

    query = "UPDATE actions SET status = 'Done', notes = COALESCE(notes, '') || %s WHERE id = %s"
    success = execute_query(query, (res_note, act_id))

    if success:
        return safe_json_dumps({
            "status": "success",
            "task_id": act_id,
            "title": act_title,
            "message": f"Đã đánh dấu hoàn thành Action item: '{act_title}'."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi cập nhật trạng thái Action."})

def get_active_projects():
    """
    Lấy danh sách và tiến độ các dự án đang chạy (Đang làm, Chờ feedback, Cần revise).
    """
    rows = execute_query(
        "SELECT id, name, client, status, budget, received, duedate, nextaction FROM projects WHERE status IN ('Đang làm', 'Chờ feedback', 'Cần revise') ORDER BY id ASC",
        fetch=True
    )
    if not rows:
        return "Hiện không có dự án nào đang chạy."
    return safe_json_dumps(clean_data(rows))

def get_project_details(project_name: str):
    """
    Tra cứu chi tiết toàn diện của một dự án (Tiến độ, Hợp đồng, Hóa đơn VAT, Giấy tờ, các đợt thanh toán).
    - project_name: Tên dự án (ví dụ 'Forestia', 'Ensure', 'Winterland', 'Atera').
    """
    clean_name = project_name.strip()
    proj_rows = execute_query(
        """SELECT id, name, client, status, budget, received, paymentd1, paymentd2, paymentd3, 
                  duedate, nextaction, projecttype, paymentphase 
           FROM projects WHERE name ILIKE %s OR id ILIKE %s LIMIT 1""",
        (f"%{clean_name}%", f"%{clean_name}%"),
        fetch=True
    )
    if not proj_rows:
        return f"Không tìm thấy dự án nào khớp với '{project_name}'."

    proj = clean_data(proj_rows[0])
    proj_id = proj['id']

    doc_rows = execute_query(
        """SELECT overallstatus, quote, contract, vatr1, vatr2, vatr3, liquidation,
                  quote_link, contract_link, vatr1_link, vatr2_link, liquidation_link
           FROM projectdocuments WHERE projectid = %s LIMIT 1""",
        (proj_id,),
        fetch=True
    )
    doc = clean_data(doc_rows[0]) if doc_rows else None

    # Customer specific notes
    client_name = (proj.get('client') or '').lower()
    special_note = ""
    if 'inverse' in client_name:
        special_note = "Dự án Inverse làm qua Thảo nhận 100% Net, không cần hợp đồng giấy tờ."
    elif 'k87k' in client_name:
        special_note = "Dự án Winterland K87K tuân theo 8 mốc milestone chuẩn, Tít làm clip."

    return safe_json_dumps({
        "project": proj,
        "documents": doc,
        "special_note": special_note
    })

def create_project(name: str, client: str, project_type: str = "AI Film", budget: float = 0, due_date: str = None, next_action: str = "", notes: str = "", status: str = "Chưa bắt đầu"):
    """
    Tạo một dự án mới vào hệ thống AN PHIM (bảng projects) và khởi tạo bảng Project_SOW, projectdocuments.
    Tuân thủ nghiêm ngặt quy tắc AGENTS.md về Project Status và Project Type.
    - name: Tên dự án (ví dụ 'Winterland87 Tháng 10', 'Forestia', 'Ensure').
    - client: Tên khách hàng / pháp nhân (ví dụ 'K87K', '9KOLOR', 'VISTAX', 'F35STORY', 'Inverse').
    - project_type: 1 trong các giá trị chuẩn: 'AI Render', 'Marketing', 'AI Image', 'AI Film', 'VFX', 'Graphic', 'Script', 'Video', 'Event', 'Internal'. Mặc định 'AI Film'.
    - budget: Tổng ngân sách / giá trị hợp đồng (VNĐ).
    - due_date: Hạn chót dự án (YYYY-MM-DD hoặc DD/MM/YYYY).
    - next_action: Bước hành động tiếp theo.
    - notes: Ghi chú dự án.
    - status: 'Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng'. Mặc định 'Chưa bắt đầu'.
    """
    valid_statuses = ['Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng', 'Hidden']
    matched_status = 'Chưa bắt đầu'
    for s in valid_statuses:
        if s.lower() == (status or '').strip().lower():
            matched_status = s
            break
    if matched_status == 'Chưa bắt đầu' and status:
        st_lower = status.strip().lower()
        if any(w in st_lower for w in ['làm', 'chạy', 'progress', 'doing', 'start']):
            matched_status = 'Đang làm'
        elif any(w in st_lower for w in ['feedback', 'chờ phản hồi', 'chờ fb']):
            matched_status = 'Chờ feedback'
        elif any(w in st_lower for w in ['revise', 'sửa', 'chỉnh']):
            matched_status = 'Cần revise'
        elif any(w in st_lower for w in ['hoàn thành', 'xong', 'done', 'finish']):
            matched_status = 'Hoàn thành'
        elif any(w in st_lower for w in ['pause', 'dừng', 'hold', 'hoãn']):
            matched_status = 'Tạm dừng'

    valid_types = ['AI Render', 'Marketing', 'AI Image', 'AI Film', 'VFX', 'Graphic', 'Script', 'Video', 'Event', 'Internal']
    matched_type = 'AI Film'
    for t in valid_types:
        if t.lower() == (project_type or '').strip().lower():
            matched_type = t
            break
    if matched_type == 'AI Film' and project_type:
        pt_lower = project_type.strip().lower()
        if 'render' in pt_lower: matched_type = 'AI Render'
        elif 'marketing' in pt_lower or 'mkt' in pt_lower: matched_type = 'Marketing'
        elif 'image' in pt_lower or 'ảnh' in pt_lower or 'hình' in pt_lower: matched_type = 'AI Image'
        elif 'vfx' in pt_lower: matched_type = 'VFX'
        elif 'graphic' in pt_lower or 'thiết kế' in pt_lower: matched_type = 'Graphic'
        elif 'script' in pt_lower or 'kịch bản' in pt_lower: matched_type = 'Script'
        elif 'video' in pt_lower or 'clip' in pt_lower or 'quay' in pt_lower: matched_type = 'Video'
        elif 'event' in pt_lower or 'sự kiện' in pt_lower: matched_type = 'Event'
        elif 'internal' in pt_lower or 'nội bộ' in pt_lower: matched_type = 'Internal'

    # Auto-increment project ID (proj_XX)
    res = execute_query("SELECT id FROM projects WHERE id LIKE 'proj_%'", fetch=True)
    max_id = 0
    if res:
        for r in res:
            try:
                num = int(r['id'].replace('proj_', ''))
                if num > max_id:
                    max_id = num
            except ValueError:
                pass
    project_id = f"proj_{str(max_id + 1).zfill(2)}"

    # Parse and format due date
    formatted_due = None
    if due_date:
        parsed_d = parse_date_to_yyyy_mm_dd(due_date)
        formatted_due = parsed_d if parsed_d else due_date.strip()

    # Special handling for K87K / Winterland: 8 standard milestones
    is_winterland = (client or '').strip().upper() == "K87K" or "WINTERLAND" in (name or '').strip().upper()
    milestones_json = None
    if is_winterland:
        now_dt = get_now()
        start_dt = now_dt
        if formatted_due:
            try:
                end_dt = datetime.strptime(formatted_due, '%Y-%m-%d').replace(tzinfo=VN_TZ)
                start_dt = end_dt - timedelta(days=31)
            except Exception:
                pass
        offsets = [
            ("Review tháng trước", 0),
            ("Lên kế hoạch tháng mới", 0),
            ("Quay ngày 1", 9),
            ("Quay ngày 2", 15),
            ("Post 15 clip", 19),
            ("Post 5 bài", 22),
            ("Review dịch vụ", 29),
            ("Bàn giao và chuẩn bị tháng tiếp theo", 31)
        ]
        w_milestones = []
        for m_name, offset in offsets:
            t_date = start_dt + timedelta(days=offset)
            w_milestones.append({
                "name": m_name,
                "date": t_date.strftime("%d/%m/%Y"),
                "completed": False
            })
        milestones_json = json.dumps(w_milestones, ensure_ascii=False)
        final_date_str = (start_dt + timedelta(days=31)).strftime('%Y-%m-%d')
        formatted_due = final_date_str

    query = """
        INSERT INTO projects (id, name, client, status, projecttype, duedate, nextaction, notes, budget, received, milestones)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
    """
    params = (
        project_id, name.strip(), client.strip(), matched_status, matched_type,
        formatted_due, next_action or "", notes or "", float(budget or 0), 0.0,
        milestones_json
    )
    success = execute_query(query, params)
    if not success:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi thêm dự án vào cơ sở dữ liệu."})

    # Create SOW row
    sow_id = f"sow_{project_id}"
    execute_query('INSERT INTO "Project_SOW" (id, project_id) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING', (sow_id, project_id))

    # Initialize projectdocuments
    is_inverse = 'inverse' in (client or '').strip().lower()
    if is_inverse:
        execute_query("""
            INSERT INTO projectdocuments (projectid, overallstatus, quote, contract, vatr1, vatr2, vatr3, liquidation)
            VALUES (%s, 'Đã đủ', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
            ON CONFLICT (projectid) DO UPDATE SET overallstatus = 'Đã đủ', quote = TRUE, contract = TRUE
        """, (project_id,))
    else:
        execute_query("""
            INSERT INTO projectdocuments (projectid, overallstatus, quote, contract, vatr1, vatr2, vatr3, liquidation)
            VALUES (%s, 'Chưa có', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)
            ON CONFLICT (projectid) DO NOTHING
        """, (project_id,))

    msg = f"Đã tạo thành công dự án '{name}' (ID: {project_id}) cho khách hàng {client}."
    if is_winterland:
        msg += " Hệ thống đã tự động thiết lập 8 Milestones chuẩn cho chu kỳ tháng K87K."
    elif is_inverse:
        msg += " Hệ thống đã tự động đánh dấu Đã đủ giấy tờ (100% Net theo quy tắc Inverse)."

    return safe_json_dumps({
        "status": "success",
        "project_id": project_id,
        "name": name,
        "client": client,
        "type": matched_type,
        "status_project": matched_status,
        "budget": budget,
        "duedate": formatted_due,
        "message": msg
    })

def update_project(search_keyword_or_id: str, status: str = None, next_action: str = None, budget: float = None, received: float = None, due_date: str = None, notes: str = None, stage: str = None):
    """
    Cập nhật tiến độ, trạng thái, bước tiếp theo, ngân sách hoặc số tiền nhận của một dự án trong bảng projects.
    Tuân thủ nghiêm ngặt danh sách trạng thái chuẩn: 'Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng'.
    - search_keyword_or_id: Tên dự án (ví dụ 'Forestia', 'Atera', 'Winterland T9') hoặc ID (ví dụ 'proj_01').
    - status: 'Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng'.
    - next_action: Bước kế tiếp cần làm.
    - budget: Tổng ngân sách mới (VNĐ).
    - received: Số tiền đã nhận thanh toán vào tài khoản Công ty (VNĐ).
    - due_date: Hạn hoàn thành mới (YYYY-MM-DD hoặc DD/MM/YYYY).
    - notes: Ghi chú bổ sung.
    - stage: Giai đoạn hiện tại (ví dụ 'Brief / Scope', 'Production', 'Post-production', 'Feedback', 'Delivery').
    """
    kw = (search_keyword_or_id or "").strip()
    proj_rows = execute_query(
        "SELECT id, name, client, status, budget, received, duedate, nextaction FROM projects WHERE id = %s OR name ILIKE %s LIMIT 1",
        (kw, f"%{kw}%"),
        fetch=True
    )
    if not proj_rows:
        return safe_json_dumps({"status": "not_found", "message": f"Không tìm thấy dự án nào khớp với '{kw}'."})

    proj = proj_rows[0]
    proj_id = proj['id']
    proj_name = proj['name']

    updates = []
    params = []

    if status:
        valid_statuses = ['Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng', 'Hidden']
        matched_status = None
        for s in valid_statuses:
            if s.lower() == status.strip().lower():
                matched_status = s
                break
        if not matched_status:
            st_lower = status.strip().lower()
            if any(w in st_lower for w in ['làm', 'chạy', 'progress', 'doing', 'start']):
                matched_status = 'Đang làm'
            elif any(w in st_lower for w in ['feedback', 'chờ phản hồi', 'chờ fb']):
                matched_status = 'Chờ feedback'
            elif any(w in st_lower for w in ['revise', 'sửa', 'chỉnh']):
                matched_status = 'Cần revise'
            elif any(w in st_lower for w in ['hoàn thành', 'xong', 'done', 'finish']):
                matched_status = 'Hoàn thành'
            elif any(w in st_lower for w in ['pause', 'dừng', 'hold', 'hoãn']):
                matched_status = 'Tạm dừng'
            else:
                matched_status = status.strip()
        updates.append("status = %s")
        params.append(matched_status)

    if next_action is not None:
        updates.append("nextaction = %s")
        params.append(next_action)

    if budget is not None:
        updates.append("budget = %s")
        params.append(float(budget))

    if received is not None:
        updates.append("received = %s")
        params.append(float(received))

    if due_date is not None:
        parsed_d = parse_date_to_yyyy_mm_dd(due_date)
        updates.append("duedate = %s")
        params.append(parsed_d if parsed_d else due_date.strip())

    if notes is not None:
        updates.append("notes = %s")
        params.append(notes)

    if stage is not None:
        updates.append("currentstage = %s")
        params.append(stage)

    if not updates:
        return safe_json_dumps({"status": "no_change", "message": f"Không có thông tin mới nào để cập nhật cho dự án '{proj_name}'."})

    params.append(proj_id)
    query = f"UPDATE projects SET {', '.join(updates)} WHERE id = %s"
    success = execute_query(query, tuple(params))
    if success:
        return safe_json_dumps({
            "status": "success",
            "project_id": proj_id,
            "project_name": proj_name,
            "message": f"Đã cập nhật thành công dự án '{proj_name}' ({proj_id})."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi cập nhật cơ sở dữ liệu."})

def update_project_documents(search_keyword_or_id: str, overall_status: str = None, quote: bool = None, contract: bool = None, vatr1: bool = None, vatr2: bool = None, vatr3: bool = None, liquidation: bool = None, contract_link: str = None, quote_link: str = None, liquidation_link: str = None):
    """
    Cập nhật hồ sơ giấy tờ, pháp lý, hóa đơn VAT, thanh lý của dự án trong bảng projectdocuments.
    Tuân thủ danh sách overallstatus chuẩn: 'Chưa có', 'Đã kí', 'Chờ kí', 'Đã gửi', 'Đã đủ', 'Chờ đợt 2'.
    - search_keyword_or_id: Tên dự án hoặc ID dự án (ví dụ 'Forestia', 'Atera', 'proj_01').
    - overall_status: 'Chưa có', 'Đã kí', 'Chờ kí', 'Đã gửi', 'Đã đủ', 'Chờ đợt 2'.
    - quote: Đã có báo giá chưa (True/False).
    - contract: Đã có/ký hợp đồng chưa (True/False).
    - vatr1: Hóa đơn VAT đợt 1 (True/False).
    - vatr2: Hóa đơn VAT đợt 2 (True/False).
    - vatr3: Hóa đơn VAT đợt 3 (True/False).
    - liquidation: Biên bản nghiệm thu & thanh lý (True/False).
    - contract_link: Link Drive hợp đồng (HTTPS).
    - quote_link: Link Drive báo giá (HTTPS).
    - liquidation_link: Link Drive thanh lý (HTTPS).
    """
    kw = (search_keyword_or_id or "").strip()
    proj_rows = execute_query(
        "SELECT id, name, client FROM projects WHERE id = %s OR name ILIKE %s LIMIT 1",
        (kw, f"%{kw}%"),
        fetch=True
    )
    if not proj_rows:
        return safe_json_dumps({"status": "not_found", "message": f"Không tìm thấy dự án nào khớp với '{kw}'."})

    proj_id = proj_rows[0]['id']
    proj_name = proj_rows[0]['name']

    # Ensure row exists in projectdocuments
    existing_doc = execute_query("SELECT projectid FROM projectdocuments WHERE projectid = %s", (proj_id,), fetch=True)
    if not existing_doc:
        execute_query("""
            INSERT INTO projectdocuments (projectid, overallstatus, quote, contract, vatr1, vatr2, vatr3, liquidation)
            VALUES (%s, 'Chưa có', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)
        """, (proj_id,))

    updates = []
    params = []

    if overall_status:
        valid_ov = ['Chưa có', 'Đã kí', 'Chờ kí', 'Đã gửi', 'Đã đủ', 'Chờ đợt 2']
        matched_ov = None
        for v in valid_ov:
            if v.lower() == overall_status.strip().lower():
                matched_ov = v
                break
        if not matched_ov:
            ov_lower = overall_status.strip().lower()
            if any(w in ov_lower for w in ['đã ký', 'đã kí', 'signed']): matched_ov = 'Đã kí'
            elif any(w in ov_lower for w in ['chờ ký', 'chờ kí', 'waiting sign']): matched_ov = 'Chờ kí'
            elif any(w in ov_lower for w in ['đã gửi', 'sent']): matched_ov = 'Đã gửi'
            elif any(w in ov_lower for w in ['đã đủ', 'đầy đủ', 'done', 'full']): matched_ov = 'Đã đủ'
            elif any(w in ov_lower for w in ['đợt 2', 'phase 2']): matched_ov = 'Chờ đợt 2'
            else: matched_ov = overall_status.strip()
        updates.append("overallstatus = %s")
        params.append(matched_ov)

    if quote is not None:
        updates.append("quote = %s")
        params.append(bool(quote))
    if contract is not None:
        updates.append("contract = %s")
        params.append(bool(contract))
    if vatr1 is not None:
        updates.append("vatr1 = %s")
        params.append(bool(vatr1))
    if vatr2 is not None:
        updates.append("vatr2 = %s")
        params.append(bool(vatr2))
    if vatr3 is not None:
        updates.append("vatr3 = %s")
        params.append(bool(vatr3))
    if liquidation is not None:
        updates.append("liquidation = %s")
        params.append(bool(liquidation))

    if contract_link is not None:
        updates.append("contract_link = %s")
        params.append(contract_link)
    if quote_link is not None:
        updates.append("quote_link = %s")
        params.append(quote_link)
    if liquidation_link is not None:
        updates.append("liquidation_link = %s")
        params.append(liquidation_link)

    if not updates:
        return safe_json_dumps({"status": "no_change", "message": f"Không có thông tin giấy tờ mới nào để cập nhật cho dự án '{proj_name}'."})

    params.append(proj_id)
    query = f"UPDATE projectdocuments SET {', '.join(updates)} WHERE projectid = %s"
    success = execute_query(query, tuple(params))
    if success:
        return safe_json_dumps({
            "status": "success",
            "project_id": proj_id,
            "project_name": proj_name,
            "message": f"Đã cập nhật giấy tờ thành công cho dự án '{proj_name}' ({proj_id})."
        })
    else:
        return safe_json_dumps({"status": "error", "message": "Lỗi khi cập nhật giấy tờ dự án."})

def get_daily_expenses(date_str: str = None):
    """
    Tra cứu danh sách chi tiết và tổng chi phí của một ngày cụ thể (mặc định là hôm nay).
    Dùng khi sếp hỏi: 'báo cáo chi phí hôm nay', 'hôm nay chi những gì', 'chi phí ngày hôm nay', 'chi tiêu ngày 06/10'.
    - date_str: Ngày theo định dạng YYYY-MM-DD. Mặc định là ngày hôm nay.
    """
    now = get_now()
    if not date_str:
        target_date = now.strftime('%Y-%m-%d')
    else:
        parsed = parse_date_to_yyyy_mm_dd(date_str)
        target_date = parsed if parsed else date_str

    rows = execute_query(
        "SELECT id, amount, vendor, category, description, paymentmethod, projectid FROM expensetransactions WHERE date = %s ORDER BY id DESC",
        (target_date,),
        fetch=True
    )
    total = sum(float(r['amount'] or 0) for r in rows) if rows else 0.0
    return safe_json_dumps({
        "date": target_date,
        "total": total,
        "count": len(rows) if rows else 0,
        "expenses": [clean_data(dict(r)) for r in rows] if rows else []
    })

def get_finance_summary():
    """
    Lấy tổng quan thu, chi và dòng tiền ròng thực tế tháng này từ tài khoản cá nhân.
    """
    now = get_now()
    month_prefix = now.strftime('%Y-%m')
    inc_res = execute_query("SELECT SUM(amount) AS total FROM incomes WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    exp_res = execute_query("SELECT SUM(amount) AS total FROM expensetransactions WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    inc = float(inc_res[0]['total'] or 0) if inc_res else 0.0
    exp = float(exp_res[0]['total'] or 0) if exp_res else 0.0
    return safe_json_dumps({
        "month": now.strftime('%m/%Y'),
        "income": inc,
        "expense": exp,
        "net": inc - exp
    })

def get_comprehensive_report():
    """
    Báo cáo tổng hợp siêu tốc toàn bộ tình hình AN PHIM: Lịch trình hôm nay, Dự án đang chạy, Việc cần duyệt và Dòng tiền.
    """
    today_schedule = get_schedule(days_ahead=0)
    active_projects = get_active_projects()
    actions = get_actions_pending()
    finance = get_finance_summary()
    return safe_json_dumps({
        "today_schedule": today_schedule,
        "active_projects": active_projects,
        "pending_actions": actions,
        "finance": finance
    })

def get_client_info(client_name_or_id: str = ""):
    """
    Tra cứu thông tin pháp lý và hồ sơ khách hàng/đối tác (Tên công ty, MST/CNĐKKD, địa chỉ trụ sở, người đại diện pháp luật, chức vụ, ghi chú hợp tác) từ bảng clients trong cơ sở dữ liệu.
    - client_name_or_id: Tên công ty, thương hiệu hoặc mã khách hàng (ví dụ 'K87K', 'Winterland', 'VistaX', '9Kolor', 'CleverGroup', 'Inverse'). Để trống nếu muốn lấy danh sách tất cả đối tác.
    """
    clean_kw = (client_name_or_id or "").strip()
    if not clean_kw:
        rows = execute_query(
            "SELECT id, name, tax_id, address, rep_name, rep_role, payment_habits, notes FROM clients ORDER BY id ASC",
            fetch=True
        )
        if not rows:
            return "Chưa có thông tin khách hàng nào trong bảng clients."
        return safe_json_dumps(clean_data(rows))

    rows = execute_query(
        """SELECT id, name, tax_id, address, rep_name, rep_role, payment_habits, notes 
           FROM clients 
           WHERE id ILIKE %s OR name ILIKE %s OR notes ILIKE %s LIMIT 5""",
        (f"%{clean_kw}%", f"%{clean_kw}%", f"%{clean_kw}%"),
        fetch=True
    )
    if not rows:
        return f"Không tìm thấy thông tin khách hàng/đối tác nào khớp với '{client_name_or_id}' trong bảng clients."
    return safe_json_dumps(clean_data(rows))

# AI Tools exposed to Gemini
AI_TOOLS = [
    get_schedule,
    create_schedule_task,
    update_schedule_task,
    mark_schedule_task_done,
    delete_schedule_task,
    create_action_task,
    mark_action_done,
    get_actions_pending,
    create_project,
    update_project,
    get_active_projects,
    get_project_details,
    update_project_documents,
    get_client_info,
    get_daily_expenses,
    record_expense,
    resolve_pending_expense_action,
    check_income_transactions,
    get_finance_summary,
    get_comprehensive_report
]

# ==================== GEMINI CHAT MANAGEMENT ====================

chat_sessions = {} # chat_id -> {"chat": ChatSession, "date": str}

def get_chat_session(chat_id):
    now = get_now()
    today_str = now.strftime('%Y-%m-%d')

    if chat_id in chat_sessions:
        session_info = chat_sessions[chat_id]
        if session_info.get("date") == today_str and len(session_info["chat"].history) <= 40:
            return session_info["chat"]
        else:
            logger.info(f"Resetting chat session for {chat_id} (Date changed or history > 40 turns)")
            chat_sessions.pop(chat_id, None)

    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    day_name = days_vi[now.weekday()]
    tomorrow_str = (now + timedelta(days=1)).strftime('%Y-%m-%d')
    time_str = now.strftime('%H:%M')

    system_instruction = f"""Bạn là Trâm Anh (PM) - Trợ lý điều hành và quản lý dự án cao cấp của sếp Phan An tại AN PHIM Studio.
Bạn đang trò chuyện trực tiếp với Sếp trên Telegram.

QUY TẮC ỨNG XỬ & XƯNG HÔ:
- Luôn xưng "em", gọi sếp là "sếp" hoặc "anh" / "anh An".
- Phong cách: Thông minh, chu đáo, sắc sảo, lễ phép, nói chuyện tự nhiên và tinh tế như một trợ lý PM thực thụ ngoài đời thực.

THỜI GIAN THỰC TẾ:
- Hôm nay là: {day_name}, ngày {today_str} (Giờ hiện tại: {time_str}).
- Ngày mai là: {tomorrow_str}.

VỀ HỆ THỐNG AN PHIM:
- Sếp có các dự án tiêu biểu: Forestia (9KOLOR), Winterland87 các tháng (K87K), Đệ nhất pháp sư (F35story), Pediasure & Ensure (Inverse làm qua Thảo), The Wincity (VistaX)...
- Khách hàng Inverse (Ensure, Pediasure, Glucerna): Làm qua Thảo, nhận đủ 100% Net, TUYỆT ĐỐI không cần hợp đồng hay giấy tờ pháp lý.
- Khách hàng K87K Winterland: Sếp thuê Tít phụ trách clip/nội dung; tuân theo chu kỳ 8 milestone chuẩn.
- Gia đình sếp: Sếp có 2 con là Bông (lớn) và Ha / Haha (nhỏ, tuyệt đối không viết thành "Hạ").
- Đội ngũ AI Agent: Trâm Anh (PM, tiến độ & lịch trình), Minh Thư (Tài chính & kế toán), Minh Đan (Nội dung & social), Quốc Bảo (Sales & báo giá), Chí Hải (Kỹ thuật & IT).

CÁC NGUYÊN TẮC XỬ LÝ NGHIỆP VỤ:
1. BÁO CÁO TỔNG HỢP TOÀN DIỆN:
   - CHỈ gọi `get_comprehensive_report` khi sếp yêu cầu báo cáo tổng thể/tình hình chung chung của toàn studio (ví dụ: "báo cáo tình hình", "tổng kết", "tình hình hôm nay thế nào").
   - NẾU sếp hỏi về LỊCH TRÌNH / LỊCH LÀM VIỆC (kể cả có chữ "báo cáo", ví dụ: "báo cáo lịch làm việc tuần này", "báo cáo lịch hôm nay", "lịch tuần này của anh"): TUYỆT ĐỐI KHÔNG GỌI `get_comprehensive_report`. Phải gọi ngay `get_schedule` theo quy tắc bên dưới!
2. LỊCH TRÌNH (SCHEDULE & DEADLINES):
   - Khi sếp hỏi về lịch làm việc, lịch hẹn, deadline (kể cả "báo cáo lịch..."):
     • Lịch hôm nay: Gọi `get_schedule(days_ahead=0, days_count=1)`.
     • Lịch ngày mai: Gọi `get_schedule(days_ahead=1, days_count=1)`.
     • Lịch tuần này / các ngày tới: Gọi `get_schedule(days_ahead=0, days_count=7)`.
     • Lịch ngày cụ thể (ví dụ 25/09): Gọi `get_schedule(target_date='2026-09-25', days_count=1)`.
   - NGUYÊN TẮC BÁO CÁO TRẠNG THÁI LỊCH TRÌNH:
     Khi sếp hỏi về lịch trình (ngày mai, hôm nay, tuần này):
     • BẮT BUỘC kiểm tra trường `status`. Nếu công việc có `status == 'done'`, phải khẳng định rõ ràng là công việc này [ĐÃ HOÀN THÀNH SỚM] hoặc [ĐÃ XONG], TUYỆT ĐỐI KHÔNG ĐƯỢC báo như một công việc chưa làm mà sếp phải làm trong ngày mai!
     • Phân tách rạch ròi 2 nhóm: "Việc cần làm" (`status != 'done'`) và "Việc đã hoàn thành sớm" (`status == 'done'`). Nếu tất cả việc đều đã done, hãy chúc mừng sếp vì không còn việc tồn đọng!
   - NGUYÊN TẮC BẮT BUỘC KHI TẠO LỊCH HẸN / CÔNG VIỆC:
     Khi sếp yêu cầu note việc, hẹn giờ, lên lịch họp, lịch quay (ví dụ: 'note lịch', '7h tối thứ 6 họp...', 'mai tôi đi gặp khách...'):
     • BẮT BUỘC PHẢI GỌI FUNCTION CALL `create_schedule_task` để ghi vào cơ sở dữ liệu schedule!
     • TUYỆT ĐỐI KHÔNG ĐƯỢC sinh câu trả lời mồm 'em đã note lịch' hay 'lịch hẹn đã được thêm' nếu CHƯA GỌI tool `create_schedule_task`! Chỉ xác nhận sau khi function call trả về kết quả!
     • Tự động tính toán ngày chính xác (định dạng YYYY-MM-DD) từ thứ trong tuần hoặc ngày tương đối dựa vào hôm nay ({today_str} - {day_name}). Ví dụ thứ 6 tuần này tương ứng ngày nào thì tính đúng ngày đó.
   - Khi sếp báo xong việc trong schedule: Bắt buộc gọi `mark_schedule_task_done`.
   - Khi sếp dời giờ / đổi ngày / sửa task trong schedule: Bắt buộc gọi `update_schedule_task`.
   - Khi sếp hủy / xóa lịch: Bắt buộc gọi `delete_schedule_task`.
3. QUẢN LÝ DỰ ÁN & TIẾN ĐỘ (PROJECTS):
   - Khi sếp yêu cầu tạo dự án mới: BẮT BUỘC gọi `create_project`. Tuân thủ đúng Project Type và Status theo AGENTS.md.
   - Khi sếp yêu cầu cập nhật tiến độ, đổi trạng thái ('Chưa bắt đầu', 'Đang làm', 'Chờ feedback', 'Cần revise', 'Hoàn thành', 'Tạm dừng'), đổi budget, sửa deadline, hoặc báo khách thanh toán đợt 1/2 vào tài khoản công ty: BẮT BUỘC gọi `update_project`.
   - Khi sếp hỏi danh sách dự án đang chạy: Gọi `get_active_projects`. Khi hỏi chi tiết dự án: Gọi `get_project_details`.
4. HỒ SƠ GIẤY TỜ & PHÁP LÝ (PROJECT DOCUMENTS):
   - Khi sếp báo khách đã ký hợp đồng, đã gửi báo giá, đã xuất VAT đợt 1/2/3, nghiệm thu thanh lý hoặc hồ sơ giấy tờ đã đủ: BẮT BUỘC gọi `update_project_documents`.
5. CÔNG VIỆC CẦN SẾP DUYỆT & VIỆC TỒN ĐỌNG (ACTIONS):
   - Khi sếp note một đầu việc cần làm (To-Do) không có khung giờ cụ thể (khác với `create_schedule_task` có ngày giờ trong schedule): BẮT BUỘC gọi `create_action_task`.
   - Khi sếp báo đã hoàn thành hoặc duyệt xong một Action item: BẮT BUỘC gọi `mark_action_done`.
   - Khi sếp hỏi danh sách việc cần sếp duyệt: Gọi `get_actions_pending`.
6. TIỀN VỀ & CHUYỂN KHOẢN ĐẾN (INCOME):
   - Khi sếp hỏi về các khoản tiền chuyển khoản đến, ai chuyển tiền, khách thanh toán, hay hỏi ví dụ "Thảo mới ck 140tr đúng ko?":
   - HÃY GỌI NGAY công cụ `check_income_transactions` để tra cứu trong bảng incomes.
   - PHÂN BIỆT RÕ RÀNG TRONG CÙNG MỘT LẦN CHUYỂN KHOẢN:
     • Các dòng mang mã ngân hàng KHÔNG chứa `_offset` (ví dụ: `inc_FT..._vr`): Tiền mặt chuyển khoản thực tế qua ngân hàng. Lệnh 140tr Quách Xuân Thảo ngày 22/09/2026 (Ref FT26265055821342) bóc tách thành 5 dòng đúng tròn 140 triệu (15tr Winterland T8, 15tr Winterland T7, 32tr VR Render, 68tr Forestia, 10tr Thảo trả nợ mượn thêm).
     • Các dòng mang mã CÓ chứa `_offset` (ví dụ: `inc_FT..._offset_chua`, `inc_FT..._offset_qua`): Khoản doanh thu đối ứng / cấn trừ chi phí (tiền quà Trung Thu 7.1tr, tiền đi chùa chia đôi 2.605k), KHÔNG phát sinh dòng tiền thực tế qua ngân hàng.
     • CHI TIẾT BẢN TÍNH CÔNG NỢ ĐỢT 22/09 CỦA THẢO:
       - Tổng nợ ban đầu: 153.500.000 VNĐ (gồm: Forestia 81.5tr, Winterland T8 15tr, VR Render 32tr, Winterland T7 15tr, Mượn thêm 10tr).
       - Trừ chi phí cấn trừ đối ứng: 9.705.000 VNĐ (Quà Trung Thu 7.1tr, Tiền đi chùa 2.605k).
       - Số tiền Thảo PHẢI TRẢ sau cấn trừ: 143.795.000 VNĐ.
       - Thảo chuyển khoản thực tế: 140.000.000 VNĐ.
       - Thảo còn thiếu lại của đợt này: 3.795.000 VNĐ. (Cùng ngày 22/09 Thảo vay thêm 10tr, nên tổng công nợ Thảo còn nợ sếp hiện tại là 13.795.000 VNĐ).
     • KHI TRẢ LỜI SẾP: Giải thích rõ ràng mạch lạc cả bản tính công nợ gốc (153.5tr), cấn trừ (9.705k), số tiền phải trả (143.795k), số tiền thực tế Thảo chuyển (140tr) và số tiền Thảo còn nợ lại (3.795k) để sếp nắm tường tận 100%!
7. CHI PHÍ & TÀI CHÍNH (EXPENSE):
   - Khi sếp hỏi về chi phí hôm nay / hôm qua / ngày cụ thể (ví dụ: 'báo cáo chi phí hôm nay', 'hôm nay chi những gì', 'chi phí ngày 06/10'):
     • HÃY GỌI NGAY công cụ `get_daily_expenses(date_str=...)` để lấy danh sách chi tiết các khoản chi và tổng chi phí trong ngày, sau đó báo cáo mạch lạc, rõ ràng cho sếp!
   - Khi sếp hỏi tổng quan tháng (thu, chi, dòng tiền ròng cả tháng): Gọi `get_finance_summary`.
   - Khi sếp báo khoản chi mới phát sinh bằng tiền mặt: Gọi `record_expense`. Hệ thống sẽ tự động đối soát thông minh: nếu trùng với khoản ngân hàng/MoMo vừa quét được, nó sẽ tự động cập nhật vào giao dịch ngân hàng đó thay vì tạo bản ghi tiền mặt trùng lặp!
8. KHI SẾP PHẢN HỒI VỀ KHOẢN CHI CẦN DUYỆT (ACTIONS / PHÂN LOẠI CHI PHÍ):
   - Khi sếp reply hoặc nhắn giải thích về một khoản chi đang cần sếp input (ví dụ: 'cái này là bánh tráng trộn', 'khoản 27k là ăn vặt', '8tr6 là tiền học', 'mua đạo cụ Ensure', 'mua cafe gặp khách'):
   - HÃY GỌI NGAY `resolve_pending_expense_action` với tên món sếp đã mua (ví dụ 'Tiền học', 'Bánh tráng trộn'), tự động suy luận Category ('Gia đình & Định kỳ', 'Food / Meeting'...) và Dự án ('PROJ-CANHAN' hoặc 'PROJ-CONGTY') để cập nhật giao dịch và đóng Action item!
   - Không được từ chối sếp khi sếp hỏi báo cáo chi phí hôm nay!
9. Trả lời bằng Markdown gọn gàng, đẹp mắt, có icon sinh động, chuyên nghiệp.
10. QUÉT EMAIL THU CHI & GIỚI HẠN NĂNG LỰC:
   - Bot Telegram của em ĐÃ ĐƯỢC TÍCH HỢP bộ quét email tự động (qua Composio Gmail API) chạy tự động ngay trước bản tin sáng 08:00 và báo cáo tối 21:00 cùng lệnh `/scan_mail` để quét hóa đơn ngân hàng & MoMo.
   - Khi sếp yêu cầu 'quét mail', 'kiểm tra mail thu chi', hệ thống sẽ tự động kích hoạt tính năng quét mail.
   - Đối với các tác vụ nặng như: bóc tách file docx/pdf hợp đồng phức tạp, phân tích kịch bản sâu, tạo folder Drive: sếp mở Antigravity trên PC để các bạn Agent local xử lý bóc tách chuẩn xác nhất.
11. HỒ SƠ KHÁCH HÀNG & THÔNG TIN PHÁP LÝ (CLIENTS):
   - Khi sếp hỏi thông tin pháp lý, mã số thuế (MST), địa chỉ, người đại diện pháp luật, chức vụ, hay thông tin đối tác/khách hàng (ví dụ: 'thông tin pháp lý k87k', 'mst của VistaX là gì', 'đại diện clevergroup là ai', 'tra cứu đối tác 9kolor', 'khách hàng inverse'):
     • BẮT BUỘC GỌI NGAY công cụ `get_client_info(client_name_or_id=...)` để truy vấn bảng `clients` trong cơ sở dữ liệu!
     • Bảng `clients` là Single Source of Truth cho toàn bộ hồ sơ pháp lý đối tác.
     • Trình bày thông tin pháp lý đầy đủ, trang trọng: Tên công ty, MST/CNĐKKD, Địa chỉ, Đại diện pháp luật, Chức vụ, Ghi chú hợp tác.
     • TUYỆT ĐỐI không từ chối hoặc trả lời chung chung khi chưa gọi `get_client_info`!
"""

    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        tools=AI_TOOLS,
        system_instruction=system_instruction
    )
    chat = model.start_chat(enable_automatic_function_calling=True)
    chat_sessions[chat_id] = {"chat": chat, "date": today_str}
    return chat

def ask_gemini(user_message: str, chat_id: str = "default"):
    """
    Sends message to Gemini 2.5 Flash with full An Phim system prompt, memory, and tools.
    """
    if not GEMINI_API_KEY:
        return "Dạ sếp, hiện chưa có GEMINI_API_KEY để em suy nghĩ và trả lời ạ.", []

    try:
        chat = get_chat_session(chat_id)

        now = get_now()
        days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
        day_name = days_vi[now.weekday()]
        today_str = now.strftime('%Y-%m-%d')
        tomorrow_str = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        time_str = now.strftime('%H:%M')

        # Real-time anchor prefix so Gemini always grounds in exact time & date
        prompt_with_time = f"[Thời gian thực tế: {day_name}, ngày {today_str} lúc {time_str}. Ngày mai là: {tomorrow_str}]\n{user_message}"
        response = chat.send_message(prompt_with_time)

        # Inspect if any task creation/update occurred to generate interactive buttons
        affected_tasks = []
        for msg in chat.history[-4:]:
            for part in msg.parts:
                fn_resp = getattr(part, 'function_response', None)
                if fn_resp and fn_resp.name in ['create_schedule_task', 'update_schedule_task', 'create_action_task']:
                    try:
                        resp_data = fn_resp.response.get('result', '')
                        if isinstance(resp_data, str):
                            parsed_d = json.loads(resp_data)
                            if 'task_id' in parsed_d:
                                affected_tasks.append(parsed_d)
                    except Exception:
                        pass

        return response.text, affected_tasks

    except Exception as e:
        logger.error(f"Gemini AI Error: {e}")
        chat_sessions.pop(chat_id, None)
        return f"Dạ sếp ơi, em đang gặp chút gián đoạn kết nối với bộ não AI ({e}), sếp thử lại giúp em nhé ạ!", []

# ==================== MAIL SCANNER INTEGRATION ====================

def perform_mail_scan(interactive=False, target_message=None, scan_label="Tự động"):
    """
    Kích hoạt quét email thu chi ngân hàng & MoMo qua mail_scanner.py
    Gửi báo cáo vào Topic Finance (Thu chi & Tài chính).
    Nếu interactive=True, gửi phản hồi trực tiếp tới tin nhắn của sếp.
    """
    if scan_mail_job is None:
        err_msg = "⚠️ Module `mail_scanner` chưa sẵn sàng trên hệ thống."
        if interactive and target_message:
            send_safe_message(target_message, err_msg)
        return

    status_msg = None
    if interactive and target_message:
        try:
            status_msg = bot.reply_to(target_message, "⏳ *Trâm Anh đang kết nối hòm thư & quét hóa đơn ngân hàng / MoMo...*", parse_mode="Markdown")
        except Exception:
            pass

    try:
        res = scan_mail_job(limit=20)
    except Exception as e:
        logger.error(f"Error executing scan_mail_job: {e}")
        res = {"status": "error", "message": str(e)}

    if status_msg and interactive and target_message:
        try:
            bot.delete_message(target_message.chat.id, status_msg.message_id)
        except Exception:
            pass

    now = get_now()
    time_str = now.strftime('%H:%M - %d/%m/%Y')

    if res.get("status") == "error":
        msg = f"❌ *[QUÉT EMAIL THU CHI THẤT BẠI - {scan_label}]*\n\nChi tiết lỗi: `{res.get('message')}`"
        for chat_target, thread_target in get_notification_targets("finance"):
            send_safe_message(chat_target, msg, message_thread_id=thread_target)
        if interactive and target_message:
            send_safe_message(target_message, msg)
        return

    success_tx = res.get("successful_transactions", [])
    pending_ai = res.get("pending_ai_tasks", [])

    if not success_tx and not pending_ai:
        if interactive and target_message:
            send_safe_message(
                target_message,
                f"✅ *QUÉT EMAIL THU CHI HOÀN TẤT ({scan_label})*\n"
                f"🕒 Thời gian: `{time_str}`\n\n"
                f"✨ Không có giao dịch ngân hàng / MoMo mới nào phát sinh cần xử lý ạ!"
            )
        else:
            logger.info(f"Scheduled mail scan ({scan_label}): No new transactions found. Staying silent to avoid buzzing sếp.")
        return

    report = (
        f"📩 *[KẾT QUẢ QUÉT EMAIL THU CHI - {scan_label}]*\n"
        f"🕒 Thời gian: `{time_str}`\n\n"
    )

    if success_tx:
        report += f"✅ *ĐÃ GHI NHẬN THÀNH CÔNG ({len(success_tx)} giao dịch):*\n"
        for tx in success_tx:
            amt = f"{tx['amount']:,.0f} đ"
            v = tx.get('vendor', 'N/A')
            c = tx.get('category', 'Khác')
            p = tx.get('project_id', 'N/A')
            t_id = tx.get('t_id', '')
            report += f"• 💰 `{amt}` | *{v}*\n"
            report += f"  🏷️ Hạng mục: _{c}_ | Dự án: `{p}`\n"
            if t_id:
                report += f"  🔖 Mã: `{t_id}`\n"
        report += "\n"

    if pending_ai:
        report += f"⚠️ *CẦN SẾP PHÂN LOẠI / XÁC NHẬN ({len(pending_ai)} giao dịch):*\n"
        for p in pending_ai:
            amt = f"{p['amount']:,.0f} đ"
            v = p.get('vendor', 'Chưa rõ')
            n = p.get('note', '')
            report += f"• ❓ `{amt}` - *{v}*\n"
            if n:
                report += f"  📝 Nội dung: _{n[:60]}_\n"
            report += f"  👉 Đã tạo Action item để sếp duyệt.\n"
        report += "\n"

    report += "📊 Dữ liệu tài chính đã được cập nhật tự động vào hệ thống AN PHIM."

    for chat_target, thread_target in get_notification_targets("finance"):
        send_safe_message(chat_target, report, message_thread_id=thread_target)

    # Nếu có giao dịch chưa phân loại, gửi thông báo trực tiếp vào Topic Cần Sếp Duyệt (Actions) kèm Nút Bấm 1-chạm
    if pending_ai:
        for p in pending_ai:
            amt_str = f"{p['amount']:,.0f} đ"
            v = p.get('vendor', 'Chưa rõ')
            n = p.get('note', '')
            t_code = p.get('t_id', '')
            act_id = p.get('action_id', '')
            if not act_id and t_code:
                row = execute_query("SELECT id FROM actions WHERE (notes LIKE %s OR title LIKE %s) AND status = 'Pending'", (f"%{t_code}%", f"%{t_code}%"), fetch=True)
                if row:
                    act_id = row[0]['id']
                else:
                    new_act_id = f"act_{uuid.uuid4().hex[:8]}"
                    task_title = f"Bổ sung thông tin khoản chi {amt_str} cho {v} ({n})"
                    task_notes = f"Mã giao dịch: {t_code}. Sếp vui lòng xác nhận Dự án & Hạng mục."
                    execute_query("""
                        INSERT INTO actions (id, priorityorder, title, projectid, prioritylevel, suggestedagent, status, category, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (new_act_id, 1, task_title, p.get('project_id'), "High", "Minh Thu", "Pending", "work", task_notes))
                    act_id = new_act_id
            elif not act_id:
                new_act_id = f"act_{uuid.uuid4().hex[:8]}"
                task_title = f"Bổ sung thông tin khoản chi {amt_str} cho {v} ({n})"
                task_notes = f"Sếp vui lòng xác nhận Dự án & Hạng mục."
                execute_query("""
                    INSERT INTO actions (id, priorityorder, title, projectid, prioritylevel, suggestedagent, status, category, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (new_act_id, 1, task_title, p.get('project_id'), "High", "Minh Thu", "Pending", "work", task_notes))
                act_id = new_act_id

            action_msg = (
                f"⚡ *[CẦN SẾP DUYỆT / INPUT - THU CHI]*\n"
                f"🕒 Thời gian: `{time_str}`\n\n"
                f"Phát hiện giao dịch chưa đủ thông tin phân loại:\n"
                f"• 💰 Số tiền: `{amt_str}`\n"
                f"• 👤 Người nhận: *{v}*\n"
            )
            if n:
                action_msg += f"• 📝 Nội dung: _{n}_\n"
            if t_code:
                action_msg += f"• 🔖 Mã giao dịch: `{t_code}`\n"
            action_msg += (
                f"\n👉 Sếp chọn nhanh bằng nút bấm bên dưới (hoặc gõ tên món/dự án để em lưu nhé):"
            )
            markup = build_expense_classification_keyboard(act_id) if act_id else None
            for chat_target, thread_target in get_notification_targets("actions"):
                send_safe_message(chat_target, action_msg, reply_markup=markup, message_thread_id=thread_target)

    if interactive and target_message:
        thread_id = getattr(target_message, 'message_thread_id', None)
        target_finance_thread = get_topic_thread_id("finance")
        if target_message.chat.id != get_group_chat_id() or thread_id != target_finance_thread:
            send_safe_message(target_message, report)

# ==================== TELEGRAM COMMANDS ====================

def setup_bot_commands():
    """
    Registers command menu with Telegram Bot API so users have a convenient button menu.
    """
    commands = [
        types.BotCommand("today", "Lịch trình & task hôm nay"),
        types.BotCommand("tomorrow", "Lịch trình & task ngày mai"),
        types.BotCommand("week", "Lịch trình tuần này"),
        types.BotCommand("report", "Báo cáo tổng hợp tình hình"),
        types.BotCommand("scan_mail", "Quét email thu chi ngân hàng & MoMo"),
        types.BotCommand("projects", "Tiến độ dự án đang chạy"),
        types.BotCommand("finance", "Tổng quan tài chính & dòng tiền"),
        types.BotCommand("actions", "Việc cần sếp duyệt / input"),
        types.BotCommand("setup_topics", "Thiết lập Topics cho nhóm AN PHIM MEDIA"),
        types.BotCommand("help", "Hướng dẫn tương tác với Trâm Anh")
    ]
    try:
        bot.set_my_commands(commands)
        logger.info("Telegram Bot commands menu registered successfully.")
    except Exception as e:
        logger.warning(f"Could not register bot commands: {e}")

@bot.message_handler(commands=['scan_mail'])
def handle_scan_mail(message):
    if not is_authorized(message):
        return
    perform_mail_scan(interactive=True, target_message=message, scan_label="Lệnh thủ công")

@bot.message_handler(commands=['start', 'help'])
def handle_start(message):
    if not is_authorized(message):
        send_safe_message(message, "Xin lỗi, em chỉ phục vụ riêng cho sếp An Phan thôi ạ!")
        return

    if message.chat.type in ['group', 'supergroup']:
        group_text = (
            f"👋 *Chào Sếp An! Em đã có mặt trong nhóm {message.chat.title}* 🎉\n\n"
            "Em sẵn sàng hỗ trợ sếp quản lý lịch trình, dự án và tài chính theo từng Topic chuyên biệt.\n\n"
            "👉 *Để kích hoạt không gian làm việc:* Sếp gõ lệnh `/setup_topics`\n"
            "Trâm Anh sẽ tự động tạo ngay 4 Topics chuyên môn cho AN PHIM MEDIA:\n"
            "• 📅 `Lịch trình & Báo cáo` (Báo cáo sáng 08h, tối 21h, nhắc hẹn)\n"
            "• 💵 `Thu chi & Tài chính` (Quét mail ngân hàng, dòng tiền)\n"
            "• 🎯 `Tiến độ & Dự án` (Deadline, mốc dự án)\n"
            "• ⚡ `Cần Sếp Duyệt (Actions)` (Việc cấp bách các Agent cần sếp duyệt)\n\n"
            "Kênh `# General` chính là nơi sếp chat và ra lệnh điều hành cho em trực tiếp!"
        )
        send_safe_message(message, group_text)
        return

    help_text = (
        "👋 *Chào Sếp An! Em là Trâm Anh - Trợ lý PM của Sếp.*\n\n"
        "Em đang hoạt động trực tiếp 24/7 trên Google Cloud để hỗ trợ sếp toàn diện:\n\n"
        "⏰ *TÍNH NĂNG TỰ ĐỘNG THÔNG MINH:*\n"
        "• 🔔 *Nhắc trước 60 phút & 15 phút* cho mọi cuộc hẹn, lịch họp, lịch quay (kèm nút bấm ✅ Hoàn thành).\n"
        "• ☀️ *08:00 sáng:* Điểm tin & tổng hợp lịch trình làm việc ngày mới.\n"
        "• 🌙 *21:00 tối:* Báo cáo tổng kết ngày (việc đã xong, việc tồn đọng, việc cần duyệt).\n"
        "• 📩 *08:00 & 21:00:* Tự động quét email ngân hàng & MoMo ngay trước bản tin sáng và tối.\n\n"
        "📋 *CÁC LỆNH NHANH (MENU):*\n"
        "• `/today`: Lịch trình hôm nay\n"
        "• `/tomorrow`: Lịch trình ngày mai\n"
        "• `/week`: Lịch trình 7 ngày tới\n"
        "• `/report`: Báo cáo tổng hợp tình hình tức thì\n"
        "• `/scan_mail`: Quét email thu chi ngân hàng & MoMo\n"
        "• `/projects`: Tiến độ các dự án đang chạy\n"
        "• `/finance`: Dòng tiền & thu chi tháng này\n"
        "• `/actions`: Các việc cần sếp duyệt\n"
        "• `/client`: Tra cứu hồ sơ & pháp lý đối tác/khách hàng\n\n"
        "🧠 *TRÒ CHUYỆN TỰ NHIÊN VỚI GEMINI 2.5 FLASH:*\n"
        "Sếp có thể nhắn tin ra lệnh cho em bất cứ lúc nào:\n"
        "👉 *'mai anh có lịch gì?'*\n"
        "👉 *'note mai 15h họp kịch bản với đối tác'*\n"
        "👉 *'dời lịch họp kịch bản sang 16h'*\n"
        "👉 *'quét mail đi em'* (Kích hoạt quét email thu chi)\n"
        "👉 *'chi 150k tiền ăn trưa'* (Tự động ghi nhận chi tiền mặt)\n"
        "👉 *'tiến độ dự án Forestia thế nào?'*\n"
        "👉 *'xin thông tin pháp lý của K87K'* (Tra cứu đối tác/khách hàng)"
    )
    send_safe_message(message, help_text)

@bot.message_handler(commands=['setup_topics'])
def handle_setup_topics(message):
    if not is_authorized(message):
        send_safe_message(message, "Xin lỗi, em chỉ phục vụ riêng cho sếp An Phan thôi ạ!")
        return

    chat_id = message.chat.id
    if message.chat.type not in ['group', 'supergroup']:
        send_safe_message(message, "⚠️ Lệnh này chỉ chạy trong Group Telegram có bật tính năng Topics sếp nhé!")
        return

    send_safe_message(message, "⏳ *Trâm Anh đang tự động khởi tạo các Topics cho AN PHIM...*")

    topics_to_create = [
        ("📅 Lịch trình & Báo cáo", "schedule", 0x6FB9F0),
        ("💵 Thu chi & Tài chính", "finance", 0x8EEE98),
        ("🎯 Tiến độ & Dự án", "projects", 0xFFD67E),
        ("⚡ Cần Sếp Duyệt (Actions)", "actions", 0xFB6F5F),
    ]

    cfg = load_topics_config()
    created = cfg.get('topics', {})

    welcome_msgs = {
        'schedule': (
            "📅 *TOPIC LỊCH TRÌNH & BÁO CÁO*\n\n"
            "Trâm Anh sẽ gửi vào đây:\n"
            "• ☀️ 08:00: Điểm tin sáng & Lịch làm việc hôm nay\n"
            "• 🌙 21:00: Báo cáo tổng kết ngày\n"
            "• 🔔 Nhắc hẹn trước 60p & 15p các cuộc họp/lịch quay."
        ),
        'finance': (
            "💵 *TOPIC THU CHI & TÀI CHÍNH*\n\n"
            "Trâm Anh & Minh Thư sẽ gửi vào đây:\n"
            "• 📩 Báo cáo sau khi quét email ngân hàng / MoMo\n"
            "• 🔍 Yêu cầu sếp phân loại các khoản chi lạ (pending AI)\n"
            "• 📊 Báo cáo dòng tiền, tạm ứng, thanh toán theo đợt."
        ),
        'projects': (
            "🎯 *TOPIC TIẾN ĐỘ & DỰ ÁN*\n\n"
            "Theo dõi dự án AN PHIM:\n"
            "• 🚀 Cập nhật deadline, milestones sắp tới\n"
            "• 📋 Giao việc và giám sát tiến độ thực hiện."
        ),
        'actions': (
            "⚡ *TOPIC CẦN SẾP DUYỆT (ACTIONS)*\n\n"
            "Nơi lưu các yêu cầu cấp bách từ các Agent:\n"
            "• 📝 Duyệt bản nháp Báo giá (Quốc Bảo)\n"
            "• 📑 Duyệt bản thảo Hợp đồng dịch vụ (Minh Thư)\n"
            "• 🎨 Duyệt kế hoạch nội dung / kịch bản (Minh Đan)."
        )
    }

    for name, key, color in topics_to_create:
        try:
            topic = bot.create_forum_topic(chat_id, name, icon_color=color)
            created[key] = topic.message_thread_id
            time.sleep(0.5)
            send_safe_message(chat_id, welcome_msgs.get(key, name), message_thread_id=topic.message_thread_id)
        except Exception as e:
            logger.warning(f"Could not create topic {name}: {e}")

    cfg['group_chat_id'] = chat_id
    cfg['group_title'] = message.chat.title
    cfg['topics'] = created
    cfg['updated_at'] = get_now().isoformat()
    save_topics_config(cfg)

    result_text = (
        "🎉 *KHỞI TẠO TOPICS THÀNH CÔNG!*\n\n"
        f"Trâm Anh đã liên kết nhóm *{message.chat.title}* và tạo thành công {len(created)} Topics chuẩn cho AN PHIM MEDIA:\n"
    )
    for name, key, _ in topics_to_create:
        t_id = created.get(key)
        result_text += f"• *{name}* (ID: `{t_id}`)\n"
    result_text += (
        "\nTừ bây giờ, tất cả thông báo tự động (Lịch trình, Báo cáo, Tài chính) sẽ được Trâm Anh tự động điều phối vào đúng từng Topic chuyên biệt! 🚀"
    )

    send_safe_message(message, result_text)

@bot.message_handler(commands=['today'])
def handle_today(message):
    if not is_authorized(message):
        return

    today_str = get_today_str()
    events = get_aggregated_events(today_str, today_str)

    if not events:
        send_safe_message(message, f"📅 *Hôm nay ({today_str}) sếp chưa có lịch hẹn hay deadline nào trong hệ thống ạ!* 🎉\n\nSếp có thể nhắn em ví dụ: `note 14h họp kịch bản` để em lưu lịch nhé.")
        return

    msg = f"📅 *LỊCH TRÌNH & DEADLINE HÔM NAY ({today_str})*\n\n"
    markup = types.InlineKeyboardMarkup()
    for idx, r in enumerate(events, 1):
        status_icon = "✅" if r['status'] == 'done' else "⏳"
        start_t = r['startTime'] or "--:--"
        end_t = r['endTime'] or "--:--"
        tag = "📌 Lịch hẹn" if r['type'] == 'schedule' else ("🚨 Hạn chót" if r['type'] == 'project_deadline' else "🎯 Cột mốc")
        msg += f"{idx}. {status_icon} *{r['title']}*\n"
        msg += f"   🕒 `{start_t} - {end_t}` | 🏷️ _{tag}_\n\n"

        if r['status'] != 'done' and r['type'] == 'schedule':
            btn_text = f"✅ Xong: {r['title'][:25]}"
            markup.add(types.InlineKeyboardButton(text=btn_text, callback_data=f"done_{r['id']}"))

    send_safe_message(message, msg, reply_markup=markup if markup.keyboard else None)

@bot.message_handler(commands=['tomorrow'])
def handle_tomorrow(message):
    if not is_authorized(message):
        return

    tomorrow_str = (get_now() + timedelta(days=1)).strftime('%Y-%m-%d')
    events = get_aggregated_events(tomorrow_str, tomorrow_str)

    if not events:
        send_safe_message(message, f"📅 *Ngày mai ({tomorrow_str}) sếp chưa có lịch hẹn hay deadline nào được lên trước ạ!* ✨")
        return

    tomorrow_todo = [r for r in events if r['status'] != 'done']
    tomorrow_done = [r for r in events if r['status'] == 'done']

    msg = f"📅 *LỊCH TRÌNH & DEADLINE NGÀY MAI ({tomorrow_str})*\n\n"
    markup = types.InlineKeyboardMarkup()

    if tomorrow_todo:
        msg += f"👉 *Công việc cần thực hiện ({len(tomorrow_todo)}):*\n"
        for idx, r in enumerate(tomorrow_todo, 1):
            start_t = r['startTime'] or "--:--"
            end_t = r['endTime'] or "--:--"
            tag = "📌 Lịch hẹn" if r['type'] == 'schedule' else ("🚨 Hạn chót" if r['type'] == 'project_deadline' else "🎯 Cột mốc")
            msg += f"{idx}. ⏳ *{r['title']}*\n"
            msg += f"   🕒 `{start_t} - {end_t}` | 🏷️ _{tag}_\n\n"
            if r['type'] == 'schedule':
                markup.add(types.InlineKeyboardButton(text=f"✅ Xong: {r['title'][:25]}", callback_data=f"done_{r['id']}"))
    else:
        msg += "✨ *Ngày mai sếp không còn công việc nào tồn đọng cần làm ạ!*\n\n"

    if tomorrow_done:
        msg += f"👉 *Công việc đã hoàn thành trước ({len(tomorrow_done)}):*\n"
        for r in tomorrow_done:
            start_t = r['startTime'] or "--:--"
            end_t = r['endTime'] or "--:--"
            msg += f"• ✅ ~{r['title']}~ (`{start_t} - {end_t}`) - _(Đã hoàn thành)_\n"
        msg += "\n"

    send_safe_message(message, msg, reply_markup=markup if markup.keyboard else None)

@bot.message_handler(commands=['week'])
def handle_week(message):
    if not is_authorized(message):
        return

    now = get_now()
    start_date = now.strftime('%Y-%m-%d')
    end_date = (now + timedelta(days=8)).strftime('%Y-%m-%d')

    events = get_aggregated_events(start_date, end_date)

    if not events:
        send_safe_message(message, f"📅 Trong những ngày tới ({start_date} -> {end_date}) sếp chưa có lịch hẹn hay deadline nào ạ! 🎉")
        return

    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    msg = f"🗓️ *LỊCH TRÌNH & DEADLINE CÁC NGÀY TỚI ({start_date} -> {end_date}):*\n"
    current_d = ""
    for r in events:
        if r['date'] != current_d:
            current_d = r['date']
            d_obj = datetime.strptime(current_d, '%Y-%m-%d')
            d_vn = d_obj.strftime('%d/%m/%Y')
            d_name = days_vi[d_obj.weekday()]
            msg += f"\n📌 *{d_name} ({d_vn}):*\n"
        icon = "✅" if r['status'] == 'done' else "⏳"
        tag = "📌" if r['type'] == 'schedule' else ("🚨" if r['type'] == 'project_deadline' else "🎯")
        msg += f"  • {icon} {tag} `{r['startTime']}`: {r['title']}\n"

    send_safe_message(message, msg)

@bot.message_handler(commands=['report'])
def handle_report(message):
    if not is_authorized(message):
        return

    bot.send_chat_action(message.chat.id, 'typing')
    today_str = get_today_str()
    now = get_now()

    # Schedule
    schedules = execute_query(
        'SELECT title, "startTime", status FROM schedule WHERE date = %s ORDER BY "startTime" ASC',
        (today_str,),
        fetch=True
    ) or []
    done_tasks = [s for s in schedules if s['status'] == 'done']
    todo_tasks = [s for s in schedules if s['status'] != 'done']

    # Projects
    projects = execute_query(
        "SELECT name, client, status FROM projects WHERE status IN ('Đang làm', 'Chờ feedback', 'Cần revise')",
        fetch=True
    ) or []

    # Actions
    actions = execute_query(
        "SELECT title, suggestedagent FROM actions WHERE status = 'Pending' LIMIT 3",
        fetch=True
    ) or []

    # Finance
    month_prefix = now.strftime('%Y-%m')
    inc_res = execute_query("SELECT SUM(amount) AS total FROM incomes WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    exp_res = execute_query("SELECT SUM(amount) AS total FROM expensetransactions WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    inc = float(inc_res[0]['total'] or 0) if inc_res else 0.0
    exp = float(exp_res[0]['total'] or 0) if exp_res else 0.0

    msg = f"📊 *BÁO CÁO TỔNG HỢP TỨC THÌ ({now.strftime('%H:%M %d/%m/%Y')})*\n\n"

    msg += f"🗓️ *Lịch trình hôm nay:* Đã xong `{len(done_tasks)}/{len(schedules)}` việc.\n"
    if todo_tasks:
        for t in todo_tasks:
            msg += f"   ⏳ `{t['startTime']}`: {t['title']}\n"
    msg += "\n"

    msg += f"🎬 *Dự án đang chạy:* `{len(projects)} dự án`\n"
    for p in projects[:4]:
        msg += f"   • *{p['name']}* ({p['client']}) - _{p['status']}_\n"
    if len(projects) > 4:
        msg += f"   _(và {len(projects)-4} dự án khác)_\n"
    msg += "\n"

    if actions:
        msg += f"⚠️ *Việc cần sếp duyệt ({len(actions)}):*\n"
        for a in actions:
            msg += f"   • [{a.get('suggestedagent', 'Agent')}]: {a['title']}\n"
        msg += "\n"

    msg += (
        f"💰 *Dòng tiền tháng {now.strftime('%m/%Y')}:*\n"
        f"   • Thu: `{inc:,.0f} đ` | Chi: `{exp:,.0f} đ` | Ròng: `{(inc-exp):,.0f} đ`\n\n"
        f"Chúc sếp điều hành công việc thật hiệu quả! 🚀"
    )
    send_safe_message(message, msg)

@bot.message_handler(commands=['actions'])
def handle_actions(message):
    if not is_authorized(message):
        return

    rows = execute_query(
        "SELECT id, title, prioritylevel, suggestedagent, notes FROM actions WHERE status = 'Pending' ORDER BY priorityorder ASC",
        fetch=True
    )

    if not rows:
        send_safe_message(message, "✨ *Tuyệt vời sếp ơi!* Hiện không có Action item nào cần sếp input hay phê duyệt cả ạ.")
        return

    msg = f"📋 *DANH SÁCH VIỆC CẦN SẾP DUYỆT / INPUT ({len(rows)} mục):*\n"
    send_safe_message(message, msg)

    for idx, r in enumerate(rows, 1):
        act_id = r['id']
        agent = r.get('suggestedagent') or 'AI Agent'
        level = r.get('prioritylevel') or 'Normal'
        title = r.get('title') or ''
        notes = r.get('notes') or ''

        is_exp = 'khoản chi' in title.lower() or 'exp_' in notes or 'exp_' in title
        markup = build_expense_classification_keyboard(act_id) if is_exp else None

        card_text = f"*{idx}.* [{level}] *{agent}*: {title}"
        if notes:
            card_text += f"\nℹ️ _{notes}_"
        if markup:
            card_text += "\n👉 *Sếp bấm chọn nhanh bên dưới:*"

        send_safe_message(message, card_text, reply_markup=markup)

@bot.message_handler(commands=['projects'])
def handle_projects(message):
    if not is_authorized(message):
        return

    rows = execute_query(
        "SELECT id, name, client, status, budget, received FROM projects WHERE status IN ('Đang làm', 'Chờ feedback', 'Cần revise') ORDER BY id ASC",
        fetch=True
    )

    if not rows:
        send_safe_message(message, "📁 Không có dự án nào đang chạy.")
        return

    msg = f"🚀 *TIẾN ĐỘ DỰ ÁN ĐANG HOẠT ĐỘNG ({len(rows)} dự án):*\n\n"
    for r in rows:
        budget = f"{r['budget']:,.0f} đ" if r.get('budget') else "0 đ"
        received = f"{r['received']:,.0f} đ" if r.get('received') else "0 đ"
        status_tag = r['status']
        msg += f"🎬 *{r['name']}* ({r['client']})\n"
        msg += f"   • Trạng thái: *{status_tag}*\n"
        msg += f"   • Đã nhận: `{received}` / `{budget}`\n\n"

    send_safe_message(message, msg)

@bot.message_handler(commands=['finance'])
def handle_finance(message):
    if not is_authorized(message):
        return

    now = get_now()
    month_prefix = now.strftime('%Y-%m')
    inc_res = execute_query("SELECT SUM(amount) AS total FROM incomes WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    exp_res = execute_query("SELECT SUM(amount) AS total FROM expensetransactions WHERE date LIKE %s", (f"{month_prefix}%",), fetch=True)
    inc = float(inc_res[0]['total'] or 0) if inc_res else 0.0
    exp = float(exp_res[0]['total'] or 0) if exp_res else 0.0
    net = inc - exp

    msg = (
        f"💰 *TỔNG QUAN DÒNG TIỀN THÁNG {now.strftime('%m/%Y')} (Tài khoản cá nhân):*\n\n"
        f"🟢 *Tổng thu (Income):* `{inc:,.0f} đ`\n"
        f"🔴 *Tổng chi (Expense):* `{exp:,.0f} đ`\n"
        f"⚖️ *Dòng tiền ròng (Net):* `{net:,.0f} đ`\n\n"
        f"_(Số liệu được đối soát tự động theo sao kê ngân hàng & MoMo)_"
    )
    send_safe_message(message, msg)

@bot.message_handler(commands=['client', 'clients'])
def handle_client(message):
    if not is_authorized(message):
        return

    parts = message.text.split(maxsplit=1)
    if len(parts) < 2:
        rows = execute_query("SELECT id, name, tax_id FROM clients ORDER BY id ASC", fetch=True)
        if not rows:
            send_safe_message(message, "🏢 Chưa có hồ sơ khách hàng nào trong bảng clients.")
            return
        msg = f"🏢 *DANH SÁCH ĐỐI TÁC & KHÁCH HÀNG ({len(rows)} đối tác):*\n\n"
        for r in rows:
            name_str = r.get('name') or r.get('id')
            tax_str = f" (`{r.get('tax_id')}`)" if r.get('tax_id') else ""
            msg += f"• *{r['id']}*: {name_str}{tax_str}\n"
        msg += "\n💡 _Gõ `/client <mã hoặc tên>` để xem thông tin pháp lý chi tiết._"
        send_safe_message(message, msg)
        return

    kw = parts[1].strip()
    rows = execute_query(
        """SELECT id, name, tax_id, address, rep_name, rep_role, notes, payment_habits 
           FROM clients 
           WHERE id ILIKE %s OR name ILIKE %s OR notes ILIKE %s LIMIT 5""",
        (f"%{kw}%", f"%{kw}%", f"%{kw}%"),
        fetch=True
    )
    if not rows:
        send_safe_message(message, f"❌ Không tìm thấy đối tác/khách hàng nào khớp với: *{kw}*")
        return

    msg = ""
    for r in rows:
        title = r.get('name') or r.get('id')
        msg += f"🏢 *HỒ SƠ PHÁP LÝ: {title}*\n"
        msg += f"• *Mã đối tác:* `{r.get('id')}`\n"
        if r.get('tax_id'):
            msg += f"• *Mã số thuế / CNĐKKD:* `{r.get('tax_id')}`\n"
        if r.get('address'):
            msg += f"• *Địa chỉ:* {r.get('address')}\n"
        if r.get('rep_name'):
            rep = r.get('rep_name')
            role = f" ({r.get('rep_role')})" if r.get('rep_role') else ""
            msg += f"• *Người đại diện:* {rep}{role}\n"
        if r.get('payment_habits'):
            msg += f"• *Thói quen thanh toán:* {r.get('payment_habits')}\n"
        if r.get('notes'):
            msg += f"• *Ghi chú:* {r.get('notes')}\n"
        msg += "\n"

    send_safe_message(message, msg.strip())

# Callback query for Inline Buttons
@bot.callback_query_handler(func=lambda call: call.data.startswith("done_"))
def handle_task_done(call):
    task_id = call.data.replace("done_", "")
    if task_id.startswith("act_"):
        success = execute_query("UPDATE actions SET status = 'Done' WHERE id = %s", (task_id,))
    else:
        success = execute_query("UPDATE schedule SET status = 'done' WHERE id = %s", (task_id,))

    if success:
        bot.answer_callback_query(call.id, text="✅ Đã đánh dấu hoàn thành!", show_alert=False)
        try:
            bot.edit_message_text(
                chat_id=call.message.chat.id,
                message_id=call.message.message_id,
                text=f"{call.message.text}\n\n✅ *[ĐÃ ĐÁNH DẤU HOÀN THÀNH LÚC {get_now().strftime('%H:%M')}]*"
            )
        except Exception:
            pass
    else:
        bot.answer_callback_query(call.id, text="❌ Có lỗi xảy ra khi cập nhật DB.", show_alert=True)

def build_expense_classification_keyboard(act_id: str):
    """Tạo bộ nút bấm 1-chạm giúp sếp duyệt nhanh phân loại chi phí ngay trên Telegram."""
    markup = types.InlineKeyboardMarkup(row_width=2)
    b1 = types.InlineKeyboardButton("🍜 Ăn uống (Cá nhân)", callback_data=f"clf:{act_id}:fnb")
    b2 = types.InlineKeyboardButton("🛒 Mua sắm (Cá nhân)", callback_data=f"clf:{act_id}:shop")
    b3 = types.InlineKeyboardButton("🚕 Di chuyển (Cá nhân)", callback_data=f"clf:{act_id}:trans")
    b4 = types.InlineKeyboardButton("🏡 Gia đình / Con cái", callback_data=f"clf:{act_id}:fam")
    b5 = types.InlineKeyboardButton("🤖 AI / Tools (Công ty)", callback_data=f"clf:{act_id}:ai")
    b6 = types.InlineKeyboardButton("🏢 Văn phòng (Công ty)", callback_data=f"clf:{act_id}:off")
    b7 = types.InlineKeyboardButton("💳 Vay / Nợ (Cá nhân)", callback_data=f"clf:{act_id}:debt")
    b8 = types.InlineKeyboardButton("👤 Khác (Cá nhân)", callback_data=f"clf:{act_id}:psnl")
    markup.add(b1, b2)
    markup.add(b3, b4)
    markup.add(b5, b6)
    markup.add(b7, b8)
    return markup

@bot.callback_query_handler(func=lambda call: call.data.startswith("clf_") or call.data.startswith("clf:"))
def handle_expense_classification_callback(call):
    if not is_authorized(call.from_user.id):
        bot.answer_callback_query(call.id, text="Chỉ sếp An Phan mới có quyền duyệt!", show_alert=True)
        return

    if ":" in call.data:
        parts = call.data.split(":")
        if len(parts) < 3:
            bot.answer_callback_query(call.id, text="Dữ liệu nút không hợp lệ.", show_alert=True)
            return
        act_id = parts[1]
        opt_code = parts[2]
    else:
        parts = call.data.split("_")
        # format: clf_{act_id}_{code}
        if len(parts) < 3:
            bot.answer_callback_query(call.id, text="Dữ liệu nút không hợp lệ.", show_alert=True)
            return
        opt_code = parts[-1]
        act_id = "_".join(parts[1:-1])

    options_map = {
        "fnb": ("Food / Meeting", "PROJ-CANHAN", "Ăn uống (Cá nhân)"),
        "shop": ("Shopping", "PROJ-CANHAN", "Mua sắm (Cá nhân)"),
        "trans": ("Di chuyển", "PROJ-CANHAN", "Di chuyển (Cá nhân)"),
        "fam": ("Gia đình & Định kỳ", "PROJ-CANHAN", "Gia đình & Định kỳ (Cá nhân)"),
        "debt": ("Vay / Nợ", "PROJ-CANHAN", "Vay / Nợ (Cá nhân)"),
        "psnl": ("Personal", "PROJ-CANHAN", "Chi tiêu khác (Cá nhân)"),
        "ai": ("AI / Tools", "PROJ-CONGTY", "AI / Tools (Công ty)"),
        "off": ("Office / Admin", "PROJ-CONGTY", "Văn phòng (Công ty)")
    }

    if opt_code not in options_map:
        bot.answer_callback_query(call.id, text="Tùy chọn không hợp lệ.", show_alert=True)
        return

    cat, proj, label = options_map[opt_code]

    target_action = execute_query("SELECT * FROM actions WHERE id = %s", (act_id,), fetch=True)
    if not target_action and act_id.startswith("exp_"):
        target_action = execute_query("SELECT * FROM actions WHERE notes LIKE %s OR title LIKE %s", (f"%{act_id}%", f"%{act_id}%"), fetch=True)
    if not target_action:
        bot.answer_callback_query(call.id, text="Không tìm thấy Action item này hoặc đã được xử lý rồi.", show_alert=True)
        return

    act = target_action[0]
    act_notes = act.get('notes') or ''
    act_title = act.get('title') or ''

    m = re.search(r'(exp_[A-Za-z0-9_]+)', f"{act_notes} {act_title}")
    t_id = m.group(1) if m else None

    if t_id:
        tx_rows = execute_query("SELECT * FROM expensetransactions WHERE id = %s", (t_id,), fetch=True)
        if tx_rows:
            tx = tx_rows[0]
            curr_desc = tx.get('description') or ''
            new_desc = f"{label} - {curr_desc}".strip(" -")
            execute_query("""
                UPDATE expensetransactions 
                SET category = %s, projectid = %s, description = %s
                WHERE id = %s
            """, (cat, proj, new_desc, t_id))

            vendor = tx.get('vendor')
            if vendor and vendor != 'Unknown':
                v_exists = execute_query("SELECT vendor FROM payees WHERE vendor = %s", (vendor,), fetch=True)
                if not v_exists:
                    execute_query("""
                        INSERT INTO payees (vendor, alias, default_category, default_project_id, default_method)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (vendor, label.lower(), cat, proj, tx.get('paymentmethod', 'Chuyển khoản')))

    execute_query("""
        UPDATE actions 
        SET status = 'Done', notes = COALESCE(notes, '') || %s
        WHERE id = %s
    """, (f" -> Sếp đã duyệt nhanh bằng nút: {label}", act_id))

    bot.answer_callback_query(call.id, text=f"✅ Đã duyệt: {label}!", show_alert=False)

    now_str = get_now().strftime('%H:%M - %d/%m/%Y')
    try:
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=f"{call.message.text}\n\n✅ *[SẾP ĐÃ DUYỆT BẰNG NÚT: {label} - LÚC {now_str}]*"
        )
    except Exception:
        pass

# ==================== NATURAL LANGUAGE AI HANDLER ====================

@bot.message_handler(func=lambda msg: not msg.text.startswith('/'))
def handle_natural_language_chat(message):
    if not is_authorized(message):
        return

    # Kiểm tra lệnh quét mail tự nhiên
    user_text = message.text.strip().lower()
    if re.search(r'(quét|scan)\s*(mail|email|thư)', user_text) or user_text in ['quét mail', 'scan mail', 'quet mail', 'check mail thu chi', 'quét thư']:
        perform_mail_scan(interactive=True, target_message=message, scan_label="Yêu cầu của Sếp")
        return

    # Bổ sung ngữ cảnh nếu sếp đang reply tin nhắn hoặc chat trong topic Actions
    context_prefix = ""
    if message.reply_to_message and message.reply_to_message.text:
        context_prefix += f"[NGỮ CẢNH: Sếp đang nhấn Reply trả lời tin nhắn: '{message.reply_to_message.text[:300]}']\n"

    thread_id = getattr(message, 'message_thread_id', None)
    target_actions_thread = get_topic_thread_id("actions")
    if thread_id == target_actions_thread:
        pending_acts = execute_query("SELECT id, title, notes FROM actions WHERE status = 'Pending' ORDER BY priorityorder ASC LIMIT 3", fetch=True)
        if pending_acts:
            acts_str = "; ".join([f"ID: {a['id']}, {a['title']}" for a in pending_acts])
            context_prefix += f"[NGỮ CẢNH: Sếp đang chat trong Topic '⚡ Cần Sếp Duyệt (Actions)'. Các Action đang Pending: {acts_str}. Nếu tin nhắn sếp giải thích tên món/dịch vụ của khoản chi, hãy gọi ngay `resolve_pending_expense_action`!]\n"

    full_text = f"{context_prefix}{message.text}" if context_prefix else message.text

    # Phản hồi tức thì trong 0.2s để sếp thấy rõ ràng bot đang tiếp nhận và xử lý, không bao giờ bị đứng im!
    status_msg = None
    try:
        status_msg = bot.reply_to(message, "⏳ *Trâm Anh đang tra cứu & suy nghĩ...*", parse_mode="Markdown")
    except Exception:
        pass

    bot.send_chat_action(message.chat.id, 'typing')
    ai_reply, affected_tasks = ask_gemini(full_text, chat_id=str(message.chat.id))

    markup = None
    if affected_tasks:
        markup = types.InlineKeyboardMarkup()
        for t in affected_tasks:
            t_id = t.get('task_id')
            t_title = t.get('title', 'Task')[:22]
            if t_id:
                markup.add(types.InlineKeyboardButton(f"✅ Xong: {t_title}", callback_data=f"done_{t_id}"))

    send_safe_message(message, ai_reply, reply_markup=markup, reply_to_msg_id=message.message_id)

    # Xóa bong bóng tạm 'đang tra cứu...' sau khi đã gửi câu trả lời
    if status_msg:
        try:
            bot.delete_message(message.chat.id, status_msg.message_id)
        except Exception:
            pass

# ==================== TWO-TIER SCHEDULER THREAD ====================

reminded_60m_ids = set()
reminded_15m_ids = set()
last_briefing_date = None
last_evening_date = None

def parse_time_str(time_str):
    if not time_str:
        return None
    s = time_str.strip().lower()
    m = re.match(r'^(\d{1,2})(?:[h:.](\d{1,2}))?$', s)
    if m:
        hr = int(m.group(1))
        mn = int(m.group(2)) if m.group(2) else 0
        if 0 <= hr <= 23 and 0 <= mn <= 59:
            return (hr, mn)
    return None

def check_upcoming_appointments(now):
    """
    Two-tier appointment reminder:
    - Tier 1: 60 minutes before (between 40 and 70 minutes).
    - Tier 2: 15 minutes before (between 5 and 20 minutes).
    Both attach inline [✅ Đã hoàn thành] button.
    """
    today_str = now.strftime('%Y-%m-%d')
    rows = execute_query(
        'SELECT id, title, description, "startTime", "endTime", category FROM schedule WHERE date = %s AND status = \'todo\'',
        (today_str,),
        fetch=True
    )
    if not rows:
        return

    for r in rows:
        task_id = r['id']
        start_time_str = r['startTime']
        parsed = parse_time_str(start_time_str)
        if not parsed:
            continue

        hr, mn = parsed
        appt_dt = now.replace(hour=hr, minute=mn, second=0, microsecond=0)
        diff_minutes = (appt_dt - now).total_seconds() / 60.0

        # Tier 1: 60 minutes reminder (40 <= diff <= 70)
        if 40.0 <= diff_minutes <= 70.0 and task_id not in reminded_60m_ids:
            reminded_60m_ids.add(task_id)
            logger.info(f"Triggering 60m reminder for task: {r['title']} ({r['startTime']})")
            msg = (
                f"⏰ *[NHẮC HẸN SẮP TỚI - CÒN 1 TIẾNG]*\n\n"
                f"📌 *Công việc:* {r['title']}\n"
                f"🕒 *Thời gian:* `{r['startTime']} - {r['endTime'] or '--:--'}`\n"
                f"🏷️ *Phân loại:* _{r['category'] or 'work'}_\n"
                f"📝 *Chi tiết:* {r['description'] or 'Không có ghi chú'}\n\n"
                f"Sếp chuẩn bị nhé ạ! Chúc sếp có buổi làm việc thuận lợi ✨"
            )
            markup = types.InlineKeyboardMarkup()
            markup.add(types.InlineKeyboardButton("✅ Đã hoàn thành", callback_data=f"done_{task_id}"))
            for chat_target, thread_target in get_notification_targets("schedule"):
                send_safe_message(chat_target, msg, reply_markup=markup, message_thread_id=thread_target)

        # Tier 2: 15 minutes reminder (5 <= diff <= 20)
        elif 5.0 <= diff_minutes <= 20.0 and task_id not in reminded_15m_ids:
            reminded_15m_ids.add(task_id)
            logger.info(f"Triggering 15m reminder for task: {r['title']} ({r['startTime']})")
            msg = (
                f"🚨 *[SẮP BẮT ĐẦU - CÒN 15 PHÚT]*\n\n"
                f"📌 *Công việc:* {r['title']}\n"
                f"🕒 *Thời gian:* `{r['startTime']} - {r['endTime'] or '--:--'}`\n"
                f"📝 *Ghi chú:* {r['description'] or 'Sẵn sàng vào việc sếp nhé!'}\n\n"
                f"Đã đến giờ chuẩn bị rồi ạ! 🚀"
            )
            markup = types.InlineKeyboardMarkup()
            markup.add(types.InlineKeyboardButton("✅ Đã hoàn thành", callback_data=f"done_{task_id}"))
            for chat_target, thread_target in get_notification_targets("schedule"):
                send_safe_message(chat_target, msg, reply_markup=markup, message_thread_id=thread_target)

def send_morning_briefing(now):
    # Quét email thu chi ngay trước bản tin sáng 08:00
    try:
        perform_mail_scan(interactive=False, scan_label="Ca sáng 08:00")
    except Exception as e:
        logger.error(f"Error scanning mail before morning briefing: {e}")

    today_str = now.strftime('%Y-%m-%d')
    date_vn = now.strftime('%d/%m/%Y')
    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    day_name = days_vi[now.weekday()]

    events = get_aggregated_events(today_str, today_str)

    actions = execute_query(
        "SELECT title, suggestedagent, prioritylevel FROM actions WHERE status = 'Pending' ORDER BY priorityorder ASC LIMIT 5",
        fetch=True
    ) or []

    msg = f"☀️ *CHÀO BUỔI SÁNG SẾP AN!*\n"
    msg += f"Hôm nay là *{day_name}, ngày {date_vn}*. Trâm Anh xin phép gửi sếp lịch trình & các mốc công việc hôm nay:\n\n"

    if events:
        todo_today = [s for s in events if s['status'] != 'done']
        done_today = [s for s in events if s['status'] == 'done']
        msg += f"📅 *LỊCH TRÌNH & DEADLINE HÔM NAY ({len(events)} mục):*\n"
        if todo_today:
            for idx, s in enumerate(todo_today, 1):
                tag = "📌" if s['type'] == 'schedule' else ("🚨 Hạn chót" if s['type'] == 'project_deadline' else "🎯 Cột mốc")
                msg += f"{idx}. ⏳ {tag} `{s['startTime']} - {s['endTime']}`: *{s['title']}*\n"
        else:
            msg += "🎉 Tất cả các lịch hôm nay đã được xử lý xong!\n"

        if done_today:
            msg += f"\n_Công việc đã hoàn thành trước:_\n"
            for s in done_today:
                msg += f"• ✅ ~{s['title']}~\n"
        msg += "\n"
    else:
        msg += "📅 *LỊCH TRÌNH:* Hôm nay chưa có lịch hẹn hay deadline nào cố định.\n\n"

    if actions:
        msg += f"⚠️ *VIỆC CẦN SẾP DUYỆT/INPUT ({len(actions)} việc):*\n"
        for idx, a in enumerate(actions, 1):
            msg += f"- [{a.get('suggestedagent', 'Agent')}] {a['title']}\n"
        msg += "\n"

    msg += "Chúc sếp một ngày mới tràn đầy năng lượng và hiệu quả ạ! 🚀"
    for chat_target, thread_target in get_notification_targets("schedule"):
        send_safe_message(chat_target, msg, message_thread_id=thread_target)

def send_evening_report(now):
    # Quét email thu chi ngay trước báo cáo tối 21:00
    try:
        perform_mail_scan(interactive=False, scan_label="Ca tối 21:00")
    except Exception as e:
        logger.error(f"Error scanning mail before evening report: {e}")

    today_str = now.strftime('%Y-%m-%d')
    date_vn = now.strftime('%d/%m/%Y')
    days_vi = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
    day_name = days_vi[now.weekday()]

    today_events = get_aggregated_events(today_str, today_str)
    done_tasks = [s for s in today_events if s['status'] == 'done']
    todo_tasks = [s for s in today_events if s['status'] != 'done']

    actions = execute_query(
        "SELECT title, suggestedagent FROM actions WHERE status = 'Pending' LIMIT 3",
        fetch=True
    ) or []

    # Preview tomorrow's schedule & deadlines
    tomorrow_dt = now + timedelta(days=1)
    tomorrow_str = tomorrow_dt.strftime('%Y-%m-%d')
    tomorrow_date_vn = tomorrow_dt.strftime('%d/%m/%Y')
    tomorrow_day_name = days_vi[tomorrow_dt.weekday()]
    tomorrow_events = get_aggregated_events(tomorrow_str, tomorrow_str)

    msg = f"🌙 *BÁO CÁO TỔNG KẾT NGÀY - 21:00*\n"
    msg += f"Em chào sếp An! Trâm Anh xin phép tổng kết công việc ngày *{day_name} ({date_vn})*:\n\n"

    msg += f"✅ *CÔNG VIỆC / MỐC ĐÃ HOÀN THÀNH ({len(done_tasks)}):*\n"
    if done_tasks:
        for t in done_tasks:
            msg += f"• `{t['startTime']}`: {t['title']}\n"
    else:
        msg += "• Chưa ghi nhận công việc hoàn thành trên hệ thống.\n"
    msg += "\n"

    msg += f"⏳ *CÔNG VIỆC CHƯA XONG / TỒN ĐỌNG ({len(todo_tasks)}):*\n"
    if todo_tasks:
        for t in todo_tasks:
            msg += f"• `{t['startTime']}`: {t['title']}\n"
    else:
        msg += "• Không có công việc nào tồn đọng. Xuất sắc ạ!\n"
    msg += "\n"

    if actions:
        msg += f"📋 *YÊU CẦU CẦN INPUT TỒN ĐỌNG ({len(actions)}):*\n"
        for a in actions:
            msg += f"• [{a.get('suggestedagent', 'Agent')}]: {a['title']}\n"
        msg += "\n"

    # Preview tomorrow
    if tomorrow_events:
        tomorrow_todo = [ts for ts in tomorrow_events if ts['status'] != 'done']
        tomorrow_done = [ts for ts in tomorrow_events if ts['status'] == 'done']

        msg += f"🗓️ *LỊCH TRÌNH NGÀY MAI ({tomorrow_day_name}, {tomorrow_date_vn}):*\n"
        if tomorrow_todo:
            for idx, ts in enumerate(tomorrow_todo, 1):
                tag = "📌" if ts['type'] == 'schedule' else ("🚨" if ts['type'] == 'project_deadline' else "🎯")
                msg += f"{idx}. ⏳ {tag} `{ts['startTime']} - {ts['endTime']}`: *{ts['title']}*\n"
        else:
            msg += "✨ *Ngày mai sếp không còn công việc nào tồn đọng cần làm ạ!*\n"

        if tomorrow_done:
            msg += f"\n👉 *Công việc đã hoàn thành trước ({len(tomorrow_done)}):*\n"
            for ts in tomorrow_done:
                msg += f"• ✅ ~{ts['title']}~ (`{ts['startTime']} - {ts['endTime']}`) - _(Đã hoàn thành)_\n"
        msg += "\n"

    msg += "Sếp nghỉ ngơi sớm giữ gìn sức khỏe nhé ạ! Chúc sếp ngủ thật ngon giấc! 🌟"
    for chat_target, thread_target in get_notification_targets("schedule"):
        send_safe_message(chat_target, msg, message_thread_id=thread_target)

def scheduler_loop():
    global last_briefing_date, last_evening_date
    logger.info("Background scheduler thread started.")

    while True:
        try:
            now = get_now()
            today_str = now.strftime('%Y-%m-%d')

            # Clean memory state at midnight
            if now.hour == 0 and now.minute <= 5:
                reminded_60m_ids.clear()
                reminded_15m_ids.clear()

            # 1. Check appointment reminders (Two-tier: 60m & 15m before)
            check_upcoming_appointments(now)

            # 2. Morning Briefing at 08:00 (tự động quét email thu chi sát 08:00 trước khi gửi)
            if now.hour == 8 and 0 <= now.minute <= 15:
                if last_briefing_date != today_str:
                    logger.info("Triggering 08:00 Morning Briefing (with inline mail scan).")
                    send_morning_briefing(now)
                    last_briefing_date = today_str

            # 3. Evening Report at 21:00 (tự động quét email thu chi sát 21:00 trước khi gửi)
            if now.hour == 21 and 0 <= now.minute <= 15:
                if last_evening_date != today_str:
                    logger.info("Triggering 21:00 Evening Report (with inline mail scan).")
                    send_evening_report(now)
                    last_evening_date = today_str

        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}")

        time.sleep(30)

# ==================== MAIN ENTRY POINT ====================

def main():
    logger.info("Starting Trâm Anh AI Telegram Bot 24/7...")

    # Register bot menu commands with Telegram API
    setup_bot_commands()

    # Start background scheduler thread
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
    scheduler_thread.start()

    # Infinity polling with auto-reconnect and error backoff
    retry_delay = 5
    while True:
        try:
            logger.info("Bot polling started...")
            bot.infinity_polling(timeout=25, long_polling_timeout=15)
        except Exception as e:
            logger.error(f"Polling exception: {e}. Reconnecting in {retry_delay}s...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60) # exponential backoff capped at 60s
        else:
            retry_delay = 5

if __name__ == "__main__":
    main()
