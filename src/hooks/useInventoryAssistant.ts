import { useState, useRef, useCallback, useEffect } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { supabase } from '@/integrations/supabase/client'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export interface AIChatSession {
  id: string
  title: string
  messages: AIMessage[]
  created_at: string
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
  const [chats, setChats] = useState<AIChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const currentChatIdRef = useRef<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef(crypto.randomUUID())

  // Fetch all chats for the current user
  const fetchChats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setChats(data as AIChatSession[])
    } catch (err) {
      console.error('Error fetching chats:', err)
    }
  }, [])

  // Load chats on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChats()
  }, [fetchChats])

  // Delete a chat session
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chats')
        .delete()
        .eq('id', chatId)

      if (error) throw error

      setChats(prev => prev.filter(c => c.id !== chatId))
      if (currentChatIdRef.current === chatId) {
        setCurrentChatId(null)
        currentChatIdRef.current = null
        setMessages([])
      }
    } catch (err) {
      console.error('Error deleting chat:', err)
    }
  }, [])

  // Load a specific chat session
  const loadChat = useCallback(async (chatId: string) => {
    try {
      abortRef.current?.abort()
      setIsLoading(false)
      setError(null)

      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('id', chatId)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setCurrentChatId(data.id)
        currentChatIdRef.current = data.id
        setMessages(data.messages as AIMessage[])
        sessionIdRef.current = crypto.randomUUID()
      }
    } catch (err) {
      console.error('Error loading chat:', err)
    }
  }, [])

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

    const supabaseUrl = (supabase as { supabaseUrl: string }).supabaseUrl || ''
    const supabaseKey = (supabase as { supabaseKey: string }).supabaseKey || ''

    // Helper to save/update chat in DB
    const saveChatToDB = async (msgs: AIMessage[]) => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const activeId = currentChatIdRef.current

        if (activeId) {
          // Update existing chat
          await supabase
            .from('ai_chats')
            .update({
              messages: msgs,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeId)
          
          setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: msgs } : c))
        } else {
          // Create new chat
          const title = content.length > 40 ? content.slice(0, 40) + '...' : content
          const { data, error } = await supabase
            .from('ai_chats')
            .insert({
              user_id: user.id,
              title,
              messages: msgs,
            })
            .select()
            .single()

          if (error) throw error
          if (data) {
            setCurrentChatId(data.id)
            currentChatIdRef.current = data.id
            setChats(prev => [data as AIChatSession, ...prev])
          }
        }
      } catch (err) {
        console.error('Error saving chat to DB:', err)
      }
    }

    try {
      let accumulatedContent = ''
      let hasFinished = false

      await fetchEventSource(`${supabaseUrl}/functions/v1/inventory-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
          'X-Session-ID': sessionIdRef.current,
        },
        body: JSON.stringify({ message: content }),
        signal: abortRef.current.signal,

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

        onmessage(event) {
          if (!event.data) return
          if (event.data === '[DONE]') {
            if (hasFinished) return
            hasFinished = true
            setMessages(prev => {
              const last = prev[prev.length - 1]
              if (last?.role === 'assistant') {
                const updated = prev.slice(0, -1)
                const finalMsgs = [...updated, { ...last, content: accumulatedContent, isStreaming: false }]
                saveChatToDB(finalMsgs)
                return finalMsgs
              }
              return prev
            })
            setIsLoading(false)
            return
          }

          try {
            const data = JSON.parse(event.data)

            if (data.error) {
              setError(getErrMsg(data.error?.type || 'api_error', data.error?.message || ''))
              setMessages(prev => prev.slice(0, -1))
              setIsLoading(false)
              return
            }

            const choice = data.choices?.[0]
            if (!choice) return

            if (choice.delta?.content) {
              accumulatedContent += choice.delta.content
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  const updated = prev.slice(0, -1)
                  return [...updated, { ...last, content: accumulatedContent }]
                }
                return prev
              })
            }

            if (choice.finish_reason) {
              if (hasFinished) return
              hasFinished = true
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant') {
                  const updated = prev.slice(0, -1)
                  const finalMsgs = [...updated, { ...last, content: accumulatedContent, isStreaming: false }]
                  saveChatToDB(finalMsgs)
                  return finalMsgs
                }
                return prev
              })
              setIsLoading(false)
            }
          } catch {
            // Ignore non-JSON lines
          }
        },

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
    setCurrentChatId(null)
    currentChatIdRef.current = null
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    chats,
    currentChatId,
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
    deleteChat,
    loadChat,
  }
}
