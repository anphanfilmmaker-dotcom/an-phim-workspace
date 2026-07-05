import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.db_connection import execute_query

def migrate():
    create_table_query = """
    CREATE TABLE IF NOT EXISTS knowledge_base (
        topic VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    if execute_query(create_table_query, fetch=False):
        print("Đã khởi tạo bảng knowledge_base.")
    else:
        print("Lỗi khởi tạo bảng knowledge_base.")
        return

    profile_content = """# AN PHIM: Strategic Production Partner

AN PHIM is a professional and affordable production house specializing in premium visual storytelling for brands. We act as a strategic partner, delivering high-impact content with high production standards. [cite: 1]

## Core Value Proposition
*   **Premium Storytelling:** Dedicated to high-impact content creation. [cite: 1]
*   **Professional Standards:** Committed to careful execution from concept to final delivery. [cite: 1]
*   **Intelligent Pricing:** Supported by intelligently optimized and accessible pricing structures. [cite: 1]
*   **Full-Service Commitment:** We stay involved throughout the entire project lifecycle for long-term commitment and value. [cite: 1]

## Our Team
*   **Quach Thao:** Producer [cite: 1]
*   **Minh Chau:** Content [cite: 1]
*   **Phan An:** Creative/Director [cite: 1]
*   **Vuong Nhan:** Post Producer [cite: 1]
*   **Huyen Huyen:** Planner [cite: 1]
*   **Hien Co:** Script-writer [cite: 1]

## Services & Portfolio Highlights
AN PHIM offers a diverse range of production services, including:
*   **Short Films:** Experienced in narrative projects like *Về quê có gì vui?*, *Đón ánh mặt trời*, and *Hành trình thân thương*. [cite: 1]
*   **Commercial Media:** Expertise in brand-aligned visual content for clients like Lay's and Red Bull. [cite: 1]
*   **Social Media:** Production of engaging content for brands such as Kangaroo and Citibank. [cite: 1]
*   **Corporate Video:** Delivering professional corporate communication solutions. [cite: 1]
*   **Music Videos:** Creating high-quality visual assets for musical projects. [cite: 1]

## Partnered Brands
We have partnered with a wide range of leading brands across various industries, including:
*   **Aviation:** Vietnam Airlines, Emirates, Vietravel Airlines [cite: 1]
*   **Tech & Electronics:** VinFast, FPT, LG, Bosch, Kangaroo, Điện máy XANH [cite: 1]
*   **Finance & Insurance:** Citibank, Prudential [cite: 1]
*   **Consumer Goods & Food:** Ensure Gold, Red Bull, Lay's, Pepperidge Farm, Gery, Nutifood, Brand's [cite: 1]
*   **Retail & Others:** Leman Jewelry, RMIT University, Vietlott, East Meets West [cite: 1]

## Contact Information
For inquiries, please contact:
*   **Name:** Mr. Thao [cite: 1]
*   **Phone:** 093 654 5137 [cite: 1]
*   **Email:** quachzthao@gmail.com [cite: 1]

---
*Source: 1. AN PHIM Portfolio document provided by user.*"""

    insert_query = """
    INSERT INTO knowledge_base (topic, content)
    VALUES (%s, %s)
    ON CONFLICT (topic) DO UPDATE SET content = EXCLUDED.content, last_updated = CURRENT_TIMESTAMP;
    """
    
    if execute_query(insert_query, params=("business_profile", profile_content), fetch=False):
        print("Đã nạp AN_PHIM_Business_Profile vào knowledge_base thành công.")
    else:
        print("Lỗi nạp dữ liệu profile.")

if __name__ == "__main__":
    migrate()
