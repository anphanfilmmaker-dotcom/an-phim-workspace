# Hướng dẫn ghi nhận dữ liệu (Database Rules cho Agent)

Tài liệu này quy định cách các Agent (như Trâm Anh PM, Quốc Huy Marketing, v.v.) phải tương tác với cơ sở dữ liệu `db.actions` và `db.tasks` của AN PHIM WORKSPACE để giao diện (UI) hiển thị chính xác.

## 1. Tách biệt và Phân nhóm Đầu việc (Task Grouping & Granularity)

**Quy định:** Giao diện hiển thị (Dashboard) sẽ tự động nhóm các task theo Ngày và Người phụ trách dựa trên cú pháp Markdown của file `Today_Tasks.md`. Agent phải tuân thủ nghiêm ngặt định dạng cấu trúc sau:

- Dùng `# YYYY-MM-DD` để định nghĩa Ngày.
- Dùng `## [Tên Agent]` để phân chia các nhóm người phụ trách.
- Dùng `- [ ] [Tên người thực hiện] Nội dung task` cho từng task riêng lẻ.

**Cú pháp chuẩn:**
```markdown
# 2026-06-07
## PM Agent
- [ ] [Sếp] Gửi tài liệu brief + ghi chú và mẫu hợp đồng cá nhân
- [ ] [Hải] Nhắc sếp thảo luận chốt phương án chi tiết

## IT Agent
- [ ] [Hải] Phác thảo phương án tích hợp Creative Studio
```

Việc này đảm bảo Parser tự động nhóm đúng (Date, Agent) thành một bản ghi (Card) duy nhất trên giao diện, và mỗi task sẽ là một nút tick hoàn thành riêng rẽ. Không gộp nhiều đầu việc lên cùng 1 dòng `- [ ]`.

## 2. Backup và lưu trữ Markdown

Theo yêu cầu của Sếp, mặc dù các task được đẩy vào Database (Local Storage / Google Sheets sync) để Dashboard hiển thị theo chuẩn, các Agent vẫn cần backup dữ liệu ra các file `.md` (Markdown) tương ứng trong thư mục `02_PROJECTs` hoặc `.agent/rules` để trích xuất hoặc tìm kiếm nhanh.

- Mỗi ngày, PM Agent cần rà soát các action chưa hoàn thành (Pending) và xuất ra một file summary markdown.
- Các ghi chú chi tiết hoặc log hội thoại sẽ được lưu vào markdown, trong khi chỉ **tên task ngắn gọn, rõ ràng** mới được đẩy vào thuộc tính `title` của `db.actions`.

## 3. Cập nhật tiến độ

Khi một agent hoặc CEO hoàn thành công việc, trạng thái (`status`) của Action phải được chuyển từ `Pending` sang `Done`. Giao diện sẽ tự động gạch bỏ hoặc ẩn các task này khỏi mục "Nhiệm vụ ưu tiên hôm nay".
