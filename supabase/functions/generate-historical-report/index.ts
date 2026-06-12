
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify privileged role
    const { data: profile } = await callerClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !['owner', 'admin'].includes(profile.role) || !profile.is_active) {
      return new Response(JSON.stringify({ error: 'Forbidden: only owners and admins can generate reports' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { report_type, period_start, period_end, period_label } = await req.json()

    if (!report_type || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: 'Missing required fields: report_type, period_start, period_end' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const startISO = new Date(period_start).toISOString()
    const endISO = new Date(period_end).toISOString()

    // Query all data for the period in parallel
    const [
      { data: transactions },
      { data: auditLogs },
    ] = await Promise.all([
      callerClient
        .from('transactions')
        .select('id, transaction_number, customer_name, total_amount, status, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      callerClient
        .from('audit_logs')
        .select('id, action, table_name, record_id, details, created_at, profiles(full_name)')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false }),
    ])

    const totalSales = (transactions ?? []).reduce((sum, t) => sum + t.total_amount, 0)
    const totalTransactions = (transactions ?? []).length

    const userActivityActions = ['LOGIN', 'LOGOUT', 'CREATE_STAFF_USER', 'ACTIVATE_USER', 'DEACTIVATE_USER', 'UPDATE_USER_ROLE']
    const inventoryActions = ['CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'STOCK_ADJUSTMENT']

    const userActivities = (auditLogs ?? [])
      .filter(l => userActivityActions.includes(l.action))
      .map(l => ({
        action: l.action,
        user: (l.profiles as { full_name: string } | null)?.full_name ?? 'System',
        at: l.created_at,
      }))

    const inventoryChanges = (auditLogs ?? [])
      .filter(l => inventoryActions.includes(l.action))
      .map(l => ({
        action: l.action,
        details: l.details,
        at: l.created_at,
      }))

    const auditSummary = (auditLogs ?? []).slice(0, 100).map(l => ({
      action: l.action,
      user: (l.profiles as { full_name: string } | null)?.full_name ?? 'System',
      table: l.table_name,
      at: l.created_at,
    }))

    // Save the historical report
    const { data: report, error: insertError } = await callerClient
      .from('historical_reports')
      .insert({
        report_type,
        period_label: period_label || `${startISO} → ${endISO}`,
        period_start: startISO,
        period_end: endISO,
        total_sales: totalSales,
        total_transactions: totalTransactions,
        inventory_changes: inventoryChanges,
        user_activities: userActivities,
        audit_summary: auditSummary,
        generated_by: user.id,
      })
      .select('*, profiles(full_name)')
      .single()

    if (insertError) throw insertError

    // Log the report generation
    callerClient.rpc('log_audit_event', {
      p_user_id: user.id,
      p_action: 'GENERATE_REPORT',
      p_table_name: 'historical_reports',
      p_record_id: report.id,
      p_details: { report_type, period_label: report.period_label, total_sales: totalSales, total_transactions: totalTransactions },
    }).catch(console.error)

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('generate-historical-report error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
