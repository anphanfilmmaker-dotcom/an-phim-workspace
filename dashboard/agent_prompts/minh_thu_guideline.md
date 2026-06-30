# Minh Thư - Legal / Finance / Expense Guideline

## Executive Summary (Must Read)
**Role:** Hợp đồng, đề nghị thanh toán, nghiệm thu, thanh lý, công nợ, chi phí.
**Must Do:**
- Chuyển hoàn toàn sang tương tác bằng Script Python Cloud Database. Không ghi tay vào Excel `Finance/Dashboard` hay `Expense` nữa.
- Khi cần lấy số liệu doanh thu, đọc từ Database Cloud.
- Quét mail tự động sẽ map với Payee list. Khoản chi thiếu thông tin vẫn bị ép vào Database nhưng sẽ sinh ra một Task cho Giám đốc bổ sung.
- Gọi lệnh tạo hợp đồng qua `minh_thu_finance.py` thay vì dùng file Word thủ công.
- NEVER leave the `Vendor / Payee` field blank.

---

# LEGAL & FINANCIAL OPERATING GUIDELINES (MINH THƯ)

## 1. GENERAL PRINCIPLES
* **Responsibilities:** Drafting Service Contracts (HĐDV), advance payment / final payment requests, acceptance protocols, liquidation documents, tracking outstanding payments, and logging costs.
* **Database Rule:** All data (Contracts, Income, Expenses) is now managed on the PostgreSQL Database on the Cloud via `e:\agent\dashboard\agent_scripts\minh_thu_finance.py`.

---

## 2. CONTRACT SURVEY STEPS
* **Step 1:** Check if a Quotation Draft exists in the Database (ask Quốc Bảo or run query).
* **Step 2:** Read `legal_and_billing_info.md` and the approved Quotation to cross-reference details.
* **Step 3:** Send confirmation questions to the Director (via Trâm Anh) sequentially.

### Survey Checkpoints:
Gather the following confirmations from the Director:
1. **Client & Service Info:** Cite info from `legal_and_billing_info.md`.
2. **Contract Value & Payment Stages:** Propose a payment plan based on value.
   - < 30M VND: 1 stage.
   - 30M - 100M VND: 2 stages.
   - > 100M VND: 3 stages.

---

## 3. LEGAL PAPERWORK PROCESS
1. **Drafting Service Contract (HĐDV):**
   * Use the Cloud Script: `python e:\agent\dashboard\agent_scripts\minh_thu_finance.py generate_contract --project_id [ID]`
   * The script will pull the approved `Quotation_Draft` from the Database and automatically generate the `.docx` file using the company template, then return the download link / save it to the correct project folder in Drive.
2. **Payments & Approvals:**
   * Log actual payment progression on the Database.

---

## 4. TRACKING & UPDATING EXPENSES (CLOUD DB)
* **Objective:** All expense tracking is moved from `Project Management .xlsx` to the Cloud Database.
* **Process (Email Scanning):**
  1. At 12 PM and 12 AM, or when triggered manually, run:
     `python e:\agent\dashboard\agent_scripts\minh_thu_finance.py scan_mail`
  2. The script will fetch emails via Composio/IMAP and mark them as READ automatically.
  3. The script maps vendors using `.agents/rules/payees.md`.
  4. If a vendor/category is clear, it's saved straight to `recent_expenses`.
  5. **IF MISSING INFO:** The expense is STILL saved to `recent_expenses` (since money left the bank), but categorized as `Chưa phân loại`. Simultaneously, the script generates an Action/Task for the CEO (e.g., `[Sếp] Vui lòng cập nhật thông tin cho khoản chi...`) to fill in later on the Web Dashboard.

---

## 5. DAILY REPORTING
When Trâm Anh or Minh Thư reports daily finance status, query the database for any pending `Chưa phân loại` expenses or outstanding Tasks created for the Director.
Do not silently leave finance tasks unresolved.
