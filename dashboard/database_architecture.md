# Hướng dẫn Đọc & Ghi Database (AN PHIM Dashboard)

Tài liệu này dùng để hướng dẫn các AI Agent hoặc Sub-agent hiểu về cơ chế quản lý dữ liệu hiện tại của hệ thống.

## 1. Cấu trúc dữ liệu (Data Schema)

Hệ thống sử dụng cấu trúc Mock Database mô phỏng Google Sheets, được định nghĩa thông qua interface `GoogleSheetDB` trong file `src/types.ts`.

Database bao gồm các thực thể chính:
- `projects`: Thông tin các dự án (Tên, Budget, Received, Trạng thái, Milestones, Phân loại...).
- `schedule`: Lịch làm việc chung, sự kiện cá nhân và dự án (CalendarEvent).
- `actions` & `tasks`: Danh sách công việc ưu tiên (CEOAction) và Tasks của AI.
- `documents` & `projectDocuments`: Quản lý các chứng từ, hợp đồng, báo giá, VAT.
- `expenseTransactions` & `incomes`: Lưu lịch sử dòng tiền vào/ra và các khoản chi tiêu.
- `dashboard`: Các chỉ số báo cáo tổng quan (Cash available, receivables, active projects).

## 2. Cơ chế lưu trữ (Storage Layer)

Hệ thống đang lưu trữ dữ liệu dưới dạng cục bộ ở Browser thông qua **LocalStorage**.
- **Key Local Storage:** `anphim_os_google_sheet_data_v32` (Quản lý tại file `src/data.ts`)

## 3. Cách Đọc Dữ Liệu (Read)

Mọi dữ liệu khởi tạo của hệ thống được load lên thông qua hàm `getStoredSheetData()` trong `src/data.ts`.

- Tại component gốc `App.tsx`, dữ liệu được đưa vào state của React:
  ```tsx
  const [db, setDb] = useState<GoogleSheetDB>(getStoredSheetData());
  ```
- Hàm `getStoredSheetData()` sẽ lấy data dạng JSON từ LocalStorage. Nếu chưa có, nó sẽ khởi tạo bằng dữ liệu cứng `INITIAL_SHEET_DATA`.
- **Lưu ý cho Agent:** Khi muốn đọc hoặc tham chiếu dữ liệu, hãy tìm đến state `db` được truyền dạng Props xuống các components, hoặc gọi trực tiếp `getStoredSheetData()`.

## 4. Cách Ghi Dữ Liệu (Write)

**QUAN TRỌNG:** Không bao giờ dùng `localStorage.setItem` trực tiếp để lưu Database. Việc lưu và đồng bộ data bắt buộc phải đi qua các hàm wrapper để đảm bảo tính nhất quán của dữ liệu (Data Consistency).

1. **Ở cấp độ Component con (UI Layer):** 
   Gọi các callback từ component cha (VD: `updateDbState`, `handleUpdateProject`, `handleAddEvent`...) được pass qua Props.
   Ví dụ trong `App.tsx`:
   ```tsx
   const updateDbState = (newDb: GoogleSheetDB) => {
     setDb(newDb);
     setStoredSheetData(newDb); // Lưu vào Local Storage
   };
   ```

2. **Ở cấp độ Logic Data (`src/data.ts`):**
   Gọi hàm `setStoredSheetData(data: GoogleSheetDB)`. Hàm này sẽ làm nhiệm vụ:
   - Copy dữ liệu gốc.
   - Tự động **tính toán lại các chỉ số tổng quan** (VD: tính lại `dashboard.cashAvailable`, `dashboard.receivable`, `activeProjectsCount`).
   - Sau đó mới lưu vào `localStorage`.

**Ví dụ khi Agent cần sinh code để update một dự án:**
```tsx
const handleUpdateProject = (updatedProject: Project) => {
  const newProjects = db.projects.map(p => 
    p.id === updatedProject.id ? updatedProject : p
  );
  
  updateDbState({
    ...db,
    projects: newProjects
  });
};
```

## 5. Kết luận

Bất kì Agent nào khi thao tác thay đổi dữ liệu cần đảm bảo:
- Clone nguyên cây trạng thái `db`.
- Ghi đè thực thể cần thay đổi (tuyệt đối không mutate trực tiếp state object).
- Truyền cây trạng thái mới qua hàm `updateDbState` hoặc `setStoredSheetData` để đảm bảo lưu Local Storage và kích hoạt re-render UI.
