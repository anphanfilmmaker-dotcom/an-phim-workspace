# 🚀 HANDOVER DOCUMENT FOR IT AGENT
**Project**: An Phim Workspace Dashboard
**Location**: `e:\agent\dashboard`
**Status**: Đang hoạt động, đã tích hợp Local Database và AI Chat.

Chào IT Agent, dưới đây là toàn bộ Context và hướng dẫn để bạn có thể tiếp quản và phát triển hệ thống này một cách liền mạch nhất. Xin hãy đọc kỹ trước khi thực hiện các thay đổi mã nguồn.

---

## 🛠 1. Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS.
- **Backend**: NodeJS (Express) viết trong file `server.cjs`.
- **Database**: SQLite cục bộ (`db.sqlite`).
- **AI Integration**: `@google/genai` (Sử dụng model `gemini-2.5-flash`).

## 📁 2. Cấu trúc cốt lõi (Core Structure)
- `server.cjs`: Trái tim của Backend. Chứa logic khởi tạo Database, các endpoint CRUD, và đặc biệt là endpoint `POST /api/chat` xử lý giao tiếp với Gemini.
- `db.sqlite`: File Database chính (tuyệt đối không xóa).
- `package.json`: Chứa các scripts khởi chạy.
- `src/App.tsx` & `src/components/`: Mã nguồn giao diện Frontend.
- `src/components/AgentChatModal.tsx`: Component quản lý khung Chat với AI, đã tích hợp localStorage để lưu lịch sử và truyền context đa lượt (multi-turn conversation) lên backend.
- `.env`: Chứa các biến môi trường cấu hình (hiện tại quan trọng nhất là `GEMINI_API_KEY`).

## ⚙️ 3. Cách khởi chạy (How to Run)
Hệ thống bao gồm 2 server chạy song song:
1. **Backend Server** (Cổng 5000 mặc định):
   ```bash
   npm run start
   ```
2. **Frontend Dev Server** (Cổng 3000):
   ```bash
   npm run dev
   ```

## ⚠️ 4. Các thay đổi Kiến trúc gần đây (CRITICAL NOTES)
- **ĐÃ LOẠI BỎ EXCEL**: Hệ thống trước đây dùng các file `excel-parser.cjs`, `excel-writer.cjs` để đồng bộ data từ file Excel 2 chiều. **Kiến trúc này đã bị loại bỏ hoàn toàn.** Dữ liệu hiện tại chỉ đọc/ghi trực tiếp trên `db.sqlite`. Vui lòng KHÔNG khôi phục lại logic đọc/ghi Excel.
- **Tích hợp Live Chat AI**: 
  - Tại Frontend (`AgentsPage.tsx`), người dùng bấm "Chat trực tiếp" sẽ mở `AgentChatModal.tsx`.
  - Frontend sẽ lưu toàn bộ lịch sử hội thoại vào `localStorage` (key: `chat_history_<agent_id>`).
  - Frontend ném mảng `history` lên `/api/chat`.
  - Backend sử dụng `systemInstruction` để gán vai (Persona) cho Agent, đồng thời map mảng `history` vào `contents` để thực hiện Multi-turn chat với Google Gemini.

## 🔑 5. Biến Môi Trường (.env)
Bắt buộc phải có file `.env` chứa:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
Nếu bạn sửa file `.env` hoặc `server.cjs`, bạn phải kill tiến trình NodeJS và chạy lại `npm run start` để hệ thống nhận cấu hình mới.

---
**Lời nhắn từ Agent tiền nhiệm**: Hệ thống đã ổn định chức năng chat và DB. Bạn hãy phát triển tiếp các tính năng mới dựa trên nền tảng React Component và Express Router hiện có nhé. Good luck! 🚀
