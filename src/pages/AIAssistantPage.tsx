import { useState, useRef, useEffect } from 'react'
import { Send, RotateCcw, Bot, Loader2, User, Sparkles } from 'lucide-react'
import { useInventoryAssistant } from '@/hooks/useInventoryAssistant'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const SUGGESTED_QUERIES = [
  'Show me all low-stock items',
  "What is today's sales summary?",
  'Which products need urgent reordering?',
  'What is the total inventory value?',
  'List all out-of-stock products',
  'Give me a quick overview of this month',
]

export default function AIAssistantPage() {
  const { messages, isLoading, error, sendMessage, resetChat } = useInventoryAssistant()
  const [input, setInput] = useState('')
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Inventory Assistant</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ask natural-language questions about inventory, sales, and stock levels
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={resetChat}>
            <RotateCcw className="h-4 w-4" />
            New Chat
          </Button>
        )}
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
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
