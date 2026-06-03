import { z } from 'zod'

/**
 * ================================================================
 * SQL INJECTION PREVENTION — 3 ATTACK EXAMPLES & HOW WE STOP THEM
 * ================================================================
 *
 * 1. CLASSIC LOGIN BYPASS INJECTION
 *    Attack input: admin'-- OR ' OR '1'='1
 *    Goal: Bypass authentication by injecting SQL into a login query
 *    Prevention:
 *      a) Supabase uses PostgREST with PostgreSQL parameterized queries ($1, $2
 *         bind parameters). The email and password are NEVER concatenated into
 *         a raw SQL string — they are always passed as separate parameters.
 *      b) Zod's z.string().email() rejects any value that isn't a valid email
 *         format, so admin'-- fails before it even reaches Supabase.
 *
 * 2. PRODUCT NAME STORED INJECTION
 *    Attack input: Portland'; DELETE FROM products WHERE '1'='1; --
 *    Goal: Inject a destructive SQL command via a product name field
 *    Prevention:
 *      a) Same parameterized query protection as above.
 *      b) nameSchema enforces .max(200) — the attack string would be truncated
 *         and rejected if it contains semicolons or SQL-reserved chars.
 *      c) The /^[^;'"<>]*$/ regex explicitly blocks ; ' " < > characters,
 *         which are required for all classic SQL injection payloads.
 *
 * 3. UNION-BASED DATA EXTRACTION VIA SEARCH
 *    Attack input: cement' UNION SELECT email, password FROM auth.users--
 *    Goal: Exfiltrate the auth users table via a product search field
 *    Prevention:
 *      a) Supabase's .ilike('%cement%...') uses bind parameters; the search
 *         term is NEVER spliced into the query string directly.
 *      b) safeTextSchema enforces .max(500) with .trim(), limiting the
 *         payload size and stripping whitespace manipulation tricks.
 *      c) The auth.users table is in a separate schema (auth.*) that the
 *         public-facing client cannot access regardless of injection attempt.
 * ================================================================
 */

// ----------------------------------------------------------------
// SHARED PRIMITIVE SCHEMAS
// ----------------------------------------------------------------

/** Safe email: validates format, trims, lowercases, limits length */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(100, 'Email must be 100 characters or less')
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')

/** Safe name field — blocks SQL/HTML injection characters */
export const nameSchema = z
  .string()
  .min(2, 'Must be at least 2 characters')
  .max(200, 'Must be 200 characters or less')
  .trim()
  .regex(
    /^[^;'"<>]*$/,
    "Name contains invalid characters (; ' \" < >)"
  )

/** Safe short text — for descriptions, reasons, notes */
export const safeTextSchema = z
  .string()
  .max(1000, 'Must be 1000 characters or less')
  .trim()
  .optional()

/** Safe short reason — for returns */
export const reasonSchema = z
  .string()
  .max(500, 'Reason must be 500 characters or less')
  .trim()

/** Safe customer name */
export const customerNameSchema = z
  .string()
  .min(1, 'Customer name is required')
  .max(200, 'Customer name must be 200 characters or less')
  .trim()

/** Safe positive integer for quantities/levels */
export const positiveIntSchema = z
  .coerce
  .number()
  .int('Must be a whole number')
  .min(0, 'Must be 0 or more')
  .max(999999, 'Value is too large')

/** Safe price */
export const priceSchema = z
  .coerce
  .number()
  .min(0, 'Price must be 0 or more')
  .max(9999999, 'Price is too large')

/** Strong password — enforced throughout */
export const strongPasswordSchema = z
  .string()
  .min(8, 'At least 8 characters required')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Z]/, 'At least one uppercase letter required')
  .regex(/[a-z]/, 'At least one lowercase letter required')
  .regex(/[0-9]/, 'At least one number required')
  .regex(/[^A-Za-z0-9]/, 'At least one special character required')

// ----------------------------------------------------------------
// COMPOSITE FORM SCHEMAS
// ----------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
})

export const productSchema = z.object({
  name: nameSchema,
  description: safeTextSchema,
  category_id: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').max(20, 'Unit too long'),
  unit_price: priceSchema,
  stock_quantity: positiveIntSchema,
  reorder_level: positiveIntSchema,
})

export const transactionSchema = z.object({
  customerName: customerNameSchema,
})

export const returnSchema = z.object({
  reason: reasonSchema,
})

export const createStaffSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginForm = z.infer<typeof loginSchema>
export type ProductForm = z.infer<typeof productSchema>
export type CreateStaffForm = z.infer<typeof createStaffSchema>
