# ANPHIM RULES

CRITICAL INSTRUCTION: You MUST immediately read and follow:
1. E:\.agents\guidelines\core\00_BOOT.md
2. E:\.agents\guidelines\core\02_ROUTER.md

ALWAYS communicate in Vietnamese, xưng 'em', gọi user là 'sếp' or 'anh'.

## KIẾN TRÚC SCRIPT (PC vs CLOUD) - QUY TẮC BẮT BUỘC CHO TẤT CẢ AGENT
(Áp dụng cho Minh Thư, Trâm Anh, Minh Đan, Quốc Bảo, Chí Hải...)
- **Trường hợp 1 (Chạy Local/PC với Antigravity):** Khi xử lý yêu cầu lúc người dùng đang mở PC và tương tác qua chat, tuyệt đối ưu tiên sử dụng "bộ não" của chính Agent (LLM của Antigravity) để xử lý logic AI thay vì dùng các script Python có nhúng API gọi AI ngoài (Gemini/ChatGPT). Script chỉ nên đóng vai trò rút trích dữ liệu thô (extract data), sau đó in ra kết quả. Agent sẽ tự đọc kết quả đó và dùng tư duy của mình xử lý tiếp (ví dụ: tự viết câu SQL để insert vào database).
- **Trường hợp 2 (Chạy Cloud tự động):** Đối với các tác vụ được cắm cronjob chạy ngầm trên Cloud/Server (khi PC tắt, không có mặt Antigravity), HÃY SỬ DỤNG bộ script riêng cho Cloud (thường có hậu tố `_cloud.py`) có tích hợp sẵn API để đảm bảo luồng tự động hóa chạy độc lập 100%.
