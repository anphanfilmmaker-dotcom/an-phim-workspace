import os
import sys
import argparse
import json
import datetime
import uuid
from db_connection import execute_query

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def add_social_post(args):
    """
    1. Creates a brief schedule event in the 'schedule' table.
    2. Saves the full content and prompt into the 'documents' table.
    """
    post_id = f"POST-{uuid.uuid4().hex[:8]}"
    doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now().isoformat()
    
    # 1. Ghi vao schedule de hien thi UI
    # title: "Xây content facebook ngày [Date]"
    # type: "AI agent", priority: "Trung bình", participants: "Minh Đan"
    # notes: vắn tắt topic
    sched_title = f"Xây content facebook ngày {args.date}"
    query_sched = """
        INSERT INTO schedule (id, title, date, type, priority, participants, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    # Using existing schema columns assumed. If priority or notes are not in table, this might fail,
    # but based on user prompt we assume the UI accepts these.
    params_sched = (post_id, sched_title, args.date, "AI agent", "Trung bình", "Minh Đan", f"Topic: {args.topic}")
    success_sched = execute_query(query_sched, params_sched, fetch=False)
    
    # 2. Ghi vao documents de luu content full
    query_doc = """
        INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, content)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    full_content = f"Date: {args.date}\nTopic: {args.topic}\nContent: {args.content}\nPrompt: {args.prompt}\nImage: {args.image_path}"
    # Project left blank as requested
    params_doc = (doc_id, f"Social_Post_{args.date}", "", "Social_Post", "Chờ", "Minh Đan", now, full_content)
    success_doc = execute_query(query_doc, params_doc, fetch=False)
    
    if success_sched and success_doc:
        print(json.dumps({
            "status": "success", 
            "message": f"Da len lich '{sched_title}' tren Calendar va luu content vao Database."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi ghi Database."}, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Minh Dan (Social Manager) Tool")
    subparsers = parser.add_subparsers(dest="action")

    p_post = subparsers.add_parser("add_post")
    p_post.add_argument("--date", required=True)
    p_post.add_argument("--topic", required=True)
    p_post.add_argument("--content", required=True)
    p_post.add_argument("--image_path", required=True)
    p_post.add_argument("--prompt", default="")

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "add_post":
        add_social_post(args)

if __name__ == "__main__":
    main()
