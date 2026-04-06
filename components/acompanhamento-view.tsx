"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  Clock, 
  Pause, 
  AlertTriangle,
  CheckCircle2,
  Activity,
  Timer
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration } from "@/lib/constants"

interface ActiveTest {
  id: number
  work_number: string
  model: string
  bench: number
  employee_id: string
  expected_duration_minutes: number
  total_elapsed_minutes: number
  elapsed_minutes: number
  percent_complete: number
  urgency: "ok" | "warning" | "danger"
  is_paused: boolean
  stop_count: number
  total_stop_duration: number
  start_time: string
}

interface ApiResponse {
  tests: ActiveTest[]
  total_active: number
  total_paused: number
  timestamp: string
}

export function AcompanhamentoView() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/testes-ativos")
      if (!response.ok) throw new Error("Erro ao buscar dados")
      const result = await response.json()
      setData(result)
      setLastUpdate(new Date())
      setSecondsElapsed(0)
      setError(null)
    } catch {
      setError("Erro ao carregar dados")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch inicial e auto-refresh a cada 30s
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Timer que incrementa a cada segundo para atualizar os tempos visualmente
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const getUrgencyColor = (urgency: string, isPaused: boolean) => {
    if (isPaused) return "bg-muted text-muted-foreground"
    switch (urgency) {
      case "danger": return "bg-red-500 text-white"
      case "warning": return "bg-yellow-500 text-white"
      default: return "bg-green-500 text-white"
    }
  }

  const getProgressColor = (urgency: string, isPaused: boolean) => {
    if (isPaused) return "bg-muted"
    switch (urgency) {
      case "danger": return "bg-red-500"
      case "warning": return "bg-yellow-500"
      default: return "bg-green-500"
    }
  }

  const formatElapsedTime = (minutes: number) => {
    // Adiciona os segundos extras desde a última atualização
    const totalMinutes = minutes + Math.floor(secondsElapsed / 60)
    const extraSeconds = secondsElapsed % 60
    
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    
    if (h > 0) {
      return `${h}h${m.toString().padStart(2, "0")}:${extraSeconds.toString().padStart(2, "0")}`
    }
    return `${m}:${extraSeconds.toString().padStart(2, "0")}`
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo e refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Acompanhamento em Tempo Real
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Painel de monitoramento dos testes em andamento
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          )}
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
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{data?.total_active || 0}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data?.total_paused || 0}</p>
                <p className="text-xs text-muted-foreground">Pausados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.tests.filter(t => t.urgency === "danger" && !t.is_paused).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Excedendo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.tests.filter(t => t.urgency === "warning" && !t.is_paused).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Atenção (80%+)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de testes */}
      {data?.tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Nenhum teste em andamento</p>
            <p className="text-sm text-muted-foreground">
              Todos os testes foram finalizados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.tests.map((test) => (
            <Card 
              key={test.id} 
              className={cn(
                "relative overflow-hidden transition-all",
                test.is_paused && "opacity-60",
                test.urgency === "danger" && !test.is_paused && "ring-2 ring-red-500",
                test.urgency === "warning" && !test.is_paused && "ring-2 ring-yellow-500"
              )}
            >
              {/* Indicador de status no topo */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1",
                getProgressColor(test.urgency, test.is_paused)
              )} />
              
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{test.work_number}</CardTitle>
                    <CardDescription>{test.model}</CardDescription>
                  </div>
                  <Badge className={getUrgencyColor(test.urgency, test.is_paused)}>
                    {test.is_paused ? (
                      <><Pause className="h-3 w-3 mr-1" /> Pausado</>
                    ) : test.urgency === "danger" ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Excedeu</>
                    ) : test.urgency === "warning" ? (
                      <><Clock className="h-3 w-3 mr-1" /> Atenção</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> OK</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Timer grande - Tempo Total */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Tempo Total</p>
                  <div className={cn(
                    "text-3xl font-mono font-bold",
                    test.is_paused ? "text-muted-foreground" : "text-foreground"
                  )}>
                    <Timer className="inline h-6 w-6 mr-2" />
                    {test.is_paused 
                      ? formatDuration(test.total_elapsed_minutes)
                      : formatElapsedTime(test.total_elapsed_minutes)
                    }
                  </div>
                </div>
                
                {/* Tempo Efetivo de Teste */}
                <div className={cn(
                  "text-center p-2 rounded-lg",
                  test.is_paused ? "bg-muted" :
                  test.urgency === "danger" ? "bg-red-500/10" :
                  test.urgency === "warning" ? "bg-yellow-500/10" : "bg-green-500/10"
                )}>
                  <p className="text-xs text-muted-foreground">Tempo Efetivo de Teste</p>
                  <div className={cn(
                    "text-xl font-mono font-bold",
                    test.is_paused ? "text-muted-foreground" : 
                    test.urgency === "danger" ? "text-red-500" :
                    test.urgency === "warning" ? "text-yellow-600" : "text-green-600"
                  )}>
                    {test.is_paused 
                      ? formatDuration(test.elapsed_minutes)
                      : formatElapsedTime(test.elapsed_minutes)
                    }
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {formatDuration(test.expected_duration_minutes)}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{Math.min(test.percent_complete, 100)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(test.percent_complete, 100)} 
                    className={cn(
                      "h-2",
                      test.is_paused ? "[&>div]:bg-muted-foreground" :
                      test.urgency === "danger" ? "[&>div]:bg-red-500" :
                      test.urgency === "warning" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"
                    )}
                  />
                </div>

                {/* Informações adicionais */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Banca</p>
                    <p className="font-medium">{test.bench}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">8ID</p>
                    <p className="font-medium">{test.employee_id}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Paradas</p>
                    <p className="font-medium">{test.stop_count}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Tempo Parado</p>
                    <p className="font-medium">{formatDuration(test.total_stop_duration)}</p>
                  </div>
                </div>

                {/* Horário de início */}
                <p className="text-xs text-center text-muted-foreground">
                  Iniciado às {new Date(test.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
