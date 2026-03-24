"use client"

import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AppHeader } from "@/components/app-header"
import { formatDuration } from "@/lib/constants"
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Factory,
  Clock,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function StopDetailView() {
  const searchParams = useSearchParams()
  const stopType = searchParams.get("type") || ""
  const dateFrom = searchParams.get("date_from") || ""
  const dateTo = searchParams.get("date_to") || ""
  const bench = searchParams.get("bench") || ""
  const models = searchParams.get("models") || ""
  const employeeId = searchParams.get("employee_id") || ""

  // Construir URL com todos os filtros
  const apiUrl = stopType ? (() => {
    const params = new URLSearchParams()
    params.set("type", stopType)
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", dateTo)
    if (bench) params.set("bench", bench)
    if (models) params.set("models", models)
    if (employeeId) params.set("employee_id", employeeId)
    return `/api/stops/by-type?${params.toString()}`
  })() : null

  const { data, error, isLoading } = useSWR(apiUrl, fetcher)

  // Descrição dos filtros aplicados
  const filterDescriptions: string[] = []
  if (dateFrom && dateTo) {
    filterDescriptions.push(`Período: ${new Date(dateFrom).toLocaleDateString("pt-BR")} a ${new Date(dateTo).toLocaleDateString("pt-BR")}`)
  } else if (dateFrom) {
    filterDescriptions.push(`A partir de: ${new Date(dateFrom).toLocaleDateString("pt-BR")}`)
  } else if (dateTo) {
    filterDescriptions.push(`Até: ${new Date(dateTo).toLocaleDateString("pt-BR")}`)
  }
  if (models) filterDescriptions.push(`Modelos: ${models}`)
  if (bench) filterDescriptions.push(`Banca: ${bench}`)
  if (employeeId) filterDescriptions.push(`8ID: ${employeeId}`)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {stopType || "Carregando..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filterDescriptions.length > 0 
                  ? `Filtros aplicados: ${filterDescriptions.join(" | ")}`
                  : "Todas as obras que tiveram essa parada"}
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center text-destructive">
              Erro ao buscar dados. Tente novamente.
            </CardContent>
          </Card>
        )}

        {data && !data.error && (
          <>
            {/* KPIs */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Factory className="h-4 w-4" />
                    <span className="text-xs font-medium">Obras Afetadas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.total_works}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Total de Ocorrencias
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.total_occurrences}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Tempo Total
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatDuration(data.total_duration || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Media por Obra
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.total_works > 0
                      ? (data.total_occurrences / data.total_works).toFixed(1)
                      : "0"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de obras */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Obras com parada &quot;{data.stop_type}&quot;
                </CardTitle>
                <CardDescription>
                  {data.total_works} obras encontradas com {data.total_occurrences}{" "}
                  ocorrencias no total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.works.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma obra encontrada
                  </p>
                ) : (
                  <Accordion 
                    type="multiple" 
                    className="w-full"
                    defaultValue={data.works.map((w: { work_number: string }) => w.work_number)}
                  >
                    {data.works.map(
                      (work: {
                        work_number: string
                        total_occurrences: number
                        tests: {
                          test_id: number
                          model: string
                          employee_id: string
                          bench: number
                          expected_duration_minutes: number
                          actual_duration_minutes: number | null
                          finished_at: string | null
                          is_complete: boolean | null
                          created_at: string
                          stops: {
                            stop_id: number
                            duration_minutes: number | null
                            observations: string | null
                            created_at: string
                          }[]
                        }[]
                      }) => (
                        <AccordionItem
                          key={work.work_number}
                          value={work.work_number}
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-1 items-center justify-between pr-4">
                              <div className="flex items-center gap-3">
                                <Link
                                  href={`/consulta?obra=${work.work_number}`}
                                  className="font-semibold text-primary underline-offset-4 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Obra {work.work_number}
                                </Link>
                                <Badge variant="secondary">
                                  {work.total_occurrences}{" "}
                                  {work.total_occurrences === 1
                                    ? "ocorrencia"
                                    : "ocorrencias"}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {work.tests.length}{" "}
                                {work.tests.length === 1 ? "teste" : "testes"}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pl-2">
                              {work.tests.map((test) => {
                                const isFinished = !!test.finished_at
                                const withinTime =
                                  isFinished &&
                                  (test.actual_duration_minutes ?? 0) <=
                                    test.expected_duration_minutes

                                return (
                                  <Card key={test.test_id} className="border">
                                    <CardContent className="py-4">
                                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="outline">
                                          {test.model}
                                        </Badge>
                                        <Badge variant="outline">
                                          Banca {test.bench}
                                        </Badge>
                                        <Badge variant="outline">
                                          8ID: {test.employee_id}
                                        </Badge>
                                        {isFinished ? (
                                          <Badge
                                            variant={
                                              withinTime
                                                ? "default"
                                                : "destructive"
                                            }
                                            className={
                                              withinTime
                                                ? "bg-[#22a06b] text-white"
                                                : ""
                                            }
                                          >
                                            {withinTime
                                              ? "No Tempo"
                                              : "Excedeu"}
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="bg-amber-100 text-amber-700"
                                          >
                                            {test.is_complete === false
                                              ? "Pausado"
                                              : "Em Andamento"}
                                          </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          Estipulado:{" "}
                                          {formatDuration(
                                            test.expected_duration_minutes
                                          )}
                                          {test.actual_duration_minutes != null &&
                                            ` | Real: ${formatDuration(test.actual_duration_minutes)}`}
                                        </span>
                                      </div>

                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs">
                                              Duracao
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
                                          {test.stops.map((stop) => (
                                            <TableRow key={stop.stop_id}>
                                              <TableCell className="text-xs font-medium">
                                                {stop.duration_minutes
                                                  ? formatDuration(
                                                      stop.duration_minutes
                                                    )
                                                  : "-"}
                                              </TableCell>
                                              <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
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
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    )}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {data?.error && (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center text-destructive">
              {data.error}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
