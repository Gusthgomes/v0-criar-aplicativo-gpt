"use client"

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
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { formatDuration } from "@/lib/constants"
import {
  Loader2,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Timer,
  AlertTriangle,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Compute colors for charts in JS since CSS vars don't work directly in Recharts
const CHART_BLUE = "#3b5998"
const CHART_GREEN = "#22a06b"
const CHART_RED = "#d04040"
const CHART_AMBER = "#c08a30"
const CHART_TEAL = "#0d9488"

export function DashboardView() {
  const { data, error, isLoading } = useSWR("/api/dashboard", fetcher)

  if (isLoading) {
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Dashboard de Análise
          </h2>
          <p className="text-sm text-muted-foreground">
            Visão geral dos testes e paradas registradas
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard
            title="Total de Testes"
            value={String(data?.total_tests || 0)}
            icon={<ClipboardCheck className="h-4 w-4" />}
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
            title="Tempo Médio"
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
              <CardDescription>Top 10 tipos de parada registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {stopsByType.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponíveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    count: {
                      label: "Quantidade",
                      color: CHART_BLUE,
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stopsByType}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
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
                        formatter={(value: number) => [`${value}`, "Quantidade"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {stopsByType.map((_: unknown, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index < 3 ? CHART_RED : CHART_BLUE}
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
              <CardDescription>Distribuição e cumprimento por modelo</CardDescription>
            </CardHeader>
            <CardContent>
              {testsByModel.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponíveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    on_time: {
                      label: "No Tempo",
                      color: CHART_GREEN,
                    },
                    exceeded: {
                      label: "Excedeu",
                      color: CHART_RED,
                    },
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

          {/* Tempo médio por modelo */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Tempo Médio por Modelo</CardTitle>
              <CardDescription>
                Comparação entre tempo médio real e estipulado por modelo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testsByModel.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados disponíveis
                </p>
              ) : (
                <ChartContainer
                  config={{
                    avg_duration: {
                      label: "Tempo Médio Real",
                      color: CHART_TEAL,
                    },
                  }}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={testsByModel.map((t: { model: string; avg_duration: number }) => ({
                        ...t,
                        avg_duration: Math.round(t.avg_duration),
                      }))}
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
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
                        formatter={(value: number) => [
                          `${value} min`,
                          "Tempo Médio",
                        ]}
                      />
                      <Bar dataKey="avg_duration" radius={[4, 4, 0, 0]}>
                        {testsByModel.map(
                          (_: unknown, index: number) => (
                            <Cell key={`cell-${index}`} fill={CHART_TEAL} />
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

        {/* Tabela de testes recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testes Recentes</CardTitle>
            <CardDescription>Últimos 50 testes finalizados</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.recent_tests || data.recent_tests.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum teste finalizado ainda
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
                        actual_duration_minutes: number
                        stop_count: number
                        finished_at: string
                      }) => {
                        const withinTime =
                          test.actual_duration_minutes <=
                          test.expected_duration_minutes
                        return (
                          <TableRow key={test.id}>
                            <TableCell className="font-medium">
                              {test.work_number}
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
                              {formatDuration(test.actual_duration_minutes)}
                            </TableCell>
                            <TableCell>{test.stop_count}</TableCell>
                            <TableCell>
                              <Badge
                                variant={withinTime ? "default" : "destructive"}
                                className={
                                  withinTime
                                    ? "bg-[#22a06b] text-[#fff]"
                                    : ""
                                }
                              >
                                {withinTime ? "No Tempo" : "Excedeu"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(test.finished_at).toLocaleDateString(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
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
  variant?: "success" | "danger"
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        <p
          className={`text-2xl font-bold ${
            variant === "success"
              ? "text-[#22a06b]"
              : variant === "danger"
              ? "text-destructive"
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
