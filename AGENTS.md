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
- `AI / Tools`
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
- `Di chuyển`
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
**LƯU Ý CHUNG:** Nếu người dùng yêu cầu bằng các từ đồng nghĩa (ví dụ: "chuyển sang on hold đi em", "chi tiền mua AI", "giấy tờ đang chờ chữ ký"), AI Agent phải tự động mapping (chuyển đổi) sang giá trị chuẩn tương ứng (ví dụ: `Tạm dừng`, `AI / Tools`, `Chờ kí`) trước khi gọi lệnh SQL.

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

## 9. Phân biệt rõ ràng giữa Bảng Actions và Bảng Schedule
- **Bảng `schedule` (Lịch trình & việc Sếp làm hàng ngày - Màu Xanh Lá):**
  - Quản lý TẤT CẢ công việc, nhiệm vụ, lịch hẹn và hoạt động Sếp thực hiện mỗi ngày.
  - Khi Sếp yêu cầu note việc (ví dụ: *"note cho tôi việc ngày mai..."*, chat nhờ Trâm Anh note việc...), Trâm Anh và các Agent **BẮT BUỘC lưu vào bảng `schedule`** và **TỰ ĐỘNG SẮP XẾP KHUNG GIỜ HỢP LÝ** (`startTime`, `endTime`) rải đều trong ngày làm việc.
  - Tuyệt đối KHÔNG được lưu việc Sếp làm vào bảng `actions`.
- **Bảng `actions` (Yêu cầu Agent cần Sếp Input - Màu Cam):**
  - CHỈ dành cho các yêu cầu do AI Agent tự động sinh ra khi chạy tác vụ ngầm (ví dụ: quét mail/sao kê thiếu hóa đơn, thiếu thông tin khoản chi, cần Sếp duyệt báo giá...).
  - Các mục này **KHÔNG CÓ THỜI GIAN** (không có giờ cụ thể).
- **Tránh trùng lặp:** Tuyệt đối không tạo 1 công việc vào cả 2 bảng. Trên giao diện Today Task, các mục từ Schedule sẽ có viền xanh lá kèm thời gian, các mục từ Action sẽ có viền cam và badge "Cần Input".

## 10. Xử lý Chi phí Ví Trả Sau MoMo & Công cụ SaaS (Canva, CapCut)
- **Giai đoạn đến hết Tháng 9/2026:**
  - Canva Pro (150.000đ/tháng) và CapCut Pro (265.000đ/tháng) được thanh toán qua Ví Trả Sau MoMo.
  - Khi quét sao kê ngân hàng VPBank, các lệnh thanh toán dư nợ Ví Trả Sau MoMo (mã `FT...`) đã bao gồm chi phí của Canva và CapCut.
  - **Quy tắc Trích trừ (Cost Allocation / Split):** TUYỆT ĐỐI KHÔNG tạo thêm bản ghi chi phí Canva / CapCut độc lập ngoài sao kê để tránh bị nhân đôi (double) chi phí. Phải trích (split) trực tiếp từ lệnh thanh toán dư nợ Ví Trả Sau MoMo của kỳ tương ứng:
    - Phần Canva (150k) / CapCut (265k): Hạng mục `AI / Tools`, dự án `PROJ-CONGTY`.
    - Phần còn lại: Hạng mục `Gia đình & Định kỳ`, dự án `PROJ-CANHAN`.
- **Giai đoạn từ Tháng 10/2026 trở đi:**
  - Sếp chuyển đổi phương thức thanh toán Canva và CapCut sang liên kết trực tiếp Thẻ Tín Dụng (Credit Card), không qua Ví Trả Sau MoMo nữa.
  - Khi đó, các giao dịch sẽ trừ trực tiếp vào Thẻ Tín Dụng và được ghi nhận độc lập với Payment Method là `Credit card`.

## 11. Quy tắc riêng cho Khách hàng Inverse (Làm qua Thảo)
- **Hợp đồng & Giấy tờ:** Tất cả các job thực hiện với khách hàng **Inverse** (như Ensure bệnh học, Glucerna, Pediasure...) đều làm qua Thảo ➔ **TUYỆT ĐỐI KHÔNG CẦN CHUẨN BỊ HỢP ĐỒNG** hay giấy tờ pháp lý. Trạng thái giấy tờ trên `projectdocuments` được mặc định là `Đã đủ` và **TẤT CẢ các cột tick (`quote`, `contract`, `vatr1`, `vatr2`, `vatr3`, `liquidation`) đều được đánh dấu `True` (xanh toàn bộ)**.
- **Thuế TNCN:** Doanh thu các dự án từ Inverse nhận đủ **100% Net, không bị khấu trừ 8% thuế**.
- **Lưu trữ Drive:** Các job của Inverse không bắt buộc phải có folder riêng trên Drive nếu sếp không yêu cầu tạo.

## 12. Thông tin Gia đình Sếp (Family Info)
- Sếp có 2 con:
  - Bé lớn: **Bông**.
  - Bé nhỏ: **Haha** (gọi tắt là **Ha**, TUYỆT ĐỐI không viết nhầm thành "Hạ").
- Các khoản chi phí liên quan đến con cái (tiền học, khám bệnh, sữa, sinh nhật...): luôn ghi rõ tên chính xác là **Bông** hoặc **Ha (Haha)**.

## 13. Quy tắc riêng cho Khách hàng K87K (Dự án Winterland)
- **Cấu trúc Thư mục Drive:** Tập trung tại `02_PROJECTs\K87K\Documents\_THÁNG {X}`, KHÔNG tạo thư mục riêng theo tên từng tháng ở ngoài.
- **Tiêu chuẩn Milestone (Lấy Tháng 7 làm chuẩn):**
  Tất cả các dự án Winterland hàng tháng đều tự động tạo 8 Milestone chuẩn theo chu kỳ 1 tháng, tính từ ngày ký / bắt đầu ($D_0$):
  1. `Review tháng trước` (Ngày $D_0 + 0$)
  2. `Lên kế hoạch tháng mới` (Ngày $D_0 + 0$)
  3. `Quay ngày 1` (Ngày $D_0 + 9$)
  4. `Quay ngày 2` (Ngày $D_0 + 15$)
  5. `Post 15 clip` (Ngày $D_0 + 19$)
  6. `Post 5 bài` (Ngày $D_0 + 22$)
  7. `Review dịch vụ` (Ngày $D_0 + 29$)
  8. `Bàn giao và chuẩn bị tháng tiếp theo` (Ngày $D_0 + 31$, hoặc ngày cuối chu kỳ 1 tháng)
  *Ví dụ:* Nếu ký vào ngày 15 hàng tháng ($D_0 = 15/08$): Mốc 1 & 2: `15/08`, Mốc 3: `24/08`, Mốc 4: `30/08`, Mốc 5: `03/09`, Mốc 6: `06/09`, Mốc 7: `13/09`, Mốc 8: `15/09`.
- **Nhân sự Nội dung (Creative & Social):** Sếp đã thuê **Tít** phụ trách phần nội dung / clip / bài viết cho Winterland ➔ **TUYỆT ĐỐI KHÔNG giao task kịch bản / lên khung nội dung cho Minh Đan**.
- **Xử lý Giấy tờ & Hợp đồng (Documents):**
  - Khi bắt đầu tháng mới, Agent kiểm tra thư mục `02_PROJECTs\K87K\Documents\_THÁNG {X}` xem đã có các file mẫu / file copy sẵn chưa (như `HĐDV`, `BBTL`, `Đề nghị tạm ứng`, `Đề nghị thanh toán`).
  - Nếu đã có file: Chỉ cần đổi tên file chuẩn (bỏ "Copy of...", đặt đúng tên Tháng X), và **cập nhật ngày giờ thời gian thực hiện, ngày ký, số hợp đồng** cho phù hợp với tháng mới. **Toàn bộ điều khoản, giá tiền (32.400.000đ gồm VAT), pháp nhân Bên A & Bên B giữ nguyên 100%**.

## 14. Quy chuẩn Đánh số Hợp đồng (Contract Numbering Format)
Tất cả các Hợp đồng dịch vụ (HĐDV) do AI Agent soạn thảo hoặc cập nhật **BẮT BUỘC** phải tuân theo cấu trúc số hợp đồng chuẩn mới sau đây:
- **Cấu trúc chung:**
  $$\text{\{DDMMYYYY\}/HDDV/\{TÊN KHÁCH\} - ANPHIM / \{TÊN DỰ ÁN\}}$$
  * `{DDMMYYYY}`: Ngày tháng năm ký hợp đồng (8 chữ số, ví dụ `15092026`).
  * `HDDV`: Hợp đồng dịch vụ.
  * `{TÊN KHÁCH}`: Tên khách hàng / pháp nhân Bên A viết hoa (ví dụ: `VISTAX`, `9KOLOR`, `F35STORY`...).
  * `ANPHIM`: Pháp nhân thực hiện Bên B.
  * `{TÊN DỰ ÁN}`: Tên dự án viết hoa.
  * *Ví dụ:* `08052026/HDDV/VISTAX - ANPHIM / ATERA`, `25072026/HDDV/9KOLOR - ANPHIM / FORESTIA`.

- **Quy tắc riêng cho dự án Winterland (K87K):**
  Thêm tháng vào sau tên dự án theo đúng cú pháp:
  $$\text{\{DDMMYYYY\}/HDDV/WINTERLAND87 - ANPHIM / WINTERLAND87 THÁNG \{X\}}$$
  * *Ví dụ Tháng 9 (ký ngày 15/09/2026):* `15092026/HDDV/WINTERLAND87 - ANPHIM / WINTERLAND87 THÁNG 9`
  * *Ví dụ Tháng 8 (ký ngày 15/08/2026):* `15082026/HDDV/WINTERLAND87 - ANPHIM / WINTERLAND87 THÁNG 8`


