import { useState, useRef, useCallback } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
} from '@/integrations/supabase/client'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: 'Authentication failed. Please refresh the page.',
  rate_limit_error: 'Too many requests. Please try again later.',
  invalid_request_error: 'Invalid request. Please try again.',
  overloaded_error: 'Service is busy. Please try again later.',
  insufficient_credits: "This website's AI credits have been exhausted.",
  permission_error: 'AI capability is disabled. Please contact the administrator.',
  api_error: 'Service temporarily unavailable.',
}

function getErrMsg(code: string, backendMsg: string): string {
  if (backendMsg) return backendMsg
  return FALLBACK_MESSAGES[code] || 'Service temporarily unavailable.'
}

export function useInventoryAssistant() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef(crypto.randomUUID())

  const sendMessage = useCallback(async (content: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('Not authenticated. Please log in again.'); return }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    const userMsg: AIMessage = { role: 'user', content }
    const asstMsg: AIMessage = { role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, asstMsg])
    setIsLoading(true)
    setError(null)

    // Access public properties from supabase-js client
    //const supabaseUrl = (supabase as { supabaseUrl: string }).supabaseUrl || ''
    // const supabaseKey = (supabase as { supabaseKey: string }).supabaseKey || ''

    try {
      await fetchEventSource(`${SUPABASE_URL}/functions/v1/inventory-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'X-Session-ID': sessionIdRef.current,
        },
        body: JSON.stringify({ message: content }),
        signal: abortRef.current.signal,

        // LEVEL 0 — Connection error detection
        async onopen(response) {
          const ct = response.headers.get('content-type')
          if (!response.ok) {
            if (ct?.includes('text/event-stream')) {
              const text = await response.text()
              const match = text.match(/data: (.+)/)
              if (match) {
                try {
                  const d = JSON.parse(match[1])
                  const msg = d.error?.message
                  if (msg) throw new Error(msg)
                } catch (e) {
                  if (e instanceof Error && !e.message.includes('Unexpected token')) throw e
                }
              }
            } else if (ct?.includes('application/json')) {
              const d = await response.json()
              throw new Error(d.error?.message || d.error || `Request failed: ${response.status}`)
            }
            throw new Error(`Request failed: ${response.status}`)
          }
        },

        // LEVEL 1 — Stream event handling (openai_chat_completions)
        onmessage(event) {
          if (!event.data) return
          if (event.data === '[DONE]') {
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') last.isStreaming = false
              return updated
            })
            setIsLoading(false)
            return
          }

          try {
            const data = JSON.parse(event.data)

            // Error in stream
            if (data.error) {
              setError(getErrMsg(data.error?.type || 'api_error', data.error?.message || ''))
              setMessages(prev => prev.slice(0, -1))
              setIsLoading(false)
              return
            }

            const choice = data.choices?.[0]
            if (!choice) return

            if (choice.delta?.content) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  last.content = (last.content || '') + choice.delta.content
                }
                return [...updated]
              })
            }

            if (choice.finish_reason) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') last.isStreaming = false
                return [...updated]
              })
              setIsLoading(false)
            }
          } catch {
            // Ignore non-JSON lines
          }
        },

        // LEVEL 2 — Network errors
        onerror(err) { throw err },
      })
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      const msg = err instanceof Error ? err.message : ''
      if (name !== 'AbortError') {
        setError(msg || 'Failed to get a response. Please try again.')
        setMessages(prev => {
          const last = prev[prev.length - 1]
          return last?.role === 'assistant' && last.isStreaming ? prev.slice(0, -1) : prev
        })
      }
      setIsLoading(false)
    }
  }, [])

  const resetChat = useCallback(() => {
    abortRef.current?.abort()
    sessionIdRef.current = crypto.randomUUID()
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  return { messages, isLoading, error, sendMessage, resetChat }
}
