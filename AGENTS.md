# AGENT RULES AND CONSTRAINTS FOR AN PHIM WORKSPACE

Tất cả các AI Agents (Minh Thư, Trâm Anh, Minh Đan, Quốc Bảo, Chí Hải...) khi thao tác với Database hoặc xử lý logic liên quan đến Dự án (Projects), Thu chi (Expense Transactions) và Giấy tờ (Project Documents) **BẮT BUỘC** phải tuân thủ nghiêm ngặt các quy tắc dữ liệu sau đây. Bất kỳ sự sai lệch nào sẽ dẫn đến lỗi Database (do đã bị khóa bằng CHECK CONSTRAINT).

## 1. Trạng thái Dự án (Project Status)
Cột `status` trong bảng `projects` chỉ được phép nhận các giá trị chính xác tuyệt đối như sau (phân biệt hoa thường):
- `Chưa bắt đầu`
- `Đang làm`
- `Chờ feedback`
- `Cần revise`
- `Hoàn thành`
- `Tạm dừng`
- `Hidden` (Trạng thái đặc biệt dùng để ẩn dự án nội bộ/cá nhân, không hiển thị trên UI).

**Tuyệt đối KHÔNG ĐƯỢC tự bịa ra** các trạng thái khác như "On hold", "Done", "In progress", "Đã xong", v.v.

## 2. Loại Dự án (Project Type)
Cột `projecttype` trong bảng `projects` chỉ được phép nhận các giá trị chính xác tuyệt đối như sau (phân biệt hoa thường):
- `AI Render`
- `Marketing`
- `AI Image`
- `AI Film`
- `VFX`
- `Graphic`
- `Script`
- `Video`
- `Event`
- `Internal` (Loại đặc biệt dùng cho dự án Công ty/Cá nhân).

**Tuyệt đối KHÔNG ĐƯỢC tự bịa ra** các loại dự án khác như "Animation", "Chụp ảnh", v.v.

## 3. Quản lý Thu Chi (Expense Transactions)
Khi thao tác với bảng `expensetransactions`, tuyệt đối tuân thủ 3 quy tắc sau:

### 3.1 Hạng mục chi phí (Expense Category)
Cột `category` chỉ được phép nhận các giá trị (phân biệt hoa thường):
- `AI tools`
- `Software / SaaS`
- `Freelancer`
- `Production`
- `Equipment`
- `Sales`
- `Food / Meeting`
- `Marketing`
- `Office / Admin`
- `Tax / Fees`
- `Personal`
- `Other`

### 3.2 Phương thức thanh toán (Payment Method)
Cột `paymentmethod` chỉ được phép nhận các giá trị:
- `Cash`
- `Chuyển khoản`
- `Credit card`
- `Momo`
- `Other`

### 3.3 Dự án liên kết (Project Name)
Khi ghi nhận chi phí, nếu chi phí đó không thuộc về một Dự án Khách hàng nào cụ thể, phải phân bổ nó vào 1 trong 2 Dự án Ẩn hệ thống:
- `Công ty` (ID: `proj_congty`) - Dành cho các chi phí vận hành chung của công ty.
- `Cá nhân` (ID: `proj_canhan`) - Dành cho các chi phí cá nhân.

## 4. Trạng thái Giấy tờ (Document Status)
Khi thao tác với cột `overallstatus` trong bảng `projectdocuments` (trạng thái chung của giấy tờ dự án), chỉ được phép sử dụng các giá trị sau (phân biệt hoa thường):
- `Chưa có`
- `Đã kí`
- `Chờ kí`
- `Đã gửi`
- `Đã đủ`
- `Chờ đợt 2`

---
**LƯU Ý CHUNG:** Nếu người dùng yêu cầu bằng các từ đồng nghĩa (ví dụ: "chuyển sang on hold đi em", "chi tiền mua AI", "giấy tờ đang chờ chữ ký"), AI Agent phải tự động mapping (chuyển đổi) sang giá trị chuẩn tương ứng (ví dụ: `Tạm dừng`, `AI tools`, `Chờ kí`) trước khi gọi lệnh SQL.
