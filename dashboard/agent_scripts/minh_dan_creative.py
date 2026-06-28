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

def create_creative_brief(args):
    """
    Creates a Creative Brief and saves it to documents DB.
    """
    doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
    now = datetime.datetime.now().isoformat()
    
    query = """
        INSERT INTO documents (id, name, project, type, status, owner, lastUpdated, content)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        doc_id, f"{args.project_id}_Creative_Brief", args.project_id, 
        "Creative_Brief", "Draft", "Minh Dan", now, args.brief_content
    )
    
    success = execute_query(query, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": "Da tao Creative Brief va luu vao DB."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi ghi Database."}, ensure_ascii=False))

def add_social_post(args):
    """
    Adds a post draft to the schedule table instead of content_queue.xlsx.
    """
    post_id = f"POST-{uuid.uuid4().hex[:8]}"
    
    query = """
        INSERT INTO schedule (id, title, date, time, type, participants)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    # Assuming 'participants' stores the image path/prompt and 'type' is the status for now
    # In production, schedule table should have 'content', 'imagePath', 'status'
    
    params = (post_id, args.topic, args.date, "14:00", "Chờ", args.image_path)
    
    success = execute_query(query, params, fetch=False)
    
    if success:
        print(json.dumps({
            "status": "success", 
            "message": f"Da them bai viet nhap '{args.topic}' vao DB (Trang thai: Cho)."
        }, ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Loi ghi Database."}, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description="Minh Dan (Social Manager) Tool")
    subparsers = parser.add_subparsers(dest="action")

    p_brief = subparsers.add_parser("create_brief")
    p_brief.add_argument("--project_id", required=True)
    p_brief.add_argument("--brief_content", required=True)

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

    if args.action == "create_brief":
        create_creative_brief(args)
    elif args.action == "add_post":
        add_social_post(args)

if __name__ == "__main__":
    main()
