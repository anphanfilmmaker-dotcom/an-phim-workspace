import sys
import os
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

def seed_documents():
    # Lấy danh sách dự án
    projects = execute_query('SELECT id, name, projecttype, notes FROM projects', fetch=True)
    
    for p in projects:
        proj_id = p['id']
        proj_type = p['projecttype']
        notes = p['notes'] if p['notes'] else "Chưa có thông tin SOW chi tiết."
        
        doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
        
        query = """
            INSERT INTO documents (id, project_id, doc_type, project_type, summary)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """
        execute_query(query, (doc_id, proj_id, 'Contract_SOW', proj_type, f"Tóm tắt yêu cầu (SOW): {notes}"), fetch=False)
        
    print("Đã cập nhật dữ liệu vào bảng documents thành công!")

if __name__ == "__main__":
    seed_documents()
