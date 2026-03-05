"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AppHeader } from "@/components/app-header"
import { formatDuration, MODELS, BENCHES } from "@/lib/constants"
import {
  Loader2,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Timer,
  AlertTriangle,
  Filter,
  X,
  ShieldCheck,
} from "lucide-react"

const CHART_BLUE = "#3b5998"
const CHART_GREEN = "#22a06b"
const CHART_RED = "#d04040"
const CHART_TEAL = "#0d9488"
const CHART_AMBER = "#d97706"

function buildQueryString(filters: FilterState): string {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set("date_from", filters.dateFrom)
  if (filters.dateTo) params.set("date_to", filters.dateTo)
  if (filters.bench) params.set("bench", filters.bench)
  if (filters.model) params.set("model", filters.model)
  if (filters.employeeId) params.set("employee_id", filters.employeeId)
  const qs = params.toString()
  return `/api/dashboard${qs ? `?${qs}` : ""}`
}

interface FilterState {
  dateFrom: string
  dateTo: string
  bench: string
  model: string
  employeeId: string
}

const emptyFilters: FilterState = {
  dateFrom: "",
  dateTo: "",
  bench: "",
  model: "",
  employeeId: "",
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function DashboardView() {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)

  const handleStopBarClick = useCallback(
    (data: { stop_type?: string }) => {
      if (data?.stop_type) {
        router.push(`/paradas?type=${encodeURIComponent(data.stop_type)}`)
      }
    },
    [router]
  )

  const url = useMemo(() => buildQueryString(appliedFilters), [appliedFilters])
  const { data, error, isLoading } = useSWR(url, fetcher)

  const hasActiveFilters = Object.values(appliedFilters).some((v) => v !== "")

  function applyFilters() {
    setAppliedFilters({ ...filters })
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-destructive">Erro ao carregar dados do dashboard</p>
        </main>
      </div>
    )
  }

  const stopsByType = (data?.stops_by_type || []).slice(0, 10)
  const testsByModel = data?.tests_by_model || []
  const expectedVsActual = data?.expected_vs_actual || []
  const firstTestApproval = (data?.first_test_approval || []).map(
    (item: {
      model: string
      total_first_tests: number
      approved_no_stops: number
      not_approved: number
    }) => ({
      ...item,
      approved_pct:
        item.total_first_tests > 0
          ? Math.round((item.approved_no_stops / item.total_first_tests) * 100)
          : 0,
    })
  )

  const totalFirstTests = firstTestApproval.reduce(
    (sum: number, item: { total_first_tests: number }) => sum + item.total_first_tests,
    0
  )
  const totalApprovedFirst = firstTestApproval.reduce(
    (sum: number, item: { approved_no_stops: number }) => sum + item.approved_no_stops,
    0
  )
  const approvedFirstPct =
    totalFirstTests > 0 ? Math.round((totalApprovedFirst / totalFirstTests) * 100) : 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground text-balance">
              Dashboard de Analise
            </h2>
            <p className="text-sm text-muted-foreground">
              Visao geral dos testes e paradas registradas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                Filtros ativos
                <button onClick={clearFilters} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Data Inicio
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Data Fim
                  </Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateTo: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Banca
                  </Label>
                  <Select
                    value={filters.bench}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, bench: v === "all" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {BENCHES.map((b) => (
                        <SelectItem key={b} value={String(b)}>
                          Banca {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Modelo
                  </Label>
                  <Select
                    value={filters.model}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, model: v === "all" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {MODELS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    8ID
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 12345678"
                    value={filters.employeeId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 8)
                      setFilters((f) => ({ ...f, employeeId: val }))
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button onClick={applyFilters} size="sm">
                  Aplicar Filtros
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            title="Testes Encerrados"
            value={String(data?.finished_tests || 0)}
            description={`de ${data?.total_tests || 0} no total`}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <KpiCard
            title="Em Andamento"
            value={String(data?.pending_tests || 0)}
            description="Pausados ou ativos"
            icon={<Loader2 className="h-4 w-4" />}
            variant="warning"
          />
          <KpiCard
            title="No Tempo"
            value={`${data?.on_time_percentage || 0}%`}
            description={`${data?.on_time || 0} testes`}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="success"
          />
          <KpiCard
            title="Excederam"
            value={`${data?.exceeded_percentage || 0}%`}
            description={`${data?.exceeded || 0} testes`}
            icon={<TrendingDown className="h-4 w-4" />}
            variant="danger"
          />
          <KpiCard
            title="Tempo Medio"
            value={data?.avg_duration ? formatDuration(data.avg_duration) : "N/A"}
            icon={<Timer className="h-4 w-4" />}
          />
          <KpiCard
            title="Paradas/Teste"
            value={String(data?.avg_stops_per_test || 0)}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Paradas mais comuns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paradas Mais Comuns</CardTitle>
              <CardDescription>Top 10 tipos de parada registrados - clique em uma barra para ver as obras</CardDescription>
            </CardHeader>
            <CardContent>
              {stopsByType.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponiveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    count: { label: "Quantidade", color: CHART_BLUE },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stopsByType}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                      onClick={(state) => {
                        if (state?.activePayload?.[0]?.payload) {
                          handleStopBarClick(state.activePayload[0].payload)
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="stop_type"
                        type="category"
                        width={130}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}  -  Clique para ver obras`, "Quantidade"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {stopsByType.map((_: unknown, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index < 3 ? CHART_RED : CHART_BLUE}
                            className="cursor-pointer"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Testes por modelo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Testes por Modelo</CardTitle>
              <CardDescription>Distribuicao e cumprimento por modelo</CardDescription>
            </CardHeader>
            <CardContent>
              {testsByModel.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponiveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    on_time: { label: "No Tempo", color: CHART_GREEN },
                    exceeded: { label: "Excedeu", color: CHART_RED },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={testsByModel}
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="on_time"
                        stackId="a"
                        fill={CHART_GREEN}
                        radius={[0, 0, 0, 0]}
                        name="No Tempo"
                      />
                      <Bar
                        dataKey="exceeded"
                        stackId="a"
                        fill={CHART_RED}
                        radius={[4, 4, 0, 0]}
                        name="Excedeu"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* NOVO: Tempo Esperado vs Realizado */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Tempo de Teste: Esperado vs Realizado
              </CardTitle>
              <CardDescription>
                Comparacao entre o tempo estipulado por modelo e o tempo medio real dos testes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expectedVsActual.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponiveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    expected: { label: "Estipulado", color: CHART_BLUE },
                    actual: { label: "Realizado (media)", color: CHART_AMBER },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={expectedVsActual}
                      margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                      <YAxis
                        label={{
                          value: "Minutos",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 11 },
                        }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value} min (${formatDuration(value)})`,
                          name === "expected" ? "Estipulado" : "Realizado (media)",
                        ]}
                      />
                      <Legend
                        formatter={(value: string) =>
                          value === "expected" ? "Estipulado" : "Realizado (media)"
                        }
                      />
                      <Bar
                        dataKey="expected"
                        fill={CHART_BLUE}
                        radius={[4, 4, 0, 0]}
                        name="expected"
                      />
                      <Bar
                        dataKey="actual"
                        radius={[4, 4, 0, 0]}
                        name="actual"
                      >
                        {expectedVsActual.map(
                          (entry: { expected: number; actual: number }, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.actual > entry.expected ? CHART_RED : CHART_GREEN}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Obras Aprovadas no Primeiro Teste */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  Obras Aprovadas no Primeiro Teste
                </CardTitle>
                <CardDescription>
                  Nao aprovadas = obras com Erro de montagem, Erro de fornecedor, Retrabalho, Erro de especificacao ou Material trocado
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{approvedFirstPct}%</p>
                  <p className="text-[10px] text-muted-foreground">
                    {totalApprovedFirst}/{totalFirstTests} obras
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {firstTestApproval.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sem dados disponiveis
              </p>
            ) : (
              <ChartContainer
                config={{
                  approved_no_stops: { label: "Aprovadas", color: CHART_GREEN },
                  not_approved: { label: "Nao Aprovadas", color: CHART_RED },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={firstTestApproval}
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} obras`,
                        name === "approved_no_stops"
                          ? "Aprovadas no 1o teste"
                          : "Nao aprovadas",
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "approved_no_stops"
                          ? "Aprovadas no 1o teste"
                          : "Nao aprovadas"
                      }
                    />
                    <Bar
                      dataKey="approved_no_stops"
                      stackId="a"
                      fill={CHART_GREEN}
                      radius={[0, 0, 0, 0]}
                      name="approved_no_stops"
                    />
                    <Bar
                      dataKey="not_approved"
                      stackId="a"
                      fill={CHART_RED}
                      radius={[4, 4, 0, 0]}
                      name="not_approved"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabela de testes recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testes Recentes</CardTitle>
            <CardDescription>Ultimos 50 testes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.recent_tests || data.recent_tests.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum teste registrado ainda
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>8ID</TableHead>
                      <TableHead>Banca</TableHead>
                      <TableHead>Estipulado</TableHead>
                      <TableHead>Real</TableHead>
                      <TableHead>Paradas</TableHead>
                      <TableHead>Tempo Parado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_tests.map(
                      (test: {
                        id: number
                        work_number: string
                        model: string
                        employee_id: string
                        bench: number
                        expected_duration_minutes: number
                        actual_duration_minutes: number | null
                        stop_count: number
                        total_stop_duration: number
                        finished_at: string | null
                        is_complete: boolean | null
                        created_at: string
                      }) => {
                        const isFinished = !!test.finished_at
                        const isPaused = !isFinished && test.is_complete === false
                        const isRunning = !isFinished && test.is_complete === null

                        let statusLabel = "Em Andamento"
                        let statusVariant: "default" | "destructive" | "secondary" | "outline" = "outline"
                        let statusClass = "border-amber-500 text-amber-600"

                        if (isFinished) {
                          const withinTime =
                            (test.actual_duration_minutes ?? 0) <=
                            test.expected_duration_minutes
                          statusLabel = withinTime ? "No Tempo" : "Excedeu"
                          statusVariant = withinTime ? "default" : "destructive"
                          statusClass = withinTime ? "bg-[#22a06b] text-white" : ""
                        } else if (isPaused) {
                          statusLabel = "Pausado"
                          statusVariant = "secondary"
                          statusClass = "bg-amber-100 text-amber-700 border-amber-300"
                        }

                        return (
                          <TableRow key={test.id} className={!isFinished ? "opacity-75" : ""}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/consulta?obra=${test.work_number}`}
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {test.work_number}
                              </Link>
                            </TableCell>
                            <TableCell>{test.model}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {test.employee_id}
                            </TableCell>
                            <TableCell>{test.bench}</TableCell>
                            <TableCell>
                              {formatDuration(test.expected_duration_minutes)}
                            </TableCell>
                            <TableCell>
                              {test.actual_duration_minutes != null
                                ? formatDuration(test.actual_duration_minutes)
                                : "-"}
                            </TableCell>
                            <TableCell>{test.stop_count}</TableCell>
                            <TableCell>
                              {test.total_stop_duration > 0
                                ? formatDuration(test.total_stop_duration)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusVariant}
                                className={statusClass}
                              >
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(
                                test.finished_at || test.created_at
                              ).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                          </TableRow>
                        )
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function KpiCard({
  title,
  value,
  description,
  icon,
  variant,
}: {
  title: string
  value: string
  description?: string
  icon: React.ReactNode
  variant?: "success" | "danger" | "warning"
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <p
          className={`text-2xl font-bold ${variant === "success"
            ? "text-[#22a06b]"
            : variant === "danger"
              ? "text-destructive"
              : variant === "warning"
                ? "text-amber-600"
                : "text-foreground"
            }`}
        >
          {value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
