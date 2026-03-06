"use client"

import { useState, useRef, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, Loader2, Sparkles, HelpCircle } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const EXAMPLE_QUERIES = [
  { text: "obra 208233", description: "Buscar dados de uma obra" },
  { text: "modelo M76", description: "Estatisticas do modelo" },
  { text: "hoje", description: "Testes de hoje" },
  { text: "banca 3", description: "Testes da banca" },
  { text: "parada retrabalho", description: "Obras com essa parada" },
  { text: "ajuda", description: "Ver todos os comandos" },
]

// Função para renderizar markdown simples
function renderMarkdown(text: string) {
  const lines = text.split("\n")
  
  return lines.map((line, index) => {
    // Headers
    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      return (
        <div key={index} className="font-semibold text-foreground mt-3 mb-1 first:mt-0">
          {line.replace(/\*\*/g, "")}
        </div>
      )
    }
    
    // Linha com negrito inline
    if (line.includes("**")) {
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      return (
        <div key={index} className="leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
            }
            // Código inline
            if (part.includes("`")) {
              const codeParts = part.split(/(`[^`]+`)/g)
              return codeParts.map((cp, j) => {
                if (cp.startsWith("`") && cp.endsWith("`")) {
                  return (
                    <code key={`${i}-${j}`} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {cp.slice(1, -1)}
                    </code>
                  )
                }
                return <span key={`${i}-${j}`}>{cp}</span>
              })
            }
            return <span key={i}>{part}</span>
          })}
        </div>
      )
    }
    
    // Código inline
    if (line.includes("`")) {
      const parts = line.split(/(`[^`]+`)/g)
      return (
        <div key={index} className="leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith("`") && part.endsWith("`")) {
              return (
                <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  {part.slice(1, -1)}
                </code>
              )
            }
            return <span key={i}>{part}</span>
          })}
        </div>
      )
    }
    
    // Separador
    if (line === "---") {
      return <hr key={index} className="my-3 border-border" />
    }
    
    // Linha vazia
    if (line.trim() === "") {
      return <div key={index} className="h-2" />
    }
    
    // Linha normal
    return (
      <div key={index} className="leading-relaxed">
        {line}
      </div>
    )
  })
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Erro ao processar a solicitacao.",
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Erro de conexao. Verifique sua internet e tente novamente.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleExampleClick = (text: string) => {
    sendMessage(text)
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
                    Assistente de Consultas
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Faca perguntas sobre obras, modelos, colaboradores, bancas ou paradas
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto flex-col items-start gap-1 p-4 text-left"
                    onClick={() => handleExampleClick(example.text)}
                  >
                    <span className="font-medium">{example.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {example.description}
                    </span>
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HelpCircle className="h-3 w-3" />
                Digite <code className="rounded bg-muted px-1.5 py-0.5 font-mono">ajuda</code> para ver todos os comandos
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
                      className={`max-w-[85%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="text-sm">
                          {message.role === "user" ? (
                            message.content
                          ) : (
                            <div className="space-y-0.5">
                              {renderMarkdown(message.content)}
                            </div>
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

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <Card className="bg-card">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando dados...
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
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite obra, modelo, colaborador, banca, parada ou data..."
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
