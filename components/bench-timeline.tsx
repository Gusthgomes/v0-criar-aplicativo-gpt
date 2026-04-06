"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineTest {
  id: number
  work_number: string
  model: string
  start_time: string
  end_time: string | null
  expected_minutes: number
  actual_minutes: number | null
  exceeded: boolean
  in_progress: boolean
}

interface BenchData {
  bench: number
  tests: TimelineTest[]
}

interface TimelineData {
  date: string
  benches: BenchData[]
  timestamp: string
}

// Horário de trabalho: 7:30 às 17:30 (10 horas)
const WORK_START_HOUR = 7.5 // 7:30
const WORK_END_HOUR = 17.5 // 17:30
const TOTAL_HOURS = WORK_END_HOUR - WORK_START_HOUR

export function BenchTimeline() {
  const [data, setData] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/timeline-bancas")
      if (!response.ok) throw new Error("Erro ao buscar dados")
      const result = await response.json()
      setData(result)
      setError(null)
    } catch {
      setError("Erro ao carregar timeline")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Atualizar a cada 60 segundos
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Converter hora para posição percentual
  const getPositionPercent = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = date.getHours() + date.getMinutes() / 60
    const position = ((hours - WORK_START_HOUR) / TOTAL_HOURS) * 100
    return Math.max(0, Math.min(100, position))
  }

  // Converter duração em minutos para largura percentual
  const getWidthPercent = (minutes: number) => {
    const hours = minutes / 60
    return Math.max(2, (hours / TOTAL_HOURS) * 100) // Mínimo 2% para visibilidade
  }

  // Gerar marcadores de hora
  const hourMarkers = []
  for (let h = 8; h <= 17; h++) {
    const position = ((h - WORK_START_HOUR) / TOTAL_HOURS) * 100
    hourMarkers.push({ hour: h, position })
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        {error}
        <Button variant="outline" size="sm" onClick={fetchData} className="ml-4">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historico do Dia por Banca</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.benches.map((bench) => (
          <Card key={bench.bench} className="overflow-hidden">
            <CardHeader className="py-2 px-4 bg-muted/50">
              <CardTitle className="text-sm font-medium">
                Banca {bench.bench}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Timeline container */}
              <div className="relative h-16 bg-card">
                {/* Linha de fundo */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                
                {/* Marcadores de hora */}
                <div className="absolute inset-x-0 bottom-0 h-5 border-t border-border bg-muted/30">
                  {hourMarkers.map(({ hour, position }) => (
                    <div
                      key={hour}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                    >
                      <div className="h-2 w-px bg-border -mt-2" />
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {hour}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Blocos de teste */}
                <div className="absolute inset-x-0 top-2 h-8 px-1">
                  {bench.tests.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      Nenhum teste hoje
                    </div>
                  ) : (
                    bench.tests.map((test) => {
                      const left = getPositionPercent(test.start_time)
                      const width = getWidthPercent(test.actual_minutes || test.expected_minutes)
                      
                      return (
                        <div
                          key={test.id}
                          className={cn(
                            "absolute h-full rounded flex items-center justify-center text-white text-xs font-medium shadow-sm transition-all hover:scale-105 hover:z-10",
                            test.in_progress 
                              ? "bg-blue-500 animate-pulse" 
                              : test.exceeded 
                                ? "bg-red-500" 
                                : "bg-green-500"
                          )}
                          style={{ 
                            left: `${left}%`, 
                            width: `${Math.min(width, 100 - left)}%`,
                            minWidth: "40px"
                          }}
                          title={`${test.work_number} - ${test.model}\nInício: ${new Date(test.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n${test.end_time ? `Fim: ${new Date(test.end_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Em andamento"}`}
                        >
                          {test.work_number}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>No tempo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Excedeu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500 animate-pulse" />
          <span>Em andamento</span>
        </div>
      </div>
    </div>
  )
}
