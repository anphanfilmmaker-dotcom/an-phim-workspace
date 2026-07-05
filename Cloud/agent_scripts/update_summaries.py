import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def update_summaries():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    updates = [
        ('PROJ_2', "Cung cấp chiến lược truyền thông tháng 5 cho Winterland87. Bao gồm: 1 gói chiến lược truyền thông, sản xuất 20 hình ảnh/video, viết và đăng 10 bài, chạy 1 gói quảng cáo. Bàn giao: Lập kế hoạch (04/05/2026), Quay chụp (11/05), Đăng tải (15/05), Báo cáo (30/05/2026)."),
        ('PROJ_8', "Cung cấp chiến lược truyền thông tháng 6 cho Winterland87. Bao gồm: 1 gói chiến lược truyền thông, sản xuất 20 hình ảnh/video, viết và đăng 10 bài, chạy 1 gói quảng cáo. Bàn giao: Lập kế hoạch (01/06/2026), Quay chụp (08/06), Đăng tải (16/06), Báo cáo (30/06/2026)."),
        ('PROJ_3', "Cung cấp dịch vụ sản xuất AI cho dự án Atera Central. Bao gồm: 1 Đạo diễn, 1 Kỹ sư AI, và 50 clip AI Render. Bàn giao: Video FULL HD."),
        ('PROJ_4', "Cung cấp dịch vụ sản xuất AI cho dự án Đông Thăng Long. Bao gồm: 1 Đạo diễn, 1 Kỹ sư AI, 4 clip Demo camera, 5 hình AI Image Render, 4 clip AI Render, 1 clip Editing, 1 clip Logo Animation."),
        ('PROJ_6', "Cung cấp dịch vụ sản xuất phim 4K cho Cát Bà - The Marina (Video CT1). Bao gồm: 1 Đạo diễn, 2 PM, 2 Kịch bản/Storyboard, 1 Kỹ sư AI, 2 gói AI Images 4K, 2 gói AI Video 4K, 2 gói Stock Footages, 2 gói Offline edit, 2 gói Graphic/Motion Design, 2 gói Colorgrading, 2 Voice AI, 2 Music BG. Lịch trình: Storyboard (30/05/2026), Draft 1 (06/06), Bàn giao Final (25/06/2026)."),
        ('PROJ_7', "Cung cấp dịch vụ sản xuất phim 4K cho Cát Bà - The Marina (Video CT2). Bao gồm: 1 Đạo diễn, 2 PM, 2 Kịch bản/Storyboard, 1 Kỹ sư AI, 2 gói AI Images 4K, 2 gói AI Video 4K, 2 gói Stock Footages, 2 gói Offline edit, 2 gói Graphic/Motion Design, 2 gói Colorgrading, 2 Voice AI, 2 Music BG. Lịch trình: Storyboard (30/05/2026), Draft 1 (06/06), Bàn giao Final (25/06/2026).")
    ]
        
    try:
        with conn.cursor() as cur:
            for proj_id, summary in updates:
                cur.execute("""
                    UPDATE documents 
                    SET summary = %s 
                    WHERE project_id = %s
                """, (summary, proj_id))
            
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
    update_summaries()
