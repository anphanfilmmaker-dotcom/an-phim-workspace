# ANPHIM TASK ROUTER

> **CRITICAL INSTRUCTION FOR ALL AGENTS:**
> Đọc lướt phần **Executive Summary** ở đầu file guideline trước. Chỉ đọc sâu xuống phần dưới nếu task yêu cầu xử lý các nghiệp vụ phức tạp. Việc này nhằm tiết kiệm Token và tránh "đọc sót" các rule an toàn.

## Cloud Database Migration Active
Toàn bộ hệ thống đã chuyển sang Cloud Database. Không Agent nào được phép ghi đè/sửa file `Project Management .xlsx`, `content_queue.xlsx`, hoặc tạo các file `Quotation_Draft.md` rác. Mọi tác vụ phải gọi qua các script Python tại: `e:\agent\dashboard\agent_scripts\`.

## Daily Report / Báo cáo hôm nay
Read:
- 00_BOOT.md
- 01_CORE_RULES.md
- guidelines/tram_anh_sop.md
- system_updates.md
- Today_Tasks.md
- Cloud Database: chạy script `tram_anh_pm.py report`

## Project Update / Cập nhật dự án
Read:
- guidelines/tram_anh_sop.md
Write:
- Chạy `tram_anh_pm.py update_project` để lưu vào Cloud Database.

## Expense / Ghi chi phí
Read:
- guidelines/minh_thu_guideline.md
Write:
- Chạy `minh_thu_finance.py scan_mail` để nạp chi phí. Nếu thiếu thông tin, tự động tạo Task cho Sếp.

## Quotation / Báo giá
Read:
- guidelines/quoc_bao_guideline.md
Write:
- Chạy `quoc_bao_sales.py save_draft` để lưu bản nháp vào Cloud DB. Tuyệt đối không tạo file `.md`.

## Contract / Hợp đồng
Read:
- guidelines/minh_thu_guideline.md
Write:
- Chạy `minh_thu_finance.py generate_contract`. Script sẽ tự động lấy báo giá từ Cloud DB để chèn vào `.docx`.

## Creative Brief & Marketing / Sáng tạo & Fanpage
Read:
- guidelines/minh_dan_guideline.md
Write:
- Chạy `minh_dan_creative.py add_post` để lên lịch (Schedule) và lưu nội dung (Documents) thẳng vào Cloud DB. Không dùng `content_queue.xlsx`.
- Không làm Creative Brief nữa.

## Dashboard / Code / Automation / Token Tracker
Read:
- guidelines/chi_hai_guideline.md
Write:
- Mọi Agent sau khi xử lý xong công việc lớn phải nhớ gọi `token_tracker.py log_usage` để lưu chi phí API vào Cloud DB.
