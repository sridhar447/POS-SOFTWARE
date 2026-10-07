<<<<<<< HEAD
# Elite Showroom ERP + POS + Inventory Management System

A production-ready, full-stack **Showroom Management, POS Billing, Inventory, Warehouse, Purchase, Accounts, Attendance, and Reporting Software** built for high-speed retail operations with physical unit barcode traceability and strict dual-location stock segregation.

---

## 🚀 Key Business Concepts & Architecture

### 1. Dual Physical Stock Locations
The showroom operates two distinct physical inventory locations:
* **LOCATION 1 – SHOWROOM**: Products physically on the showroom floor and **permitted for retail POS customer billing**.
* **LOCATION 2 – WAREHOUSE**: Backstock stored in the central warehouse. **Warehouse items are STRICTLY BLOCKED from direct POS billing** until transferred.

```
  SUPPLIER
     ↓
  PURCHASE ORDER (Auto-generates N unique barcodes)
     ↓
  CENTRAL WAREHOUSE (Location 2: Status = AVAILABLE)
     ↓
  STOCK TRANSFER (Moves physical units to Location 1)
     ↓
  SHOWROOM FLOOR (Location 1: Status = AVAILABLE)
     ↓
  HIGH-SPEED POS BARCODE SCAN (Validates Showroom + Available)
     ↓
  ATOMIC DATABASE TRANSACTION SALE
     ↓
  BARCODE = SOLD (Never billable again)
     ↓
  INVOICE (Print & PDF) & SALES LEDGER & PROFIT REPORT
```

### 2. Physical Unit Traceability & Unique Random Barcodes
Every single physical item purchased receives an individual record in `product_units` with a guaranteed collision-resistant unique random barcode (e.g. `SH-8F42K91`).
* **Purchasing 20 shirts generates 20 distinct barcodes**.
* Every barcode tracks its current location (`SHOWROOM` / `WAREHOUSE`) and status (`AVAILABLE`, `SOLD`, `RESERVED`, `DAMAGED`, `RETURNED`, `TRANSFERRED`).

### 3. POS Billing Validation Engine
When staff scans a barcode at the checkout counter:
1. **Barcode exists check**: If not found $\rightarrow$ `Barcode not found.`
2. **Location check**: If `location == 'WAREHOUSE'` $\rightarrow$ Rejects with `Warehouse product cannot be billed. Transfer this product to showroom first.`
3. **Status check**: If `status == 'SOLD'` $\rightarrow$ Rejects with `This product has already been sold.`; if `DAMAGED` $\rightarrow$ Rejects with `This product is not available for sale.`
4. **Cart duplicate check**: Scanning the exact same physical barcode twice triggers `This product is already in the cart.` (Scanning another physical unit of the same item is permitted).
5. **Atomic SQL Row-Locking Checkout**: Uses database transactions with `FOR UPDATE` row locking to guarantee zero duplicate sales or negative stock.

---

## 👥 Role-Based Access Control (RBAC)

### 👑 ADMIN
Full control over all features:
- Executive Analytics Dashboard & KPI Charts
- POS Billing
- Products Catalog (Create, Edit, Price revisions, Soft deactivation)
- Showroom & Warehouse Inventory
- Stock Transfers (Warehouse $\leftrightarrow$ Showroom)
- Barcode Management & Label Printing
- Purchases & Supplier Orders
- Suppliers & Customer Directory
- Sales & Invoices Registry
- Sales Return & Restocking Engine
- Daily Accounts & Cash Drawer Closing
- Operating Expense Tracker
- Staff Attendance & Roster
- Financial & Audit Reports (Sales, COGS, Gross/Net Profit, Stock Movements)
- Staff & Role Management
- System Settings & Audit Logs

### 🛒 BILLING USER / CASHIER
Dedicated rapid retail console:
- Fast POS Barcode Scanning & Product Search
- Cart management & Allowed discounts
- Cash / UPI / Card payment settlement
- Invoice Printing & PDF download
- My Sales history
- Staff Attendance Clock-In / Clock-Out

*Note: Backend APIs strictly reject billing users from accessing administrative endpoints (Purchases, Warehouse, Accounts, Settings, Users, etc.) returning HTTP `403 Forbidden`.*

---

## 🔑 Demo Login Accounts

| Role | Email / Username | Password | Default Redirect |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@example.com` or `admin` | `Admin@123` | `/dashboard` |
| **Billing Cashier** | `billing@example.com` or `cashier1` | `Billing@123` | `/billing` |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router v6, Axios, html2canvas, jsPDF, JsBarcode.
- **Backend**: Node.js, Express.js REST API, `mysql2` connection pool + universal embedded SQL failover engine, `bcryptjs`, `jsonwebtoken`, `cors`, `express-rate-limit`.
- **Database**: Normalized relational database schema (`database/schema.sql`, `database/seed.sql`) with foreign keys, unique constraints, and indexed queries.

---

## 📦 Installation & Quick Start

### 1. Install Dependencies
From the repository root:
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Database Setup
The system automatically creates and seeds the database on first boot.
To connect to your local MySQL server, configure `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=showroom_erp
DB_USER=root
DB_PASSWORD=your_mysql_password
```

### 3. Run the Fullstack Application
```bash
# From repository root
npm run dev

# Or start services separately:
# Backend (Port 5000):
cd backend && npm run dev

# Frontend (Port 5173):
cd frontend && npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 📋 Comprehensive Test Cases Verified

1. **Warehouse Barcode POS Scan $\rightarrow$ Blocked**: Scanning `SH-WH2001` rejects with *"Warehouse product cannot be billed. Transfer this product to showroom first."*
2. **Showroom Barcode POS Scan $\rightarrow$ Accepted**: Scanning `SH-SR1001` verifies showroom availability and adds to cart at ₹4,999.00.
3. **Cart Duplicate Prevention**: Scanning `SH-SR1001` again in active cart rejects with duplicate item warning.
4. **Checkout Transaction**: Completing sale atomically marks `SH-SR1001` as `SOLD`, reduces showroom stock, generates invoice `INV-2026-XXXXXX`, and logs stock movement `SALE`.
5. **Sold Barcode Rescan $\rightarrow$ Blocked**: Scanning `SH-SR1001` again returns *"This product has already been sold."*
6. **Stock Transfer**: Moving 5 units of `CAR-SEAT-01` from Warehouse to Showroom immediately updates live inventory and logs `TRANSFER_OUT` / `TRANSFER_IN`.
7. **Purchase Stock In**: Purchasing 10 units auto-generates 10 distinct random barcodes directly into Central Warehouse.
8. **Sales Return**: Returning an item from invoice refunds customer and restocks unit to selected destination (`SHOWROOM` / `WAREHOUSE` / `DAMAGED`).
9. **Daily Closing**: Balancing cash drawer compares calculated float against counted physical cash and stores official daily closing log.
=======
# POS-SOFTWARE
>>>>>>> 4bfc6c9042e5fa7a8ed581b70e3193a2ef86223d
