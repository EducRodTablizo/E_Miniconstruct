# MiniConstruct System: Functional & Non-Functional Requirements

This document provides a comprehensive overview of the **Functional** and **Non-Functional Requirements** for the **MiniConstruct System**—a modern web-based construction inventory, sales, and return management platform built on React, Vite, Tailwind CSS, TypeScript, and Supabase.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
3. [Functional Requirements (FR)](#functional-requirements-fr)
    - [FR-1: User Authentication & Profile Management](#fr-1-user-authentication--profile-management)
    - [FR-2: Inventory & Category Management](#fr-2-inventory--category-management)
    - [FR-3: Transaction & Point of Sale (POS) Processing](#fr-3-transaction--point-of-sale-pos-processing)
    - [FR-4: Sales Returns & Refund Processing](#fr-4-sales-returns--refund-processing)
    - [FR-5: AI-Powered Inventory & Sales Assistant](#fr-5-ai-powered-inventory--sales-assistant)
    - [FR-6: Historical Reports Generation](#fr-6-historical-reports-generation)
    - [FR-7: System Auditing & Security Logs](#fr-7-system-auditing--security-logs)
4. [Non-Functional Requirements (NFR)](#non-functional-requirements-nfr)
    - [NFR-1: Performance & Latency](#nfr-1-performance--latency)
    - [NFR-2: Security, Privacy & Data Protection](#nfr-2-security-privacy--data-protection)
    - [NFR-3: Reliability, Availability & Fault Tolerance](#nfr-3-reliability-availability--fault-tolerance)
    - [NFR-4: Usability & User Experience (UX)](#nfr-4-usability--user-experience-ux)
    - [NFR-5: Maintainability, Portability & Scalability](#nfr-5-maintainability-portability--scalability)

---

## System Overview
The **MiniConstruct System** is designed to streamline retail and inventory operations for construction supply materials. It bridges the gap between field/storefront transactions and back-office management. Features include:
- A real-time sales register (POS) and inventory tracker.
- An automated sales return ledger that restores stock automatically.
- A streaming AI conversational assistant capable of querying inventory/sales data.
- Chronological historical reporting and robust multi-user auditing.
- Strict database-enforced Role-Based Access Control (RBAC).

---

## Role-Based Access Control (RBAC) Matrix

The system enforces a **3-role hierarchy**: `owner`, `admin`, and `staff`. All accounts must also be explicitly set to `is_active = true` to log in and interact with database services.

| Feature Area | Owner (`owner`) | Administrator (`admin`) | Field/Store Staff (`staff`) |
| :--- | :---: | :---: | :---: |
| **View Dashboard & Metrics** | Yes | Yes | Yes |
| **View Inventory Stock** | Yes | Yes | Yes |
| **Manage Inventory (CRUD Products/Categories)** | **Yes** | **Yes** | No (Read-Only) |
| **Record Transactions (Checkout/POS)** | Yes | Yes | Yes |
| **Process Material Returns & Refunds** | Yes | Yes | Yes |
| **Use AI Assistant (Chat/Query)** | Yes | Yes | Yes |
| **View System Audit Logs** | **Yes** | **Yes** | No |
| **Generate/Export Historical Reports** | **Yes** | **Yes** | No |
| **User Management (Create Staff, Activate/Deactivate)** | **Yes** | **Yes** | No |

> [!NOTE]
> The `owner` and `admin` roles possess identical functional permissions within the application. However, the system is designed to distinguish them at the metadata layer (e.g., the owner is the primary system manager, and admins are authorized delegates).

---

## Functional Requirements (FR)

### FR-1: User Authentication & Profile Management
- **FR-1.1: Secure Authentication**: Users must log in using their email and password. Session states are maintained securely via Supabase Auth (JWT).
- **FR-1.2: Password Recovery & Reset**:
  - Users can request a password-reset link via the **Forgot Password Page** which sends a verification email.
  - Users clicking the reset link are redirected to the **Reset Password Page** to establish new, secure credentials.
- **FR-1.3: Automated Profile Sync**: Upon new user signup, a PostgreSQL database trigger (`trg_new_user`) must automatically extract metadata (e.g., `full_name`, `email`) and insert a corresponding record into the public `profiles` table.
- **FR-1.4: Staff Registration by Admins**: New user accounts cannot sign up freely. They must be registered by a logged-in Owner/Admin using the **User Management Page**, which triggers the `admin-create-user` Supabase Edge Function to create credentials in the auth schema.
- **FR-1.5: Default Staff Assignment**: Any new user created via the system must default to the `staff` role. Privilege escalation to `admin` or `owner` must be performed manually by an existing Owner or Admin.
- **FR-1.6: Account Activation Toggle**: Owners/Admins can toggle the `is_active` boolean on any profile. If deactivated (`is_active = false`), the user is immediately restricted from making any database reads/writes via PostgreSQL Row Level Security (RLS), and their client session is restricted.

---

### FR-2: Inventory & Category Management
- **FR-2.1: Material Category CRUD**:
  - Owners and Admins can create, read, update, and delete material categories (e.g., "Cement", "Plumbing", "Electrical") to organize inventory.
  - Category names must be unique.
- **FR-2.2: Product Inventory CRUD**:
  - Owners and Admins can add new materials, edit existing product properties, or delete obsolete products.
  - Products must store: Name, Description, Category, Unit of Measure (e.g., `pcs`, `bags`, `meters`), Unit Price, Stock Quantity, and Reorder Level.
- **FR-2.3: Read-Only Inventory View**: Staff members can view the list of products, search by name, and filter by category to check real-time stock levels, but are prevented from adding, editing, or deleting items.
- **FR-2.4: Low Stock Alerting**: The system must dynamically compare `stock_quantity` with the `reorder_level`. If stock is less than or equal to the reorder level, a prominent visual warning must display in the inventory grid and the dashboard warning cards.
- **FR-2.5: Real-Time Stock Updates**: Stock levels and product details must synchronize in real-time across all active browser windows using Supabase Realtime replication.

---

### FR-3: Transaction & Point of Sale (POS) Processing
- **FR-3.1: Material Selection & Shopping Cart**: Users (Staff, Admins, or Owners) can search the inventory, add products to a transaction cart, adjust quantities, and view a real-time subtotal.
- **FR-3.2: Transaction Checkout**: Upon checkout, the system compiles a transaction, records customer info (defaulting to "Walk-in Customer"), calculates the total amount, and generates a unique transaction number.
- **FR-3.3: Automated Transaction Numbers**: Transaction numbers must follow the structure `TXN-YYYYMMDD-XXXX`, where `YYYYMMDD` represents the current date (Asia/Manila time zone) and `XXXX` is a daily-resetting, zero-padded sequential counter.
- **FR-3.4: Automated Inventory Deduction**: When a transaction is submitted, a database trigger (`trg_deduct_inventory`) must automatically subtract the sold quantities from the corresponding products' `stock_quantity` field.
- **FR-3.5: Stock Depletion Protection**: The system must prevent checkouts that exceed the available physical stock of any product.
- **FR-3.6: Transaction Ledger**: All roles can view a historical log of transactions, with full search capabilities (by customer name, transaction number) and date filters.

---

### FR-4: Sales Returns & Refund Processing
- **FR-4.1: Transaction-Linked Returns**: Returns must be linked to a valid, existing transaction ID. The system must fetch original purchased items to prevent returning unpurchased materials.
- **FR-4.2: Quantity Validation**: Returning quantities cannot exceed the original quantity purchased in the transaction (accounting for any previously processed returns).
- **FR-4.3: Automated Return Numbers**: Every return ledger entry must receive an auto-generated return number in the format `RTN-YYYYMMDD-XXXX` (Asia/Manila time zone).
- **FR-4.4: Automated Inventory Restoration**: Upon saving a return, a database trigger (`trg_restore_inventory`) must automatically add the returned quantities back into the product's `stock_quantity` in the database.
- **FR-4.5: Refund Calculation**: The system must calculate the refund value for each returned item (`quantity * purchase_unit_price`) and record the total refund amount.
- **FR-4.6: Parent Transaction Status Sync**: Processing a return must update the parent transaction's status:
  - If some items are returned, status changes to `partially_returned`.
  - If all items in the transaction are returned, status changes to `fully_returned`.

---

### FR-5: AI-Powered Inventory & Sales Assistant
- **FR-5.1: Real-Time Streaming Chat**: The **AI Assistant Page** must provide an interactive, conversational chatbot interface. Responses must stream back word-by-word in real-time.
- **FR-5.2: SSE Integration**: The frontend must consume a Server-Sent Events (SSE) stream from the `inventory-assistant` Supabase Edge Function.
- **FR-5.3: Context-Aware Responses**: The AI assistant must have secure access to the current database state (e.g., product lists, category details, low stock counts, transaction history, return records) to answer analytical and operational questions, such as:
  - *"Which pipes are running low on stock?"*
  - *"How much did we sell yesterday?"*
  - *"Summarize our returns this month."*
- **FR-5.4: Persistent Chat History**: Chat sessions must be saved to the `ai_chats` table per user. Users can view past chat titles, reload a previous conversation with its full history, or delete a chat session.

---

### FR-6: Historical Reports Generation
- **FR-6.1: Reports Dashboard**: Owners and Admins can access the **Historical Reports Page** to view previously compiled reports or generate new ones.
- **FR-6.2: Generation Periods**: Reports can be generated for four specific durations: `daily`, `weekly`, `monthly`, and `yearly`.
- **FR-6.3: Multi-Dimensional Metrics**: Each generated report must aggregate:
  - **Total Revenue & Transactions**: Net sales and transaction count for the period.
  - **Inventory Movements**: Log of stock changes (additions, sales deductions, return restorations).
  - **User Activities**: Operations performed by staff and administrators.
  - **Audit Summaries**: Highlighted events (deactivations, critical edits).
- **FR-6.4: Background Processing**: Report compilation must run asynchronously via the `generate-historical-report` Supabase Edge Function to prevent browser timeouts on large datasets.
- **FR-6.5: Interactive Report Views**: Once compiled, the report must render interactive charts showing sales trends over time, category distributions, and tabular lists of stock fluctuations.

---

### FR-7: System Auditing & Security Logs
- **FR-7.1: Automated Audit Logging**: Any critical modification to the database (e.g., user registration, account deactivation, product price changes, transaction creations, returns) must be logged in the `audit_logs` table.
- **FR-7.2: Structured Log Fields**: Each log entry must capture:
  - The ID of the actor performing the change (`user_id`).
  - The type of action (e.g., `LOGIN`, `UPDATE_PRODUCT`, `DEACTIVATE_USER`).
  - The target table name (e.g., `products`, `profiles`).
  - The target record ID.
  - A structured JSONB field (`details`) containing before-and-after states or metadata.
- **FR-7.3: Privileged Audit Viewer**: The **Audit Logs Page** must be accessible ONLY to Owners and Admins. It must display logs in a clean, chronologically sorted, searchable table.

---

## Non-Functional Requirements (NFR)

### NFR-1: Performance & Latency
- **NFR-1.1: Real-Time Synchronization**: All database changes (e.g., a stock adjustment or POS checkout) must replicate to other active client screens within **2.0 seconds** using Supabase Realtime.
- **NFR-1.2: Page Load Speed**: The application landing page/dashboard must load and become interactive in less than **2.0 seconds** on a standard 3G/4G/Broadband connection (under normal server load).
- **NFR-1.3: Caching & Query Optimization**: React-Query must be configured with a `staleTime` of **60 seconds** for standard inventory and transaction lists, minimizing redundant API requests to Supabase.
- **NFR-1.4: AI Assistant Streaming Latency**: The AI Assistant must begin streaming characters back to the user within **1.5 seconds** of the user submitting their message.

---

### NFR-2: Security, Privacy & Data Protection
- **NFR-2.1: Data in Transit**: All communications between the client application, Supabase database, and Supabase Edge Functions must be encrypted using **TLS 1.3/HTTPS**.
- **NFR-2.2: Row Level Security (RLS)**:
  - Every table in the Supabase database must have RLS enabled.
  - Policies must ensure that users can only view or modify data matching their role's permissions.
  - Staff profiles are blocked from writing to `products`, `categories`, `audit_logs`, and `historical_reports`.
- **NFR-2.3: Privilege Escalation Prevention**:
  - The database must run a security trigger (`prevent_privilege_escalation`) on `profiles` updates.
  - Any attempts by a user to elevate their own role or toggle their own `is_active` state without Owner/Admin rights must result in a transaction rollback and a database exception.
- **NFR-2.4: Secure JWT Storage**: Authentication tokens must be managed securely by Supabase Client Library, ensuring protection against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).

---

### NFR-3: Reliability, Availability & Fault Tolerance
- **NFR-3.1: Service Availability**: The database and API endpoints (managed via Supabase/PostgreSQL) should target a **99.9% uptime** monthly SLA.
- **NFR-3.2: Database Constraints**: Referential integrity must be strictly enforced:
  - Deleting a profile or chat session must cascade delete corresponding details.
  - Products and transactions must use `RESTRICT` delete behaviors to prevent orphaned transaction items or returns.
- **NFR-3.3: Graceful Error Handling**: The frontend must catch network or database errors (e.g., database connection timeouts, failed API requests) and display user-friendly toast alerts rather than crashing the application.
- **NFR-3.4: Atomic Transactions**: All database operations involving multiple steps (e.g., writing a transaction ledger and writing its multiple items) must be executed in a single atomic transaction. If one item fails, the entire transaction is rolled back.

---

### NFR-4: Usability & User Experience (UX)
- **NFR-4.1: Responsive Design**: The interface must adapt cleanly to all screen form factors:
  - **Desktop & Laptops**: Multi-column grids, fixed sidebar, and comprehensive charts.
  - **Tablets & Mobile**: Collapsed navigation drawer (hamburger menu), stacked lists, and simplified card layouts.
- **NFR-4.2: Visual Indicators**: High-priority information (low stock warnings, critical audit logs, deactivation status) must use color-coded badges (e.g., red for danger/low stock, green for active/completed, amber for warnings).
- **NFR-4.3: High-Fidelity Aesthetic**: The UI must maintain a clean, high-fidelity dark-mode-leaning or clean-light-mode palette using Tailwind CSS, featuring modern typography (Inter/Geist-style sans-serif), smooth hover animations, and organized card borders.
- **NFR-4.4: Input Validation**: All forms must validate input at the boundary:
  - Numbers must be positive (e.g., negative prices, negative stock quantities, or negative checkout amounts must be blocked at the form level).
  - Emails must adhere to standard formatting.
  - Missing required fields must highlight in red with assistive labels.

---

### NFR-5: Maintainability, Portability & Scalability
- **NFR-5.1: Modular React Architecture**: The frontend code must separate views (under `/pages`), business logic & data-fetching (under `/hooks`), global contexts (under `/contexts`), and UI shells (under `/components`).
- **NFR-5.2: Versioned Database Schema**: All database tables, RLS policies, triggers, and functions must be versioned chronologically using Supabase/PostgreSQL migration files (under `supabase/migrations`) to support seamless environment setups.
- **NFR-5.3: Full Type Safety**: The codebase must compile without errors under strict TypeScript configurations, ensuring robust interface mapping between the client and the Supabase database schema.
- **NFR-5.4: Cloud-Native Serverless Backend**: Complex, heavy backend processes (creating users, streaming AI, and aggregating reports) must be isolated into independent serverless Supabase Edge Functions, facilitating horizontal scaling.
