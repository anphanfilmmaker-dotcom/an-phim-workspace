# ANPHIM CORE RULES

## Rule Priority
Khi rules bị xung đột, ưu tiên theo thứ tự:

1. Chỉ đạo trực tiếp mới nhất từ sếp Phan An trong chat hiện tại
2. Quy tắc an toàn dữ liệu
3. 00_BOOT.md
4. 01_CORE_RULES.md
5. 02_ROUTER.md
6. Full guideline theo từng agent
7. Project-specific markdown
8. Archive logs

## Data Safety
- Không xóa dữ liệu nếu chưa được sếp xác nhận rõ.
- Không tự ý overwrite file template, hợp đồng, quotation, tracker.
- Trước khi sửa file quan trọng, nếu thay đổi lớn, tạo backup.
- Do NOT use basic Python scripts (e.g., python-docx string replace) to edit `.docx` templates (Contracts/Documents) as it destroys formatting and highlights. Mandatory solution: Output drafted content to a Markdown (`.md`) file for the user to manually copy/paste.
- NEVER write custom python scripts or use bash to modify Excel files (`.xlsx`) or manage projects without first checking `.agents`, `.agents/scripts/`, and `.agents/apps/` for existing helper scripts (e.g., `add_expense.py`, `minh_thu_finance.py`, `project_helper.py`). ALWAYS use existing tools to prevent format destruction.

## Excel Safety
- Daily review chỉ đọc Dashboard và Finance nếu chỉ cần báo cáo tổng quan.
- Khi ghi dữ liệu, chỉ ghi vào raw sheets: Projects, Giấy tờ, Expense.
- Không ghi tay vào Dashboard và Finance.

## File Persistence
- Brief, quotation draft, creative brief, log quan trọng phải được lưu thành `.md` trong project folder.

## Pathfinding Optimization
- NEVER use `list_dir` or recursive search on `02_PROJECTs` to find a project folder. ALWAYS use `python project_helper.py get_path --query <project_name>` to get the absolute path instantly and save tokens.

## Multi-Agent Safety
- **Infinite Loop Prevention:** If two or more agents communicate with each other over 3 times without resolving the task or advancing progress, they MUST STOP calling tools and immediately escalate to the Director (User) for explicit guidance. Do not guess or reply "I don't know" in a loop.
- Markdown reports (`system_updates.md`, etc.) should be appended to, not overwritten, if possible, to avoid conflicting updates from concurrent agents.


## 4. QUY TẮC KẾ TOÁN THÔNG MINH (SMART ACCOUNTING)
- **Tuyệt đối không bê nguyên 'raw_note' từ tin nhắn ngân hàng** để hạch toán nếu Sếp đã có 'boss_answer'.
- **Rewrite Diễn giải (Note)**: Phải dùng suy luận (LLM) để dịch 'boss_answer' thành một câu diễn giải tự nhiên, chuyên nghiệp và súc tích (VD: 'Mua quần áo cá nhân' thay vì 'GD thanh toan tai CONG TY UNIQLO...').
- **Implicit Actions (Hành động ẩn)**: Khi Sếp trả lời, phải tinh ý phát hiện các yêu cầu ẩn đi kèm như: Ghi nhận lịch trình (đi du lịch, đi công tác), Xóa/Cập nhật công nợ (VAT, hoàn ứng), Tạo dự án mới. Lập tức thực thi các implicit actions này thay vì chỉ gõ Excel.
