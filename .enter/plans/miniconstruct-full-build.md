# MiniConstruct — Full Application Build Plan

## Context
Building MiniConstruct from scratch — a construction materials inventory management system for a store owner/admin. The project is currently an empty workspace (only README.md). This plan covers all 23 user stories across 6 sprints from the product backlog.

**Tech Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Auth, Database, Edge Functions)

---

## Database Schema (ERD)

### Tables

**profiles**
- id (uuid PK, FK → auth.users)
- full_name (text)
- role (text, default 'admin')
- created_at

**categories**
- id (uuid PK)
- name (text, unique)
- description (text)
- created_at

**products**
- id (uuid PK)
- name (text)
- description (text)
- category_id (uuid FK → categories)
- unit (text) — e.g. "bags", "pcs", "meters"
- unit_price (numeric)
- stock_quantity (integer)
- reorder_level (integer, default 10)
- created_at, updated_at

**transactions**
- id (uuid PK)
- transaction_number (text, unique, auto-generated)
- customer_name (text)
- transaction_date (timestamptz)
- total_amount (numeric)
- status (text: 'completed' | 'partially_returned' | 'fully_returned')
- created_by (uuid FK → profiles)
- created_at

**transaction_items**
- id (uuid PK)
- transaction_id (uuid FK → transactions)
- product_id (uuid FK → products)
- quantity (integer)
- unit_price (numeric)
- subtotal (numeric)

**returns**
- id (uuid PK)
- return_number (text, unique)
- transaction_id (uuid FK → transactions)
- reason (text)
- total_refund (numeric)
- created_by (uuid FK → profiles)
- created_at

**return_items**
- id (uuid PK)
- return_id (uuid FK → returns)
- product_id (uuid FK → products)
- transaction_item_id (uuid FK → transaction_items)
- quantity (integer)
- refund_amount (numeric)

**audit_logs**
- id (uuid PK)
- user_id (uuid FK → profiles)
- action (text) — e.g. 'LOGIN', 'LOGOUT', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'CREATE_TRANSACTION', 'PROCESS_RETURN'
- table_name (text)
- record_id (text)
- details (jsonb)
- created_at

### Database Functions & Triggers

1. **`deduct_inventory_on_sale()`** — Trigger on `transaction_items INSERT`: deducts `quantity` from `products.stock_quantity`
2. **`restore_inventory_on_return()`** — Trigger on `return_items INSERT`: adds `quantity` back to `products.stock_quantity`
3. **`set_updated_at()`** — Trigger on `products UPDATE`: updates `updated_at` timestamp
4. **`generate_transaction_number()`** — Function to auto-generate TXN-YYYYMMDD-XXXX format
5. **`generate_return_number()`** — Function to auto-generate RTN-YYYYMMDD-XXXX format

### Row Level Security (RLS)
- All tables: authenticated users only (single admin role)

---

## Frontend Architecture

### Project Setup
- Initialize Vite + React + TypeScript
- Install: tailwindcss, shadcn/ui, react-router-dom, @supabase/supabase-js, recharts, lucide-react, react-hook-form, zod, @tanstack/react-query

### File Structure
```
src/
  lib/
    supabase.ts          — Supabase client
    utils.ts             — helpers
  types/
    index.ts             — all TypeScript types/interfaces
  hooks/
    useAuth.ts
    useProducts.ts
    useTransactions.ts
    useReturns.ts
    useForecast.ts
    useAuditLogs.ts
  components/
    layout/
      AppLayout.tsx       — sidebar + header wrapper
      Sidebar.tsx
      Header.tsx
    ui/                   — shadcn components
    shared/
      ConfirmDialog.tsx
      DataTable.tsx
      StatsCard.tsx
  pages/
    LoginPage.tsx
    DashboardPage.tsx
    InventoryPage.tsx
    TransactionsPage.tsx
    NewTransactionPage.tsx
    ReturnsPage.tsx
    ForecastPage.tsx
    AuditLogsPage.tsx
  App.tsx                 — router + auth guard
  main.tsx
```

---

## Feature Breakdown by Sprint

### Sprint 1 — Authentication (MC001, MC002, MCSEC001, MCSEC002, MCSEC004, MCSEC009)
- Supabase Auth for login/logout
- Login page with email + password form
- Strong password validation (8+ chars, uppercase, lowercase, number, special char) via Zod
- Protected routes (redirect to /login if unauthenticated)
- Auto-logout on session expiry
- Audit log: LOGIN / LOGOUT events

### Sprint 2 — Inventory CRUD (MC003–MC005, MCSEC003, MCSEC007, MCSEC008)
- Inventory list page with DataTable
- Add product modal (name, description, category, unit, price, stock, reorder level)
- Edit product modal with pre-filled form
- Delete with confirmation dialog
- Categories seeded on setup
- Audit log: CREATE/UPDATE/DELETE product events

### Sprint 3 — Search & Filter + Audit Logs (MC006, MC007, MCSEC005, MCSEC006)
- Search bar filtering products by name/keyword (client-side real-time)
- Category filter dropdown
- Reset filter button
- Audit Logs page (admin view): table with action, user, timestamp, details

### Sprint 4 — Transactions (MC008, MC009)
- New Transaction page: product selector, quantity input, auto price calculation, running total
- Submit transaction → stores in `transactions` + `transaction_items`
- DB trigger auto-deducts inventory
- Transaction list with date, customer, total, status

### Sprint 5 — Returns (MC010, MC011)
- Returns page: search/select original transaction
- Select product(s) to return, enter quantity
- Submit return → stores in `returns` + `return_items`
- DB trigger auto-restores inventory
- Return list with reference transaction

### Sprint 6 — Demand Forecasting (MC012, MC013, MC014)
- Forecast engine (frontend utility):
  - Pull last 6 months of `transaction_items` grouped by product + month
  - Apply Simple Moving Average (3-month window)
  - Compare forecasted demand vs current stock
  - Compute suggested reorder quantity = max(0, forecast - stock)
- Forecast page: table + bar chart (recharts) showing current stock vs forecasted demand
- Reorder recommendations highlighted in red when stock < forecast

### Dashboard (Always visible)
- Stats cards: Total Products, Low Stock Items, Today's Sales, Total Transactions
- Recent transactions table
- Low stock alerts

---

## Supabase Setup Steps
1. Enable Supabase via `supabase_enable` tool
2. Run SQL migrations (schema + RLS + triggers + functions)
3. Seed initial categories (Cement, Steel, Lumber, Aggregates, Electrical, Plumbing, Paint, Tools)
4. Create initial admin user via Supabase Auth

---

## Design System
- Color: Construction/industrial theme — amber/orange primary, dark slate backgrounds
- Typography: Clean sans-serif
- Layout: Fixed sidebar navigation + top header
- Responsive: sidebar collapses on mobile

---

## Verification
- Login with correct/incorrect credentials
- Add, edit, delete products and verify inventory updates
- Create a transaction and verify stock deduction
- Process a return and verify stock restoration
- Check audit logs for all actions
- View forecast page with sample sales data
