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
- `Vay / Nợ`
- `Shopping`
- `Sales`
- `Food / Meeting`
- `Marketing`
- `Office / Admin`
- `Tax / Fees`
- `Personal`
- `Health Care`
- `Gia đình & Định kỳ`
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

## 5. Ưu tiên số liệu Hợp đồng (Contract vs Quotation)
Khi xử lý số liệu dự án (như Budget, Báo giá, SOW...), nếu có sự chênh lệch giữa file Báo giá (Quotation/Excel) và file Hợp đồng chính thức (Contract/Word/PDF), **LUÔN LUÔN ưu tiên lấy con số cuối cùng được ghi trong Hợp đồng** làm chuẩn (Single Source of Truth).

## 6. Không tự ý quét mail (Disable Auto-Scan)
Agent tuyệt đối KHÔNG ĐƯỢC tự ý gọi lệnh quét mail (vd: `--scan_mail`) ngầm ở dưới background khi người dùng chưa có yêu cầu cụ thể. Phải luôn chờ sếp ra lệnh rõ ràng (ví dụ: "quét mail đi", "cập nhật thu chi đi") mới được phép chạy.

## 7. Chống trùng lặp dữ liệu Thu Chi (Deduplication & Email Receipts)
- **Ưu tiên Sao kê Ngân hàng / MoMo:** Dữ liệu trừ tiền thực tế từ Sao kê ngân hàng (mã `FT...`) và MoMo là nguồn chuẩn duy nhất (Single Source of Truth) cho bảng `expensetransactions`.
- **Cấm tạo ID tùy tiện từ Email:** Tuyệt đối không cắt chữ từ tiêu đề hoặc nội dung email cảm ơn/xác nhận (ví dụ: `exp_Thank`, `exp_Your`) để làm mã giao dịch. Phải trích xuất đúng mã Invoice ID / Order ID chuẩn.
- **Đối soát chéo (Cross-check) trước khi Insert:** Trước khi thêm bất kỳ giao dịch nào từ email/hóa đơn hoặc nhập tay, BẮT BUỘC phải đối soát xem trong khoảng thời gian +/- 2 ngày đã tồn tại giao dịch nào cùng số tiền và cùng Vendor/MoMo/sao kê ngân hàng chưa. Nếu đã có thì TUYỆT ĐỐI KHÔNG TẠO THÊM record chi tiền mới để tránh bị nhân đôi chi phí.
- **Loại bỏ bản ghi nhập tay khi đã có Sao kê:** Khi quét sao kê ngân hàng chính thức, nếu phát hiện bản ghi nhập tay cũ có cùng ngày, cùng số tiền và cùng mục đích, phải hợp nhất và loại bỏ bản ghi nhập tay cũ để tránh trùng lặp.

## 8. Phân tách rõ ràng giữa Trang Dự Án (Công ty) và Trang Tài Chính (Cá nhân)
- **Trang Dự Án (Projects Page - Tài khoản Công ty):**
  - Khi người dùng nói *"khách đã thanh toán"* hoặc cập nhật tiến độ hợp đồng, đây là thanh toán vào **Tài khoản Công ty**. Cột `received`, `paymentd1`, `paymentd2` trên bảng `projects` được cập nhật khớp với số tiền trên giấy tờ Hợp đồng (bao gồm VAT).
- **Trang Tài Chính (Finance Page - Tài khoản Cá nhân):**
  - Trang Tài chính **CHỈ quản lý dòng tiền thực tế trên Tài khoản Cá nhân** của người dùng.
  - Tuyệt đối **KHÔNG tự động ghi nhận thu nhập (Income)** từ số tiền `received` của các dự án công ty vào trang Tài chính.
  - Bảng `incomes` và `expensetransactions` chỉ được tạo khi có giao dịch thực tế trên tài khoản cá nhân, và **BẮT BUỘC ưu tiên có Mã giao dịch ngân hàng (`FT...`) hoặc MoMo**.
  - Tiền mặt sẵn có (`cashAvailable`) chỉ được tính từ: $\text{Tổng Incomes thực tế} - \text{Tổng Expense thực tế}$.

