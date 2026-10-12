# HƯỚNG DẪN CÀI ĐẶT & CHẠY TRÂM ANH BOT TRÊN GOOGLE CLOUD VM (24/7)

Hệ thống bot Trâm Anh hỗ trợ tự động:
1. **Nhắc trước lịch hẹn 1 tiếng (60 phút)** từ bảng `schedule` (kèm nút bấm `[✅ Đã xong]`).
2. **Báo cáo cuối ngày lúc 21:00 (9h tối)**: tổng kết việc hoàn thành, tồn đọng và action items.
3. **Chào buổi sáng lúc 08:00**: tổng hợp lịch trình ngày mới.
4. **Nhận lệnh nhanh**: `/today`, `/actions`, `/projects`, `/finance`.
5. **Ghi chú nhanh lịch hẹn bằng tin nhắn**: ví dụ *"note mai 9h họp kịch bản"*, bot tự phân loại và ghi vào cơ sở dữ liệu.

---

## CÁCH TRIỂN KHAI LÊN GOOGLE CLOUD VM (CHỈ 3 BƯỚC)

### Bước 1: Copy thư mục `telegram_bot` lên máy ảo Google VM

Từ máy tính cá nhân (hoặc dùng Git / SCP / SSH Google Cloud Console):
Nếu dùng lệnh `scp` hoặc `gcloud compute scp`:
```bash
# Ví dụ tải thư mục lên VM:
gcloud compute scp --recurse E:\.agents\Cloud\telegram_bot <tên-máy-ảo>:~/telegram_bot
```
*Hoặc nếu trên VM đã clone sẵn repo `anphanfilmmaker-dotcom` hoặc thư mục `.agents`, sếp chỉ cần cd vào thư mục `telegram_bot`:*
```bash
cd ~/telegram_bot
# Hoặc: cd /path/to/.agents/Cloud/telegram_bot
```

### Bước 2: Kiểm tra file cấu hình `.env`
Đảm bảo trong thư mục `telegram_bot` trên VM có file `.env` với nội dung:
```env
TELEGRAM_BOT_TOKEN=8602020643:AAFRjTKhtQn9lmcP2APgniikZ5OvCI0e0Bg
TELEGRAM_CHAT_ID=8395230169
DATABASE_URL=postgresql://postgres:jJ7O7ejunRzIWIit@db.puewflzmyqoshiccjkcw.supabase.co:5432/postgres
```

### Bước 3: Chạy script cài đặt tự động
Cấp quyền thực thi và chạy file `deploy_vm.sh`:
```bash
chmod +x deploy_vm.sh
./deploy_vm.sh
```
Script sẽ tự động:
- Cài đặt Python venv và các thư viện cần thiết.
- Thiết lập Systemd Service `tram_anh_bot.service`.
- Khởi chạy bot và cài đặt tự khởi động lại khi máy ảo reboot hoặc crash.

---

## CÁC LỆNH QUẢN LÝ SERVICE TRÊN GOOGLE VM

- **Xem trạng thái bot:**
  ```bash
  sudo systemctl status tram_anh_bot.service
  ```
- **Xem log hoạt động thời gian thực:**
  ```bash
  sudo journalctl -u tram_anh_bot.service -f
  ```
- **Khởi động lại bot:**
  ```bash
  sudo systemctl restart tram_anh_bot.service
  ```
- **Dừng bot:**
  ```bash
  sudo systemctl stop tram_anh_bot.service
  ```

---

## THỬ NGHIỆM TRÊN MÁY TÍNH CÁ NHÂN (LOCAL TEST)

Nếu sếp muốn chạy thử ngay trên máy tính Windows trước khi đưa lên VM:
```powershell
cd E:\.agents\Cloud\telegram_bot
python tram_anh_bot.py
```
Sau đó mở Telegram chat với `@TramAnh_01062026_bot`, gõ `/today` hoặc nhắn tin thử.
