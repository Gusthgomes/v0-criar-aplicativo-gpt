"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
} from "lucide-react"
import { formatDuration } from "@/lib/constants"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface PeriodStats {
  total_tests: number
  finished_tests: number
  on_time: number
  exceeded: number
  on_time_percentage: number
  avg_duration: number | null
  total_stops: number
  first_test_approval: number
  first_test_approval_percentage: number
  stops_by_type: { stop_type: string; count: number; total_duration: number }[]
}

interface ComparativoData {
  period1: {
    from: string
    to: string
    stats: PeriodStats
  }
  period2: {
    from: string
    to: string
    stats: PeriodStats
  }
  variations: {
    total_tests: number
    on_time_percentage: number
    avg_duration: number
    total_stops: number
    first_test_approval_percentage: number
  }
}

// Presets de período
function getPresetDates(preset: string): { p1From: string; p1To: string; p2From: string; p2To: string } {
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split("T")[0]

  switch (preset) {
    case "week": {
      // Esta semana vs semana passada
      const dayOfWeek = today.getDay()
      const startOfThisWeek = new Date(today)
      startOfThisWeek.setDate(today.getDate() - dayOfWeek)
      const endOfThisWeek = new Date(startOfThisWeek)
      endOfThisWeek.setDate(startOfThisWeek.getDate() + 6)

      const startOfLastWeek = new Date(startOfThisWeek)
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
      const endOfLastWeek = new Date(startOfLastWeek)
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)

      return {
        p1From: formatDate(startOfThisWeek),
        p1To: formatDate(endOfThisWeek),
        p2From: formatDate(startOfLastWeek),
        p2To: formatDate(endOfLastWeek),
      }
    }
    case "month": {
      // Este mês vs mês passado
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

      return {
        p1From: formatDate(startOfThisMonth),
        p1To: formatDate(endOfThisMonth),
        p2From: formatDate(startOfLastMonth),
        p2To: formatDate(endOfLastMonth),
      }
    }
    case "last7days": {
      // Últimos 7 dias vs 7 dias anteriores
      const end1 = new Date(today)
      const start1 = new Date(today)
      start1.setDate(today.getDate() - 6)

      const end2 = new Date(start1)
      end2.setDate(start1.getDate() - 1)
      const start2 = new Date(end2)
      start2.setDate(end2.getDate() - 6)

      return {
        p1From: formatDate(start1),
        p1To: formatDate(end1),
        p2From: formatDate(start2),
        p2To: formatDate(end2),
      }
    }
    default:
      return { p1From: "", p1To: "", p2From: "", p2To: "" }
  }
}

function VariationBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  // inverted = true significa que valor negativo é bom (ex: menos paradas)
  const isPositive = inverted ? value < 0 : value > 0
  const isNegative = inverted ? value > 0 : value < 0

  if (value === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    )
  }

  return (
    <Badge
      variant={isPositive ? "default" : "destructive"}
      className={`flex items-center gap-1 ${isPositive ? "bg-green-600" : ""}`}
    >
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{value}%
    </Badge>
  )
}

function PointVariationBadge({ value, inverted = false }: { value: number; inverted?: boolean }) {
  const isPositive = inverted ? value < 0 : value > 0
  const isNegative = inverted ? value > 0 : value < 0

  if (value === 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Minus className="h-3 w-3" />
        0 p.p.
      </Badge>
    )
  }

  return (
    <Badge
      variant={isPositive ? "default" : "destructive"}
      className={`flex items-center gap-1 ${isPositive ? "bg-green-600" : ""}`}
    >
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{value} p.p.
    </Badge>
  )
}

export function ComparativoView() {
  const [period1From, setPeriod1From] = useState("")
  const [period1To, setPeriod1To] = useState("")
  const [period2From, setPeriod2From] = useState("")
  const [period2To, setPeriod2To] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ComparativoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applyPreset = (preset: string) => {
    const dates = getPresetDates(preset)
    setPeriod1From(dates.p1From)
    setPeriod1To(dates.p1To)
    setPeriod2From(dates.p2From)
    setPeriod2To(dates.p2To)
  }

  const handleSearch = async () => {
    if (!period1From || !period1To || !period2From || !period2To) return

    setIsLoading(true)
    setError(null)

    try {
      const url = `/api/comparativo?period1_from=${period1From}&period1_to=${period1To}&period2_from=${period2From}&period2_to=${period2To}`
      const response = await fetch(url)
      if (!response.ok) throw new Error("Erro ao buscar dados")
      const result = await response.json()
      setData(result)
    } catch {
      setError("Erro ao buscar dados. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  // Preparar dados para gráfico comparativo de paradas
  const prepareChartData = () => {
    if (!data) return []

    const allStopTypes = new Set<string>()
    data.period1.stats.stops_by_type.forEach((s) => allStopTypes.add(s.stop_type))
    data.period2.stats.stops_by_type.forEach((s) => allStopTypes.add(s.stop_type))

    return Array.from(allStopTypes).map((stopType) => {
      const p1 = data.period1.stats.stops_by_type.find((s) => s.stop_type === stopType)
      const p2 = data.period2.stats.stops_by_type.find((s) => s.stop_type === stopType)
      return {
        stop_type: stopType,
        periodo_atual: p1?.total_duration || 0,
        periodo_anterior: p2?.total_duration || 0,
      }
    }).sort((a, b) => (b.periodo_atual + b.periodo_anterior) - (a.periodo_atual + a.periodo_anterior)).slice(0, 10)
  }

  const formatPeriod = (from: string, to: string) => {
    return `${new Date(from).toLocaleDateString("pt-BR")} a ${new Date(to).toLocaleDateString("pt-BR")}`
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Comparativo entre Periodos
          </CardTitle>
          <CardDescription>
            Compare metricas de desempenho entre dois periodos diferentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset("last7days")}>
              Ultimos 7 dias vs anteriores
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset("week")}>
              Esta semana vs passada
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset("month")}>
              Este mes vs passado
            </Button>
          </div>

          {/* Datas personalizadas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4">
              <Label className="font-medium text-primary">Periodo Atual</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={period1From}
                    onChange={(e) => setPeriod1From(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ate</Label>
                  <Input
                    type="date"
                    value={period1To}
                    onChange={(e) => setPeriod1To(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <Label className="font-medium text-muted-foreground">Periodo Anterior</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={period2From}
                    onChange={(e) => setPeriod2From(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ate</Label>
                  <Input
                    type="date"
                    value={period2To}
                    onChange={(e) => setPeriod2To(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isLoading || !period1From || !period1To || !period2From || !period2To}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Comparar Periodos
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {data && (
        <>
          {/* KPIs Comparativos */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Taxa de Aprovação */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <PointVariationBadge value={data.variations.on_time_percentage} />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{data.period1.stats.on_time_percentage}%</p>
                  <p className="text-xs text-muted-foreground">vs {data.period2.stats.on_time_percentage}% anterior</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Taxa de Aprovacao</p>
              </CardContent>
            </Card>

            {/* Aprovação 1º Teste */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <PointVariationBadge value={data.variations.first_test_approval_percentage} />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{data.period1.stats.first_test_approval_percentage}%</p>
                  <p className="text-xs text-muted-foreground">vs {data.period2.stats.first_test_approval_percentage}% anterior</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Aprovacao 1º Teste</p>
              </CardContent>
            </Card>

            {/* Tempo Médio */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <VariationBadge value={data.variations.avg_duration} inverted />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">
                    {data.period1.stats.avg_duration ? formatDuration(data.period1.stats.avg_duration) : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    vs {data.period2.stats.avg_duration ? formatDuration(data.period2.stats.avg_duration) : "N/A"} anterior
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Tempo Medio</p>
              </CardContent>
            </Card>

            {/* Total de Paradas */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <VariationBadge value={data.variations.total_stops} inverted />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{data.period1.stats.total_stops}</p>
                  <p className="text-xs text-muted-foreground">vs {data.period2.stats.total_stops} anterior</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Total de Paradas</p>
              </CardContent>
            </Card>

            {/* Total de Testes */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <VariationBadge value={data.variations.total_tests} />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{data.period1.stats.total_tests}</p>
                  <p className="text-xs text-muted-foreground">vs {data.period2.stats.total_tests} anterior</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Total de Testes</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo dos Períodos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">
                  Periodo Atual
                </CardTitle>
                <CardDescription>{formatPeriod(data.period1.from, data.period1.to)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Testes finalizados</p>
                    <p className="font-medium">{data.period1.stats.finished_tests}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">No tempo</p>
                    <p className="font-medium text-green-600">{data.period1.stats.on_time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Excederam</p>
                    <p className="font-medium text-red-600">{data.period1.stats.exceeded}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aprov. 1º teste</p>
                    <p className="font-medium">{data.period1.stats.first_test_approval}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Periodo Anterior
                </CardTitle>
                <CardDescription>{formatPeriod(data.period2.from, data.period2.to)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Testes finalizados</p>
                    <p className="font-medium">{data.period2.stats.finished_tests}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">No tempo</p>
                    <p className="font-medium text-green-600">{data.period2.stats.on_time}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Excederam</p>
                    <p className="font-medium text-red-600">{data.period2.stats.exceeded}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Aprov. 1º teste</p>
                    <p className="font-medium">{data.period2.stats.first_test_approval}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Comparativo de Paradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparativo de Paradas por Tempo</CardTitle>
              <CardDescription>
                Top 10 tipos de paradas ordenados por tempo total (em minutos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareChartData()}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const hours = Math.floor(value / 60)
                        const mins = value % 60
                        if (hours > 0 && mins > 0) return `${hours}h${mins}`
                        if (hours > 0) return `${hours}h`
                        return `${mins}m`
                      }}
                    />
                    <YAxis 
                      dataKey="stop_type" 
                      type="category" 
                      width={120} 
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatDuration(value),
                        name === "periodo_atual" ? "Período Atual" : "Período Anterior"
                      ]}
                    />
                    <Legend 
                      formatter={(value) => value === "periodo_atual" ? "Período Atual" : "Período Anterior"}
                    />
                    <Bar dataKey="periodo_atual" fill="#3b82f6" name="periodo_atual" />
                    <Bar dataKey="periodo_anterior" fill="#94a3b8" name="periodo_anterior" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
