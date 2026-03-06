"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react"

const EXAMPLE_QUESTIONS = [
  "Quais foram as paradas mais comuns esse mês?",
  "Mostre os dados da obra 210224",
  "Qual a taxa de aprovação do modelo M76?",
  "Compare o desempenho dos modelos M76 e M77",
  "Quais obras tiveram parada por retrabalho?",
  "Quantos testes o colaborador 10284005 realizou?",
]

export function AgentChat() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Debug
  console.log("[v0] Chat status:", status)
  console.log("[v0] Messages:", messages)
  console.log("[v0] Error:", error)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleExampleClick = (question: string) => {
    if (isLoading) return
    sendMessage({ text: question })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Assistente de Testes
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Pergunte qualquer coisa sobre as obras, testes e paradas
                  </p>
                </div>
              </div>
              
              <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(question)}
                    className="rounded-lg border border-border bg-card p-4 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="flex flex-col gap-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <Card
                      className={`max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="whitespace-pre-wrap text-sm">
                          {message.parts && message.parts.length > 0 ? (
                            message.parts.map((part, index) => {
                              if (part.type === "text") {
                                return <span key={index}>{part.text}</span>
                              }
                              if (part.type === "tool-invocation") {
                                if (part.state === "output-available") {
                                  return null // Não mostra o output raw da tool
                                }
                                return (
                                  <div
                                    key={index}
                                    className="my-2 flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                                  >
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Buscando dados...
                                  </div>
                                )
                              }
                              return null
                            })
                          ) : (
                            // Fallback para content legado se parts não existir
                            <span>{(message as unknown as { content?: string }).content || ""}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <Card className="bg-card">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Pensando...
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                {error && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <Bot className="h-4 w-4 text-destructive" />
                    </div>
                    <Card className="border-destructive/50 bg-destructive/10">
                      <CardContent className="p-3">
                        <div className="text-sm text-destructive">
                          Erro: {error.message || "Falha ao obter resposta. Tente novamente."}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre uma obra, modelo, colaborador..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
