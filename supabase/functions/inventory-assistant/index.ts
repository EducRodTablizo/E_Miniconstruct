
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const AI_API_TOKEN = Deno.env.get('AI_API_TOKEN_ffa1564f7514')
    if (!AI_API_TOKEN) throw new Error('AI API token not configured')

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { message } = await req.json()
    const sessionId = req.headers.get('X-Session-ID') || crypto.randomUUID()

    // Fetch real-time inventory context
    const [{ data: products }, { data: transactions }] = await Promise.all([
      supabase
        .from('products')
        .select('name, unit, unit_price, stock_quantity, reorder_level, categories(name)')
        .order('name'),
      supabase
        .from('transactions')
        .select('transaction_number, customer_name, total_amount, transaction_date, status')
        .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('transaction_date', { ascending: false })
        .limit(50),
    ])

    const lowStock = (products ?? []).filter(p => p.stock_quantity <= p.reorder_level)
    const outOfStock = (products ?? []).filter(p => p.stock_quantity === 0)
    const totalInventoryValue = (products ?? []).reduce((sum, p) => sum + (p.unit_price * p.stock_quantity), 0)
    const recentSalesTotal = (transactions ?? []).reduce((sum, t) => sum + t.total_amount, 0)

    const inventoryContext = `
=== MINICONSTRUCT INVENTORY DATA (as of ${new Date().toLocaleDateString('en-PH')}) ===

SUMMARY:
- Total Products: ${(products ?? []).length}
- Total Inventory Value: PHP ${totalInventoryValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Low Stock Items: ${lowStock.length}
- Out of Stock Items: ${outOfStock.length}
- Recent Transactions (30 days): ${(transactions ?? []).length}
- Recent Sales Total: PHP ${recentSalesTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}

PRODUCTS (all):
${(products ?? []).map(p => {
  const cat = (p.categories as { name: string } | null)?.name ?? 'Uncategorized'
  const status = p.stock_quantity === 0 ? '[OUT OF STOCK]' : p.stock_quantity <= p.reorder_level ? '[LOW STOCK]' : ''
  return `- ${p.name} (${cat}): ${p.stock_quantity} ${p.unit} in stock @ PHP ${p.unit_price}/${p.unit}, reorder at ${p.reorder_level} ${status}`
}).join('\n')}

LOW STOCK / OUT OF STOCK ITEMS:
${lowStock.length === 0 ? '- All items are well stocked.' : lowStock.map(p => `- ${p.name}: ${p.stock_quantity}/${p.reorder_level} ${p.unit}`).join('\n')}

RECENT TRANSACTIONS (last 30 days, showing latest 15):
${(transactions ?? []).slice(0, 15).map(t => `- ${t.transaction_number}: ${t.customer_name} — PHP ${t.total_amount} (${new Date(t.transaction_date).toLocaleDateString('en-PH')}) [${t.status}]`).join('\n')}
`

    // Call Enter AI API with openai_chat_completions protocol
    const response = await fetch('https://api.enter.pro/code/api/v1/ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-pro',
        messages: [
          {
            role: 'system',
            content: `You are an AI-powered inventory assistant for MiniConstruct, a construction materials inventory management system in the Philippines. Your role is to help staff and administrators quickly understand inventory levels, sales performance, stock recommendations, and business insights.

GUIDELINES:
- Be concise, clear, and actionable in responses
- Use PHP (Philippine Peso) for all currency values
- Format lists and comparisons as markdown tables when showing multiple items
- Highlight critical issues (out-of-stock, low stock) prominently
- Provide specific product names and quantities, not vague answers
- For summaries, organize information clearly with headers
- Keep responses focused and practical

REAL-TIME INVENTORY DATA:
${inventoryContext}`,
          },
          { role: 'user', content: message },
        ],
        stream: true,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      let errorMessage = 'AI service error'
      const dataMatch = text.match(/data: (.+)/)
      if (dataMatch) {
        try {
          const errorData = JSON.parse(dataMatch[1])
          errorMessage = errorData.error?.message || errorMessage
        } catch { /* use defaults */ }
      }
      const errorSSE = `event: error\ndata: ${JSON.stringify({ error: { message: errorMessage, type: 'api_error' } })}\n\n`
      return new Response(errorSSE, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      })
    }

    // Log AI query to audit (non-blocking)
    supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_action: 'AI_QUERY',
      p_table_name: 'ai_assistant',
      p_record_id: user.id,
      p_details: { query: message.slice(0, 200) },
    }).catch(console.error)

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('inventory-assistant error:', error)
    const errorSSE = `event: error\ndata: ${JSON.stringify({ error: { message: error.message, type: 'api_error' } })}\n\n`
    return new Response(errorSSE, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
    })
  }
})
