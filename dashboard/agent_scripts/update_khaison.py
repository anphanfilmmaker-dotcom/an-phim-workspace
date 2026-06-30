import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def update_khaison():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Dropping file_link from documents...")
            cur.execute("""
                ALTER TABLE documents 
                DROP COLUMN IF EXISTS file_link
            """)
            
            print("Updating Khai Son SOW summary...")
            # Khai Son is ID 'PROJ_1'
            khai_son_summary = "Cung cấp dịch vụ sản xuất hậu kỳ video nội ngoại thất AI cho dự án Khai Sơn. Bao gồm: 1 Đạo diễn, 1 Kỹ sư AI, và 6 clip AI Render. Bàn giao: Video FULL HD (1920x1080) định dạng .mp4. Lịch trình: Draft 1 (04/04/2026), Final (09/04/2026)."
            
            cur.execute("""
                UPDATE documents 
                SET summary = %s 
                WHERE project_id = 'PROJ_1'
            """, (khai_son_summary,))
            
            conn.commit()
            print("Database updated successfully!")
    except Exception as e:
        print(f"Error updating database: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    update_khaison()
