# ANPHIM TASK ROUTER

> **CRITICAL INSTRUCTION FOR ALL AGENTS:**
> Đọc lướt phần **Executive Summary** ở đầu file guideline trước. Chỉ đọc sâu xuống phần dưới nếu task yêu cầu xử lý các nghiệp vụ phức tạp. Việc này nhằm tiết kiệm Token và tránh "đọc sót" các rule an toàn.

## Cloud Database & Local Scripts
Toàn bộ dữ liệu được quản lý qua Cloud Database. Mọi tác vụ tương tác dữ liệu phải được gọi qua các script Python chuẩn đã được cung cấp (tại `E:\.agents\Cloud\agent_scripts\` hoặc các script dành riêng cho bản Agent local). Tuyệt đối không tạo các file `.md` nháp rác.

## Daily Report / Báo cáo hôm nay
Read:
- E:\.agents\guidelines\core\00_BOOT.md
- E:\.agents\guidelines\core\01_CORE_RULES.md
- E:\.agents\guidelines\roles\tram_anh_sop.md
- Cloud Database: Query bảng `system_updates`
- Cloud Database: Query bảng `actions` (Today Tasks)
- Cloud Database: chạy script `db_projects.py report`

## Project Update / Cập nhật dự án
Read:
- E:\.agents\guidelines\roles\tram_anh_sop.md
Write:
- Chạy `db_projects.py update_project` để lưu vào Cloud Database.

## Expense / Ghi chi phí
Read:
- E:\.agents\guidelines\roles\minh_thu_guideline.md
Write:
- **Quét email tự động (Cloud):** Chạy `E:\.agents\Cloud\agent_scripts\minh_thu_finance_cloud.py --scan_mail` để nạp chi phí. Bản Cloud này sẽ tự gọi API AI để phân tích khoản chi lạ.
- **Quét email xử lý thủ công (Local):** Chạy `E:\.agents\scripts\minh_thu_finance_local.py --scan_mail`. Antigravity sẽ tự động đọc log trả về từ lệnh này và dùng tư duy để quyết định thông tin dự án/hạng mục thay cho API cứng.
- **Nhập chi phí thủ công từ Chat (Local):** Khi sếp nhắn tin báo chi phí, tự bóc tách thông tin và chạy `E:\.agents\Cloud\agent_scripts\add_expense_local.py` với các tham số tương ứng. Nếu thiếu thông tin, hỏi lại sếp.

## Quotation / Báo giá
Read:
- E:\.agents\guidelines\roles\quoc_bao_guideline.md
Write:
- Chạy `quoc_bao_sales.py save_draft` để lưu bản nháp vào Cloud DB. Tuyệt đối không tạo file `.md`.

## Contract / Hợp đồng
Read:
- E:\.agents\guidelines\roles\minh_thu_guideline.md
Write:
- Chạy `E:\.agents\Cloud\agent_scripts\minh_thu_finance_cloud.py generate_contract`. Script sẽ tự động lấy báo giá từ Cloud DB để chèn vào `.docx`.

## Creative Brief & Marketing / Sáng tạo & Fanpage
Read:
- E:\.agents\guidelines\roles\minh_dan_guideline.md
Write:
- Chạy `minh_dan_creative.py add_post` để lên lịch (Schedule) và lưu nội dung (Documents) thẳng vào Cloud DB.
- Không làm Creative Brief nữa.

## Dashboard / Code / Automation / Token Tracker
Read:
- E:\.agents\guidelines\roles\chi_hai_guideline.md
Write:
- Mọi Agent sau khi xử lý xong công việc lớn phải nhớ gọi `token_tracker.py log_usage` để lưu chi phí API vào Cloud DB.
