# MiniConstruct — Security & RBAC Full Implementation Plan

## Context
The system needs a complete security overhaul to meet academic rubric requirements:
1. Secure Authentication (no public signup, owner-managed accounts)
2. Input Validation & Protection (Zod schemas, SQL injection prevention docs)
3. Role-Based Access Control — `owner` vs `staff`
4. Overall integration of security throughout

---

## Current Security Gaps

| Gap | Current State | Required State |
|-----|--------------|----------------|
| Public signup | Login page has "Create Account" tab, anyone can register | Disabled; owner creates staff via User Management |
| Role enforcement | All authenticated users = same access | `owner` full access, `staff` restricted |
| Profile role column | TEXT, defaults to `admin` | Constrained to `owner`/`staff`, defaults to `staff` |
| User management page | Does not exist | Owner-only page to create/deactivate/manage staff |
| Input validation | Basic Zod, no maxLength, no sanitization | Full Zod with trimming, maxLength, type constraints |
| Transaction saving | RPC may fail silently | Hardened with better error handling |
| Categories visible | Filter renders but categories may not load | Fix + ensure RLS allows reads |
| Profile RLS | Staff can escalate their own role | Trigger blocks non-owner role changes |

---

## Part A — RBAC Implementation

### 1. Database Migration (single script)

```sql
-- A. Add email + is_active to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- B. Rename existing 'admin' roles → 'owner' (keeps existing accounts as owners)
UPDATE profiles SET role = 'owner' WHERE role = 'admin';

-- C. Add role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'staff'));

-- D. Update handle_new_user → new signups default to 'staff', capture email
-- (existing records are now 'owner', new admin-created accounts become 'staff')

-- E. RBAC helper functions (SECURITY DEFINER, stable)
--    get_my_role() → TEXT
--    is_owner()    → BOOLEAN

-- F. Drop all existing profile policies, recreate with proper RBAC:
--    SELECT: all authenticated
--    INSERT: none (trigger only)
--    UPDATE: own full_name/email OR owner can update anyone
--    DELETE: none

-- G. Role-change prevention trigger
--    BEFORE UPDATE: if caller is not owner AND NEW.role <> OLD.role → RAISE EXCEPTION
--    BEFORE UPDATE: if caller is not owner AND trying to change someone else's is_active → RAISE EXCEPTION
```

### 2. Edge Function: `admin-create-user`
- Caller must be authenticated + have `owner` role (verified server-side)
- Uses `SUPABASE_SERVICE_ROLE_KEY` (available as built-in env in Edge Functions)
- Calls `adminClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`
- The existing `handle_new_user` trigger automatically creates the profile with role = 'staff'
- Returns created user or error

### 3. Disable Public Signup
- `supabase_configure_auth({ disable_signup: true })`
- Remove "Create Account" tab from LoginPage — login page becomes sign-in only

### 4. Frontend RBAC

**`src/hooks/useRBAC.ts`** (new)
```typescript
export function useRBAC() {
  const { profile } = useAuth()
  return {
    isOwner: profile?.role === 'owner',
    isStaff: profile?.role === 'staff',
    role: profile?.role ?? null,
    isActive: profile?.is_active ?? true,
    canManageUsers: profile?.role === 'owner',
    canManageInventory: true,     // both roles
    canRecordTransactions: true,  // both roles
    canProcessReturns: true,      // both roles
    canViewAuditLogs: profile?.role === 'owner',
    canViewForecast: true,        // both roles
  }
}
```

**`src/hooks/useUsers.ts`** (new)
- `useStaffList()` — fetches all profiles (owner only)
- `useCreateStaff()` — calls `admin-create-user` Edge Function
- `useToggleUserActive(userId, isActive)` — updates `is_active` via Supabase
- `useUpdateUserRole(userId, role)` — updates `role` via Supabase

**`src/pages/UserManagementPage.tsx`** (new)
- Owner-only page (redirects staff to /dashboard with toast error)
- Table listing: name, email, role badge, active status, actions
- Create Staff modal: fullName, email, password (auto-generated or manual), confirm
- Deactivate/reactivate toggle button
- Role change dropdown (owner → staff, staff → owner)

**`src/components/layout/Sidebar.tsx`** (modified)
- Show "User Management" nav item only when `isOwner === true`
- Show `role` badge next to user name in sidebar footer

**`src/App.tsx`** (modified)
- Add `/users` route → `UserManagementPage`
- Add `OwnerOnlyRoute` component (redirects staff to /dashboard)
- Inject deactivated account check: on `SIGNED_IN` event, if `profile.is_active === false` → signOut + toast("Account deactivated")

**`src/pages/LoginPage.tsx`** (modified)
- Remove `Tabs` component entirely — only a single Sign In card
- Remove `signupSchema`, `onSignup`, `showConfirmPassword` etc.
- Keep only the login form with Forgot Password link

**`src/types/index.ts`** (modified)
- `Profile.email: string` — add
- `Profile.is_active: boolean` — add

---

## Part B — Input Validation & Protection

### `src/lib/validation.ts` (new file — shared schemas)
Documents SQL injection prevention with 3 examples as required.

**3 SQL Injection Examples + Prevention:**

```typescript
/**
 * SQL INJECTION PREVENTION — 3 EXAMPLES
 *
 * 1. CLASSIC LOGIN BYPASS: admin'-- or ' OR '1'='1
 *    Attack: Injects SQL into email field to bypass auth check
 *    Prevention: Supabase uses parameterized queries (PostgREST pg driver)
 *               + Zod email() rejects non-email format entirely
 *
 * 2. PRODUCT NAME POISONING: Portland'; DELETE FROM products; --
 *    Attack: Terminates insert query and injects destructive SQL
 *    Prevention: Supabase parameterized inserts + Zod max(200) + /^[^;'"<>]*$/ regex
 *
 * 3. UNION-BASED DATA EXTRACTION: ' UNION SELECT email,password FROM auth.users--
 *    Attack: Injects UNION to exfiltrate auth table data via search
 *    Prevention: Supabase's .ilike() uses $1 bind params, not string concat
 *               + Zod max(200) limits field length to block long payloads
 */
```

**Shared Zod schemas:**
- `emailSchema` — `.email().max(100).trim().toLowerCase()`
- `nameSchema` — `.min(2).max(200).trim().regex(/^[^<>'"]*$/, 'Invalid characters')`
- `strongPasswordSchema` — existing rules (8+ chars, uppercase, lowercase, number, special)
- `safeTextSchema` — `.max(1000).trim()` for descriptions/reasons
- `positiveIntSchema` — `.int().min(0).max(999999)`
- `positivePriceSchema` — `.number().min(0).max(9999999)`

**Updated page schemas:**
- `InventoryPage` — name uses `nameSchema`, description uses `safeTextSchema`, price/qty use safe numeric schemas
- `TransactionsPage` — customerName uses `nameSchema`
- `ReturnsPage` — reason uses `safeTextSchema`
- `ForgotPasswordPage` — email uses `emailSchema`
- `ResetPasswordPage` — password uses `strongPasswordSchema`
- `UserManagementPage` — fullName/email use name/email schemas

### Fix Transaction Saving
The `generate_transaction_number` RPC is recreated in the migration with explicit `GRANT EXECUTE TO authenticated`. Also wraps the entire transaction creation in a proper try/catch that exposes the actual error message from Supabase.

### Fix Inventory Category Filter Visibility
The `SelectTrigger` currently has the `Filter` icon inside it (which can clash with SelectValue). Fix: Move Filter icon outside, use it as a label prefix or a standalone icon. Also add a `"No Category"` option to the filter.

---

## Files To Create
| File | Purpose |
|------|---------|
| `src/hooks/useRBAC.ts` | Role/permission check utilities |
| `src/hooks/useUsers.ts` | Owner-only user management |
| `src/pages/UserManagementPage.tsx` | Owner-only user management UI |
| `src/lib/validation.ts` | Shared Zod schemas + SQL injection docs |
| `supabase/functions/admin-create-user/index.ts` | Edge Function for creating staff accounts |

## Files To Modify
| File | Changes |
|------|---------|
| `src/types/index.ts` | Add email, is_active to Profile |
| `src/hooks/useAuth.ts` | Add deactivated account check |
| `src/pages/LoginPage.tsx` | Remove Create Account tab, login only |
| `src/App.tsx` | Add /users route with OwnerOnlyRoute |
| `src/components/layout/Sidebar.tsx` | Conditional User Management link, role badge |
| `src/pages/InventoryPage.tsx` | Enhanced Zod, fix category filter display |
| `src/pages/TransactionsPage.tsx` | Enhanced Zod, better error messages |
| `src/pages/ReturnsPage.tsx` | Enhanced Zod validation |
| `src/pages/ForgotPasswordPage.tsx` | Use shared emailSchema |
| `src/pages/ResetPasswordPage.tsx` | Use shared passwordSchema |

## Verification Steps
1. Log in as owner → see "User Management" in sidebar
2. Create a staff user → role = staff, is_active = true
3. Log in as staff → no "User Management" in sidebar, cannot access /users
4. Owner deactivates staff → staff gets "Account deactivated" error on next login attempt
5. Try to submit product form with `'; DROP TABLE products; --` → Zod rejects it
6. Transaction saves successfully after migration fix
7. Category dropdown shows all 8 categories in inventory filter
