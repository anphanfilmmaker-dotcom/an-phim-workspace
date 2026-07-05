import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def update_vistax_notes():
    projects_list = "Các dự án đã và đang thực hiện: Atera Central, Đông Thăng Long, Khai Sơn, AI Render, Cát Bà - The Marina."
    
    query = """
        UPDATE clients 
        SET notes = %s
        WHERE id = 'VISTA_X'
    """
    
    success = execute_query(query, (projects_list,), fetch=False)
    if success:
        print("Đã cập nhật Note cho VISTA X thành công!")
    else:
        print("Lỗi cập nhật Note.")

if __name__ == "__main__":
    update_vistax_notes()
