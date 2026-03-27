"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { ParetoDrilldown } from "@/components/pareto-drilldown"
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
  ChevronDown,
  Check,
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
  if (filters.models.length > 0) params.set("models", filters.models.join(","))
  if (filters.employeeId) params.set("employee_id", filters.employeeId)
  if (filters.status) params.set("status", filters.status)
  const qs = params.toString()
  return `/api/dashboard${qs ? `?${qs}` : ""}`
}

interface FilterState {
  dateFrom: string
  dateTo: string
  bench: string
  models: string[]
  employeeId: string
  status: string
}

const emptyFilters: FilterState = {
  dateFrom: "",
  dateTo: "",
  bench: "",
  models: [],
  employeeId: "",
  status: "",
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function parseFiltersFromURL(searchParams: URLSearchParams): FilterState {
  return {
    dateFrom: searchParams.get("date_from") || "",
    dateTo: searchParams.get("date_to") || "",
    bench: searchParams.get("bench") || "",
    models: searchParams.get("models")?.split(",").filter(Boolean) || [],
    employeeId: searchParams.get("employee_id") || "",
    status: searchParams.get("status") || "",
  }
}

function buildURLQueryString(filters: FilterState): string {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set("date_from", filters.dateFrom)
  if (filters.dateTo) params.set("date_to", filters.dateTo)
  if (filters.bench) params.set("bench", filters.bench)
  if (filters.models.length > 0) params.set("models", filters.models.join(","))
  if (filters.employeeId) params.set("employee_id", filters.employeeId)
  if (filters.status) params.set("status", filters.status)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

function buildSubtypeFilterParams(filters: FilterState): string {
  const params = new URLSearchParams()
  if (filters.dateFrom) params.set("date_from", filters.dateFrom)
  if (filters.dateTo) params.set("date_to", filters.dateTo)
  if (filters.bench) params.set("bench", filters.bench)
  return params.toString()
}

export function DashboardView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Inicializa os filtros a partir da URL
  const initialFilters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams])

  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters)
  const [showFilters, setShowFilters] = useState(
    initialFilters.dateFrom !== "" ||
    initialFilters.dateTo !== "" ||
    initialFilters.bench !== "" ||
    initialFilters.models.length > 0 ||
    initialFilters.employeeId !== "" ||
    initialFilters.status !== ""
  )

  // Sincroniza filtros quando a URL muda (ex: botao voltar)
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams)
    setFilters(urlFilters)
    setAppliedFilters(urlFilters)
  }, [searchParams])

  const handleStopBarClick = useCallback(
    (data: { stop_type?: string }) => {
      if (data?.stop_type) {
        // Passar os filtros aplicados para a página de paradas
        const params = new URLSearchParams()
        params.set("type", data.stop_type)
        if (appliedFilters.dateFrom) params.set("date_from", appliedFilters.dateFrom)
        if (appliedFilters.dateTo) params.set("date_to", appliedFilters.dateTo)
        if (appliedFilters.bench) params.set("bench", appliedFilters.bench)
        if (appliedFilters.models.length > 0) params.set("models", appliedFilters.models.join(","))
        if (appliedFilters.employeeId) params.set("employee_id", appliedFilters.employeeId)
        router.push(`/paradas?${params.toString()}`)
      }
    },
    [router, appliedFilters]
  )

  const url = useMemo(() => buildQueryString(appliedFilters), [appliedFilters])
  const { data, error, isLoading } = useSWR(url, fetcher)

  // Parâmetros de filtro para drill-down dos Paretos
  const subtypeFilterParams = useMemo(() => buildSubtypeFilterParams(appliedFilters), [appliedFilters])

  const hasActiveFilters = appliedFilters.dateFrom !== "" ||
    appliedFilters.dateTo !== "" ||
    appliedFilters.bench !== "" ||
    appliedFilters.models.length > 0 ||
    appliedFilters.employeeId !== "" ||
    appliedFilters.status !== ""

  function applyFilters() {
    setAppliedFilters({ ...filters })
    // Atualiza a URL com os filtros aplicados
    const queryString = buildURLQueryString(filters)
    router.push(`/dashboard${queryString}`, { scroll: false })
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    // Limpa a URL
    router.push("/dashboard", { scroll: false })
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
                    Modelos
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {filters.models.length === 0 ? (
                          <span className="text-muted-foreground">Todos os modelos</span>
                        ) : filters.models.length <= 3 ? (
                          <span>{filters.models.join(", ")}</span>
                        ) : (
                          <span>{filters.models.length} modelos selecionados</span>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                      <div className="p-2">
                        <div className="mb-2 flex items-center justify-between border-b pb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Selecione os modelos
                          </span>
                          {filters.models.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => setFilters((f) => ({ ...f, models: [] }))}
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {MODELS.map((m) => {
                            const isSelected = filters.models.includes(m)
                            return (
                              <div
                                key={m}
                                className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted ${isSelected ? "bg-primary/10" : ""
                                  }`}
                                onClick={() => {
                                  if (isSelected) {
                                    setFilters((f) => ({
                                      ...f,
                                      models: f.models.filter((x) => x !== m),
                                    }))
                                  } else {
                                    setFilters((f) => ({
                                      ...f,
                                      models: [...f.models, m],
                                    }))
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                                <span className="flex-1 text-sm">{m}</span>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {filters.models.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filters.models.map((m) => (
                        <Badge
                          key={m}
                          variant="secondary"
                          className="cursor-pointer gap-1 pr-1 text-xs"
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              models: f.models.filter((x) => x !== m),
                            }))
                          }
                        >
                          {m}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="finished">Finalizados</SelectItem>
                      <SelectItem value="pending">Em Andamento</SelectItem>
                      <SelectItem value="paused">Pausados</SelectItem>
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
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
            title="Aprov. 1o Teste"
            value={`${approvedFirstPct}%`}
            description={`${totalApprovedFirst}/${totalFirstTests} obras`}
            icon={<ShieldCheck className="h-4 w-4" />}
            variant="success"
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
          {/* Paradas por tempo total */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paradas por Tempo Total</CardTitle>
              <CardDescription>Ordenado por maior tempo acumulado - clique para ver detalhes</CardDescription>
            </CardHeader>
            <CardContent>
              {stopsByType.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponiveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    total_duration: { label: "Tempo Total", color: CHART_RED },
                  }}
                  className="h-[300px]"
                >
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
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => {
                        const hours = Math.floor(value / 60)
                        const mins = value % 60
                        return hours > 0 ? `${hours}h${mins > 0 ? mins : ""}` : `${mins}min`
                      }}
                    />
                    <YAxis
                      dataKey="stop_type"
                      type="category"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as { stop_type: string; count: number; total_duration: number }
                          return (
                            <div className="rounded-md border bg-background p-2 shadow-md">
                              <p className="font-medium">{data.stop_type}</p>
                              <p className="text-sm text-muted-foreground">Tempo total: {formatDuration(data.total_duration)}</p>
                              <p className="text-sm text-muted-foreground">Quantidade: {data.count} ocorrencias</p>
                              <p className="mt-1 text-xs text-primary">Clique para ver obras</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="total_duration" radius={[0, 4, 4, 0]}>
                      {stopsByType.map((_: unknown, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index < 3 ? CHART_RED : CHART_BLUE}
                          className="cursor-pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
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
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seção: Tempo de Teste M76 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tempo de Teste: M76</CardTitle>
            <CardDescription>Distribuição de testes no tempo vs excedeu e principais motivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pizza M76 */}
              <div>
                {(() => {
                  const m76Data = testsByModel.find((t: { model: string }) => t.model === "M76")
                  if (!m76Data || (m76Data.on_time === 0 && m76Data.exceeded === 0)) {
                    return (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Sem dados para M76
                      </p>
                    )
                  }
                  const pieData = [
                    { name: "No Tempo", value: m76Data.on_time, fill: CHART_GREEN },
                    { name: "Excedeu", value: m76Data.exceeded, fill: CHART_RED },
                  ]
                  const total = m76Data.on_time + m76Data.exceeded
                  return (
                    <ChartContainer
                      config={{
                        onTime: { label: "No Tempo", color: CHART_GREEN },
                        exceeded: { label: "Excedeu", color: CHART_RED },
                      }}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} testes`, ""]} />
                      </PieChart>
                    </ChartContainer>
                  )
                })()}
              </div>
              {/* Pareto M76 - Motivos Excedeu */}
              <div>
                <ParetoDrilldown
                  data={data?.exceeded_reasons_m76 || []}
                  title="Pareto: Por que excedeu?"
                  filterParams={`${subtypeFilterParams}&model=M76`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Tempo de Teste M73, M74, M75, M77 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tempo de Teste: M73, M74, M75, M77</CardTitle>
            <CardDescription>Distribuição de testes no tempo vs excedeu e principais motivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pizza Outros */}
              <div>
                {(() => {
                  const targetModels = ["M73", "M74", "M75", "M77"]
                  const filteredData = testsByModel.filter((t: { model: string }) => targetModels.includes(t.model))
                  const totalOnTime = filteredData.reduce((sum: number, t: { on_time: number }) => sum + t.on_time, 0)
                  const totalExceeded = filteredData.reduce((sum: number, t: { exceeded: number }) => sum + t.exceeded, 0)
                  if (totalOnTime === 0 && totalExceeded === 0) {
                    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados</p>
                  }
                  const pieData = [
                    { name: "No Tempo", value: totalOnTime, fill: CHART_GREEN },
                    { name: "Excedeu", value: totalExceeded, fill: CHART_RED },
                  ]
                  const total = totalOnTime + totalExceeded
                  return (
                    <ChartContainer
                      config={{ onTime: { label: "No Tempo", color: CHART_GREEN }, exceeded: { label: "Excedeu", color: CHART_RED } }}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                          label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                        >
                          {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} testes`, ""]} />
                      </PieChart>
                    </ChartContainer>
                  )
                })()}
              </div>
              {/* Pareto Outros - Motivos Excedeu */}
              <div>
                <ParetoDrilldown
                  data={data?.exceeded_reasons_others || []}
                  title="Pareto: Por que excedeu?"
                  filterParams={subtypeFilterParams}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Aprovação no Primeiro Teste - M76 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aprovação no Primeiro Teste: M76</CardTitle>
            <CardDescription>Aprovadas vs não aprovadas e motivos da não aprovação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pizza Aprovação M76 */}
              <div>
                {(() => {
                  const m76Approval = firstTestApproval.find((t: { model: string }) => t.model === "M76")
                  if (!m76Approval || (m76Approval.approved_no_stops === 0 && m76Approval.not_approved === 0)) {
                    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados</p>
                  }
                  const pieData = [
                    { name: "Aprovadas", value: m76Approval.approved_no_stops, fill: CHART_GREEN },
                    { name: "Não Aprovadas", value: m76Approval.not_approved, fill: CHART_RED },
                  ]
                  const total = m76Approval.approved_no_stops + m76Approval.not_approved
                  return (
                    <ChartContainer
                      config={{ approved: { label: "Aprovadas", color: CHART_GREEN }, notApproved: { label: "Não Aprovadas", color: CHART_RED } }}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                          label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                        >
                          {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} obras`, ""]} />
                      </PieChart>
                    </ChartContainer>
                  )
                })()}
              </div>
              {/* Pareto Não Aprovação M76 */}
              <div>
                <ParetoDrilldown
                  data={data?.not_approved_reasons_m76 || []}
                  title="Pareto: Motivos da não aprovação"
                  filterParams={`${subtypeFilterParams}&model=M76`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Aprovação no Primeiro Teste - Outros Modelos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aprovação no Primeiro Teste: M73, M74, M75, M77</CardTitle>
            <CardDescription>Aprovadas vs não aprovadas e motivos da não aprovação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pizza Aprovação Outros */}
              <div>
                {(() => {
                  const targetModels = ["M73", "M74", "M75", "M77"]
                  const filteredApproval = firstTestApproval.filter((t: { model: string }) => targetModels.includes(t.model))
                  const totalApproved = filteredApproval.reduce((sum: number, t: { approved_no_stops: number }) => sum + t.approved_no_stops, 0)
                  const totalNotApproved = filteredApproval.reduce((sum: number, t: { not_approved: number }) => sum + t.not_approved, 0)
                  if (totalApproved === 0 && totalNotApproved === 0) {
                    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados</p>
                  }
                  const pieData = [
                    { name: "Aprovadas", value: totalApproved, fill: CHART_GREEN },
                    { name: "Não Aprovadas", value: totalNotApproved, fill: CHART_RED },
                  ]
                  const total = totalApproved + totalNotApproved
                  return (
                    <ChartContainer
                      config={{ approved: { label: "Aprovadas", color: CHART_GREEN }, notApproved: { label: "Não Aprovadas", color: CHART_RED } }}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                          label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
                        >
                          {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} obras`, ""]} />
                      </PieChart>
                    </ChartContainer>
                  )
                })()}
              </div>
              {/* Pareto Não Aprovação Outros */}
              <div>
                <ParetoDrilldown
                  data={data?.not_approved_reasons_others || []}
                  title="Pareto: Motivos da não aprovação"
                  filterParams={subtypeFilterParams}
                />
              </div>
            </div>
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
