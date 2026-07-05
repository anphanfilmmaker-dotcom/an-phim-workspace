import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def insert_all_clients():
    clients = [
        ("K87K", "Khách hàng K87K"),
        ("VN", "Khách hàng VN"),
        ("F35STORY", "Khách hàng F35story"),
        ("ENSURE", "Khách hàng Ensure")
    ]
    
    query = """
        INSERT INTO clients (id, name)
        VALUES (%s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    
    for client_id, client_name in clients:
        success = execute_query(query, (client_id, client_name), fetch=False)
        if success:
            print(f"Đã nhập thành công {client_name} vào bảng clients!")
        else:
            print(f"Lỗi khi nhập {client_name}.")

if __name__ == "__main__":
    insert_all_clients()
