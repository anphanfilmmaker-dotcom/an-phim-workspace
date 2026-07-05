import os
import sys
import argparse
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def send_email(args):
    # Try to load credentials
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if not all([smtp_server, smtp_port, smtp_user, smtp_pass]):
        print("Lỗi: Chưa cấu hình đủ thông số SMTP trong file .env (cần SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASS).")
        return
        
    msg = EmailMessage()
    msg.set_content(args.body)
    msg['Subject'] = args.subject
    msg['From'] = smtp_user
    msg['To'] = args.to
    
    try:
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"Đã gửi email thành công đến: {args.to}")
    except Exception as e:
        print(f"Lỗi khi gửi email: {str(e)}")

def draft_email(args):
    print("--- BẢN NHÁP EMAIL ---")
    print(f"To: {args.to}")
    print(f"Subject: {args.subject}")
    print(f"Body:\n{args.body}")
    print("----------------------")

def main():
    parser = argparse.ArgumentParser(description="Tool quan ly va gui Email du an")
    subparsers = parser.add_subparsers(dest="action")
    
    parser_send = subparsers.add_parser("send")
    parser_send.add_argument("--to", required=True)
    parser_send.add_argument("--subject", required=True)
    parser_send.add_argument("--body", required=True)
    
    parser_draft = subparsers.add_parser("draft")
    parser_draft.add_argument("--to", required=True)
    parser_draft.add_argument("--subject", required=True)
    parser_draft.add_argument("--body", required=True)
    
    args = parser.parse_args()
    
    if args.action == "send":
        send_email(args)
    elif args.action == "draft":
        draft_email(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
