import os
import sys
import argparse
import json
import datetime
import uuid
from db_connection import execute_query

# Set terminal output to UTF-8 to handle Vietnamese characters properly
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def add_project(args):
    due_date = None
    if args.due:
        try:
            datetime.datetime.strptime(args.due, '%Y-%m-%d')
            due_date = args.due
        except ValueError:
            due_date = args.due

    project_id = f"PROJ-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"

    query = """
        INSERT INTO projects (id, name, client, status, projectType, currentStage, priority, dueDate, nextAction, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        project_id, args.name, args.client, args.status, args.type, 
        args.stage, args.priority, due_date, args.next_action, args.notes
    )
    
    success = execute_query(query, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": f"Da tao du an moi '{args.name}' (ID: {project_id}) tren Cloud Database.",
            "data": {"id": project_id, "name": args.name}
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi ket noi hoac ghi Database."}, ensure_ascii=False))

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

def list_projects(args):
    query = "SELECT * FROM projects WHERE 1=1"
    params = []
    
    if args.status:
        query += " AND status ILIKE %s"
        params.append(f"%{args.status}%")
    if args.client:
        query += " AND client ILIKE %s"
        params.append(f"%{args.client}%")
        
    results = execute_query(query, tuple(params), fetch=True)
    
    if results is not None:
        print(json.dumps({"status": "success", "data": results}, ensure_ascii=False, default=str))
    else:
        print(json.dumps({"status": "error", "message": "Loi doc du lieu tu Database."}, ensure_ascii=False))

def update_project(args):
    updates = []
    params = []
    
    if args.stage is not None:
        updates.append("currentStage = %s")
        params.append(args.stage)
    if args.priority is not None:
        updates.append("priority = %s")
        params.append(args.priority)
    if args.status is not None:
        updates.append("status = %s")
        params.append(args.status)
    if args.next_action is not None:
        updates.append("nextAction = %s")
        params.append(args.next_action)
    if args.due is not None:
        updates.append("dueDate = %s")
        params.append(args.due)
    if args.notes is not None:
        updates.append("notes = %s")
        params.append(args.notes)
        
    if not updates:
        print(json.dumps({"status": "success", "message": "Khong co thay doi nao duoc thuc hien."}, ensure_ascii=False))
        return
        
    query = f"UPDATE projects SET {', '.join(updates)} WHERE id = %s"
    params.append(args.id)
    
    success = execute_query(query, tuple(params), fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": f"Da cap nhat du an ID {args.id} tren Database."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi cap nhat Database."}, ensure_ascii=False))

def generate_report(args):
    query = "SELECT status, COUNT(*) as count FROM projects GROUP BY status"
    stats = execute_query(query, fetch=True)
    print(json.dumps({"status": "success", "data": stats, "message": "Bao cao tong hop hoan tat"}, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Tram Anh (PM Agent) Tool - Quan ly du an Cloud")
    subparsers = parser.add_subparsers(dest="action", help="Cac hanh dong ho tro")

    # Add project
    parser_add_proj = subparsers.add_parser("add_project")
    parser_add_proj.add_argument("--client", required=True)
    parser_add_proj.add_argument("--name", required=True)
    parser_add_proj.add_argument("--type", default="AI Film")
    parser_add_proj.add_argument("--stage", default="Brief / Scope")
    parser_add_proj.add_argument("--priority", default="Medium")
    parser_add_proj.add_argument("--status", default="Chưa bắt đầu")
    parser_add_proj.add_argument("--next_action", default="")
    parser_add_proj.add_argument("--due", default="")
    parser_add_proj.add_argument("--notes", default="")

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

    # List projects
    parser_list_proj = subparsers.add_parser("list_projects")
    parser_list_proj.add_argument("--status")
    parser_list_proj.add_argument("--client")

    # Update project
    parser_update_proj = subparsers.add_parser("update_project")
    parser_update_proj.add_argument("--id", required=True)
    parser_update_proj.add_argument("--stage")
    parser_update_proj.add_argument("--priority")
    parser_update_proj.add_argument("--status")
    parser_update_proj.add_argument("--next_action")
    parser_update_proj.add_argument("--due")
    parser_update_proj.add_argument("--notes")
    
    # Generate Report
    parser_report = subparsers.add_parser("report", help="Tao bao cao tong quan")

    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        sys.exit(1)

    if args.action == "add_project":
        add_project(args)
    elif args.action == "list_projects":
        list_projects(args)
    elif args.action == "update_project":
        update_project(args)
    elif args.action == "report":
        generate_report(args)
    elif args.action == "add_event":
        add_event(args)
    elif args.action == "add_task":
        add_task(args)

if __name__ == "__main__":
    main()
