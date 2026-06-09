# Hướng dẫn ghi nhận dữ liệu (Database Rules cho Agent)

Tài liệu này quy định cách các Agent (như Trâm Anh PM, Quốc Huy Marketing, v.v.) phải tương tác với cơ sở dữ liệu `db.actions` và `db.tasks` của AN PHIM WORKSPACE để giao diện (UI) hiển thị chính xác.

## 1. Tách biệt các đầu việc (Task Granularity)

**Quy định:** Không bao giờ gộp nhiều nhiệm vụ (task) vào cùng một bản ghi (record) trong cơ sở dữ liệu.
**Sai:** Ghi một chuỗi văn bản dài chứa nhiều đầu việc vào `title` của một hành động duy nhất (ví dụ: `[Sếp] Gửi tài liệu... - [ ] [Hải] Nhắc sếp... - [ ] [Hải] Phác thảo...`).
**Đúng:** Tạo ra N bản ghi `Action` riêng biệt cho N đầu việc. Ví dụ:
- Action 1: `title: "[Sếp] Gửi tài liệu brief + ghi chú và mẫu hợp đồng..."`
- Action 2: `title: "[Hải] Nhắc sếp thảo luận chốt phương án..."`
- Action 3: `title: "[Hải] Phác thảo phương án tích hợp Creative Studio..."`

Việc này đảm bảo giao diện Dashboard có thể hiển thị mỗi task là một hàng riêng biệt với nút tick hoàn thành riêng rẽ.

## 2. Backup và lưu trữ Markdown

Theo yêu cầu của Sếp, mặc dù các task được đẩy vào Database (Local Storage / Google Sheets sync) để Dashboard hiển thị theo chuẩn, các Agent vẫn cần backup dữ liệu ra các file `.md` (Markdown) tương ứng trong thư mục `02_PROJECTs` hoặc `.agent/rules` để trích xuất hoặc tìm kiếm nhanh.

- Mỗi ngày, PM Agent cần rà soát các action chưa hoàn thành (Pending) và xuất ra một file summary markdown.
- Các ghi chú chi tiết hoặc log hội thoại sẽ được lưu vào markdown, trong khi chỉ **tên task ngắn gọn, rõ ràng** mới được đẩy vào thuộc tính `title` của `db.actions`.

## 3. Cập nhật tiến độ

Khi một agent hoặc CEO hoàn thành công việc, trạng thái (`status`) của Action phải được chuyển từ `Pending` sang `Done`. Giao diện sẽ tự động gạch bỏ hoặc ẩn các task này khỏi mục "Nhiệm vụ ưu tiên hôm nay".
