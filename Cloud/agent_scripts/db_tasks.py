import os
import sys
import argparse
import json
import uuid
from db_connection import execute_query

# Set terminal output to UTF-8 to handle Vietnamese characters properly
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def add_event(args):
    """Adds a calendar event to the schedule table (has date & time)."""
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    query = """
        INSERT INTO schedule (id, title, date, startTime, projectId, category, priority, status, agent)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    # Auto-detect category
    category = "meeting" if "họp" in args.title.lower() or "meeting" in args.title.lower() else "work"
    
    params = (event_id, args.title, args.date, args.start_time, args.project, category, "high", "todo", "Trâm Anh")
    success = execute_query(query, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": f"Đã lưu lịch hẹn '{args.title}' vào ngày {args.date} lúc {args.start_time}."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Lỗi lưu Lịch hẹn."}, ensure_ascii=False))

def add_task(args):
    """Adds a task to the actions table (To-do, no specific time)."""
    task_id = f"act_{uuid.uuid4().hex[:8]}"
    query = """
        INSERT INTO actions (id, priorityOrder, title, project, priorityLevel, suggestedAgent, status, category)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (task_id, 1, args.title, args.project, "Medium", "Trâm Anh", "Pending", "work")
    success = execute_query(query, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": f"Đã thêm công việc '{args.title}' vào Today Task."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Lỗi lưu Công việc."}, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Tasks and Schedule Management Tool")
    subparsers = parser.add_subparsers(dest="action", help="Cac hanh dong ho tro")

    # Add Event (Schedule)
    parser_event = subparsers.add_parser("add_event")
    parser_event.add_argument("--title", required=True)
    parser_event.add_argument("--date", required=True, help="YYYY-MM-DD")
    parser_event.add_argument("--start_time", required=True, help="HH:MM")
    parser_event.add_argument("--project", default="")

    # Add Task (Action)
    parser_task = subparsers.add_parser("add_task")
    parser_task.add_argument("--title", required=True)
    parser_task.add_argument("--project", default="")

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "add_event":
        add_event(args)
    elif args.action == "add_task":
        add_task(args)

if __name__ == "__main__":
    main()
