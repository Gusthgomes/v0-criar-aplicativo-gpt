"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AppHeader } from "@/components/app-header"
import { formatDuration } from "@/lib/constants"
import {
  Search,
  Loader2,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Timer,
  AlertTriangle,
  Hash,
} from "lucide-react"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("not_found")
    return r.json()
  })

export function WorkSearchView() {
  const [inputValue, setInputValue] = useState("")
  const [searchTerm, setSearchTerm] = useState<string | null>(null)

  const { data, error, isLoading } = useSWR(
    searchTerm ? `/api/works/${searchTerm}` : null,
    fetcher
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (/^\d{3,6}$/.test(trimmed)) {
      setSearchTerm(trimmed)
    }
  }

  const isValidInput = /^\d{3,6}$/.test(inputValue.trim())

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground text-balance">
            Consulta por Obra
          </h2>
          <p className="text-sm text-muted-foreground">
            Digite o numero da obra para visualizar todas as informacoes
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Numero da obra (3 a 6 digitos)"
                  value={inputValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setInputValue(val)
                  }}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!isValidInput || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && searchTerm && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12">
              <Search className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">
                Nenhum teste encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                {"Nao foram encontrados testes para a obra "}
                <span className="font-mono font-bold">{searchTerm}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <SummaryCard
                title="Total de Testes"
                value={String(data.summary.total_tests)}
                icon={<ClipboardCheck className="h-4 w-4" />}
              />
              <SummaryCard
                title="No Tempo"
                value={`${data.summary.on_time_percentage}%`}
                description={`${data.summary.on_time} de ${data.summary.finished_tests}`}
                icon={<TrendingUp className="h-4 w-4" />}
                variant="success"
              />
              <SummaryCard
                title="Excederam"
                value={String(data.summary.exceeded)}
                icon={<TrendingDown className="h-4 w-4" />}
                variant="danger"
              />
              <SummaryCard
                title="Tempo Medio"
                value={
                  data.summary.avg_duration
                    ? formatDuration(data.summary.avg_duration)
                    : "N/A"
                }
                icon={<Timer className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                title="Total de Paradas"
                value={String(data.summary.total_stops)}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <SummaryCard
                title="Paradas/Teste"
                value={String(data.summary.avg_stops_per_test)}
                icon={<Hash className="h-4 w-4" />}
              />
              <Card>
                <CardContent className="flex flex-col gap-2 py-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Paradas Mais Comuns
                  </p>
                  {data.top_stop_types.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma parada</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {data.top_stop_types
                        .slice(0, 5)
                        .map(
                          (
                            s: { stop_type: string; count: number },
                            i: number
                          ) => (
                            <Badge
                              key={s.stop_type}
                              variant={i < 2 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {s.stop_type} ({s.count})
                            </Badge>
                          )
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Test Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Historico de Testes - Obra {data.work_number}
                </CardTitle>
                <CardDescription>
                  {data.tests.length} teste(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {data.tests.map(
                    (test: {
                      id: number
                      employee_id: string
                      model: string
                      bench: number
                      expected_duration_minutes: number
                      actual_duration_minutes: number | null
                      finished_at: string | null
                      created_at: string
                      stop_count: number
                      stops: {
                        id: number
                        stop_type: string
                        observations: string | null
                        created_at: string
                      }[]
                    }) => {
                      const isFinished = !!test.finished_at
                      const withinTime =
                        isFinished &&
                        test.actual_duration_minutes !== null &&
                        test.actual_duration_minutes <=
                          test.expected_duration_minutes

                      return (
                        <AccordionItem
                          key={test.id}
                          value={String(test.id)}
                        >
                          <AccordionTrigger className="text-sm hover:no-underline">
                            <div className="flex flex-1 items-center gap-3 pr-3">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{test.id}
                              </span>
                              <Badge variant="outline">{test.model}</Badge>
                              <span className="hidden text-xs text-muted-foreground sm:inline">
                                Banca {test.bench}
                              </span>
                              <span className="hidden text-xs text-muted-foreground sm:inline">
                                8ID: {test.employee_id}
                              </span>
                              <div className="ml-auto flex items-center gap-2">
                                {test.stop_count > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {test.stop_count} parada(s)
                                  </Badge>
                                )}
                                {isFinished ? (
                                  <Badge
                                    variant={
                                      withinTime ? "default" : "destructive"
                                    }
                                    className={
                                      withinTime
                                        ? "bg-[#22a06b] text-[#fff]"
                                        : ""
                                    }
                                  >
                                    {withinTime ? "No Tempo" : "Excedeu"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Em andamento</Badge>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-col gap-4 pl-2">
                              {/* Test info */}
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Modelo
                                  </p>
                                  <p className="font-medium">{test.model}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Banca
                                  </p>
                                  <p className="font-medium">{test.bench}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    8ID
                                  </p>
                                  <p className="font-mono font-medium">
                                    {test.employee_id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Data
                                  </p>
                                  <p className="font-medium">
                                    {new Date(
                                      test.created_at
                                    ).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Tempo Estipulado
                                  </p>
                                  <p className="font-medium">
                                    {formatDuration(
                                      test.expected_duration_minutes
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Tempo Real
                                  </p>
                                  <p className="font-medium">
                                    {test.actual_duration_minutes !== null
                                      ? formatDuration(
                                          test.actual_duration_minutes
                                        )
                                      : "Em andamento"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Paradas
                                  </p>
                                  <p className="font-medium">
                                    {test.stop_count}
                                  </p>
                                </div>
                                {test.finished_at && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Finalizado em
                                    </p>
                                    <p className="font-medium">
                                      {new Date(
                                        test.finished_at
                                      ).toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Stops table */}
                              {test.stops.length > 0 && (
                                <div>
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Paradas registradas
                                  </p>
                                  <div className="overflow-x-auto rounded-md border border-border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">
                                            Tipo
                                          </TableHead>
                                          <TableHead className="text-xs">
                                            Observacoes
                                          </TableHead>
                                          <TableHead className="text-xs">
                                            Horario
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {test.stops.map(
                                          (stop: {
                                            id: number
                                            stop_type: string
                                            observations: string | null
                                            created_at: string
                                          }) => (
                                            <TableRow key={stop.id}>
                                              <TableCell className="text-xs font-medium">
                                                {stop.stop_type}
                                              </TableCell>
                                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                                {stop.observations || "-"}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                {new Date(
                                                  stop.created_at
                                                ).toLocaleTimeString("pt-BR", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })}
                                              </TableCell>
                                            </TableRow>
                                          )
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    }
                  )}
                </Accordion>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
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
