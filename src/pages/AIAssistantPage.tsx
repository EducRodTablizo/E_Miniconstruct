import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Loader2, User, Sparkles, MessageSquare, Trash2, Plus, Menu, X } from 'lucide-react'
import { useInventoryAssistant } from '@/hooks/useInventoryAssistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatDateShort } from '@/lib/utils'

const SUGGESTED_QUERIES = [
  'Show me all low-stock items',
  "What is today's sales summary?",
  'Which products need urgent reordering?',
  'What is the total inventory value?',
  'List all out-of-stock products',
  'Give me a quick overview of this month',
]

export default function AIAssistantPage() {
  const {
    chats,
    currentChatId,
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
    deleteChat,
    loadChat,
  } = useInventoryAssistant()

  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true) // Desktop default open
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text: string = input.trim()) => {
    if (!text || isLoading) return
    setInput('')
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setHistoryOpen(!historyOpen)}
            title="Toggle Chat History"
            className={cn(
              "transition-colors shrink-0",
              historyOpen && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:text-primary"
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Inventory Assistant</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ask natural-language questions about inventory, sales, and stock levels
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={resetChat}>
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex overflow-hidden relative">
        {/* Chat History Sidebar */}
        <div
          className={cn(
            'absolute md:relative inset-y-0 left-0 z-30 w-64 bg-muted/30 border-r border-border flex flex-col transition-transform duration-300 shrink-0',
            historyOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 overflow-hidden'
          )}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Chat History
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setHistoryOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chats.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No past chats yet
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat.id}
                  className={cn(
                    'group flex items-start gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer text-left',
                    chat.id === currentChatId
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => {
                    loadChat(chat.id)
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) {
                      setHistoryOpen(false)
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-foreground font-medium group-hover:text-foreground">
                      {chat.title}
                    </p>
                    {chat.created_at && (
                      <p className="text-xs text-muted-foreground/75 mt-0.5 font-normal">
                        {formatDateShort(chat.created_at)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity shrink-0 mt-0.5"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-background">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              /* Welcome / Suggested Queries */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className="p-4 rounded-2xl bg-primary/10">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">MiniConstruct AI Assistant</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md">
                    I have access to your real-time inventory and sales data. Ask me anything about stock levels, sales trends, or recommendations.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_QUERIES.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left px-4 py-2.5 text-sm bg-muted hover:bg-accent rounded-lg border border-border transition-colors text-foreground"
                    >
                      <Sparkles className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div className="divide-y divide-border">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex gap-3 px-4 py-4',
                      msg.role === 'user' ? 'bg-muted/30' : 'bg-background'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {msg.isStreaming && !msg.content ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Analyzing inventory data...</span>
                        </div>
                      ) : (
                        <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-foreground animate-pulse ml-0.5 align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-t border-destructive/20 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => {}} className="text-xs underline ml-2">Dismiss</button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 border-t border-border">
            <form
              onSubmit={e => { e.preventDefault(); handleSend() }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about inventory, sales, stock levels..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
