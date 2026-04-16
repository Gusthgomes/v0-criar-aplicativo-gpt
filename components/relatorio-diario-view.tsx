"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, FileText, Calendar } from "lucide-react"
import { formatDuration, MODELS, STOP_TYPES } from "@/lib/constants"
import { MultiSelect } from "@/components/ui/multi-select"
// ✅ ADICIONE APENAS ESTAS LINHAS
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'


interface Stop {
  id: number
  test_id: number
  stop_type: string
  sub_type: string | null
  material_code: string | null
  observations: string | null
  duration_minutes: number | null
  created_at: string
}

interface Test {
  id: number
  work_number: string
  model: string
  bench: number
  employee_id: string
  expected_duration_minutes: number
  actual_duration_minutes: number | null
  finished_at: string | null
  is_complete: boolean | null
  created_at: string
  stops: Stop[]
}

interface ReportData {
  date_from: string
  date_to?: string
  total_tests: number
  tests: Test[]
}

export function RelatorioDiarioView() {

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedStops, setSelectedStops] = useState<string[]>([]) // ✅ MANTIDO filtro paradas

  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    // Validação: intervalo obrigatório
    if (!dateFrom) {
      setError("Selecione pelo menos a data inicial (De)")
      return
    }

    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      let url = `/api/relatorio-diario?date_from=${dateFrom}`

      if (dateTo) {
        url += `&date_to=${dateTo}`
      }

      if (selectedModels.length > 0) {
        url += `&models=${selectedModels.join(",")}`
      }

      // ✅ FILTRO DE PARADAS INCLUÍDO
      if (selectedStops.length > 0) {
        url += `&stops=${selectedStops.join(",")}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao buscar dados")
      }
      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || "Erro ao buscar dados. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  function getStatusBadge(test: Test) {
    if (!test.finished_at) {
      return <Badge variant="outline">Em andamento</Badge>
    }
    if (test.actual_duration_minutes && test.actual_duration_minutes > test.expected_duration_minutes) {
      return <Badge variant="destructive">Excedeu</Badge>
    }
    return <Badge className="bg-green-600 hover:bg-green-700">No tempo</Badge>
  }

  // Título dinâmico do período
  function getPeriodTitle() {
    if (data) {
      if (data.date_to) {
        return `${new Date(data.date_from).toLocaleDateString("pt-BR")} até ${new Date(data.date_to).toLocaleDateString("pt-BR")}`
      }
      return `a partir de ${new Date(data.date_from).toLocaleDateString("pt-BR")}`
    }
    return dateFrom ? `a partir de ${new Date(dateFrom).toLocaleDateString("pt-BR")}` : ""
  }

  function gerarRelatorioImpressao() {
    if (!data || data.tests.length === 0) return

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR")
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    const periodTitle = getPeriodTitle()

    const reportWindow = window.open("", "_blank")
    if (!reportWindow) return

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${periodTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
          h1 { font-size: 16px; margin-bottom: 5px; }
          .header { margin-bottom: 15px; }
          .header p { color: #666; font-size: 10px; }
          .summary { margin-bottom: 15px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
          th { background: #f5f5f5; font-size: 9px; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
          .badge-success { background: #22a06b; color: white; }
          .badge-danger { background: #dc2626; color: white; }
          .badge-outline { border: 1px solid #ccc; }
          .no-print { margin-bottom: 15px; }
          @media print { .no-print { display: none; } body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding: 8px 16px; font-size: 12px; cursor: pointer;">
            Imprimir Relatório
          </button>
        </div>
        
        <div class="header">
          <h1>Relatório Diário - ${periodTitle}</h1>
          <p>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>

        <div class="summary">
          <strong>Total de testes:</strong> ${data.total_tests}
        </div>

        <table>
          <thead>
            <tr>
              <th>Obra</th><th>Modelo</th><th>Banca</th><th>8ID</th>
              <th>Tempo Est.</th><th>Tempo Real</th><th>Status</th>
              <th>Paradas</th><th>Cod. Material</th><th>Observações</th><th>Início</th>
            </tr>
          </thead>
          <tbody>
            ${data.tests.map(test => {
      const isFinished = !!test.finished_at
      const exceeded = isFinished && test.actual_duration_minutes! > test.expected_duration_minutes
      const statusBadge = !isFinished
        ? '<span class="badge badge-outline">Em andamento</span>'
        : exceeded
          ? '<span class="badge badge-danger">Excedeu</span>'
          : '<span class="badge badge-success">No tempo</span>'

      return `
                <tr>
                  <td><strong>${test.work_number}</strong></td>
                  <td>${test.model}</td>
                  <td>${test.bench}</td>
                  <td>${test.employee_id}</td>
                  <td>${formatDuration(test.expected_duration_minutes)}</td>
                  <td>${test.actual_duration_minutes ? formatDuration(test.actual_duration_minutes) : "-"}</td>
                  <td>${statusBadge}</td>
                  <td>${test.stops.map(s => s.stop_type + (s.sub_type ? ' > ' + s.sub_type : '')).join('; ')}</td>
                  <td>${test.stops.filter(s => s.material_code).map(s => s.material_code).join(', ') || '-'}</td>
                  <td>${test.stops.filter(s => s.observations).map(s => s.observations).join('; ') || '-'}</td>
                  <td>${formatTime(test.created_at)}</td>
                </tr>
              `
    }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `

    reportWindow.document.write(html)
    reportWindow.document.close()
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Relatório Diário</h2>
          <p className="text-sm text-muted-foreground">
            Filtre obras testadas por **intervalo de datas** e **tipos de parada**
          </p>
        </div>

        {/* FILTROS SIMPLIFICADOS - SEM DATA ÚNICA */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filtrar Período e Paradas
            </CardTitle>
            <CardDescription>
              Selecione intervalo de datas (De/Até) e tipos de parada específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Data De (obrigatório) */}
              <div>
                <Label htmlFor="dateFrom" className="text-sm font-medium">
                  De<span className="text-xs text-muted-foreground">(obrigatório)</span>
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Data Até (opcional) */}
              <div>
                <Label htmlFor="dateTo" className="text-sm font-medium">
                  Até
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Modelos */}
              <div>
                <Label className="text-sm font-medium">
                  Modelos <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <MultiSelect
                  options={[...MODELS]}
                  selected={selectedModels}
                  onChange={setSelectedModels}
                  placeholder="Todos os modelos"
                  className="mt-1"
                />
              </div>

              {/* ✅ PARADAS (mantido e destacado) */}
              <div>
                <Label className="text-sm font-medium">
                  Tipos de Paradas<span className="text-muted-foreground font-normal">(filtrar paradas)</span>
                </Label>
                <MultiSelect
                  options={[...STOP_TYPES]}
                  selected={selectedStops}
                  onChange={setSelectedStops}
                  placeholder="Todas as paradas"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Botão Buscar em linha separada */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !dateFrom}
                className="flex items-center gap-2 px-8 h-10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Buscar Testes
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* RESULTADOS */}
        {data && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  Testes de <span className="font-normal">{getPeriodTitle()}</span>
                  {selectedModels.length > 0 && (
                    <span className="text-muted-foreground ml-2">• {selectedModels.join(", ")}</span>
                  )}
                  {selectedStops.length > 0 && (
                    <span className="text-destructive ml-2">• Paradas: {selectedStops.join(", ")}</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {data.total_tests} teste(s) encontrado(s)
                </CardDescription>
              </div>
              {data.total_tests > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={gerarRelatorioImpressao}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.total_tests === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhum teste encontrado no período
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tente ajustar as datas ou remover filtros de parada/modelo
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1000px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Obra</TableHead>
                        <TableHead className="w-[60px]">Modelo</TableHead>
                        <TableHead className="w-[50px]">Banca</TableHead>
                        <TableHead className="w-[80px]">8ID</TableHead>
                        <TableHead className="w-[80px]">Tempo</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[200px]">Paradas</TableHead>
                        <TableHead className="w-[120px]">Cod. Material</TableHead>
                        <TableHead className="w-[200px]">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tests.map((test) => (
                        <TableRow key={test.id} className="align-top">
                          <TableCell className="font-medium">{test.work_number}</TableCell>
                          <TableCell>{test.model}</TableCell>
                          <TableCell>{test.bench}</TableCell>
                          <TableCell>{test.employee_id}</TableCell>
                          <TableCell>
                            <div className="text-xs whitespace-nowrap">
                              <div>Est: {formatDuration(test.expected_duration_minutes)}</div>
                              {test.actual_duration_minutes && (
                                <div>Real: {formatDuration(test.actual_duration_minutes)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(test)}</TableCell>
                          <TableCell className="w-[200px]">
                            <div className="text-xs space-y-1">
                              {test.stops.length > 0 ? test.stops.map((stop, idx) => (
                                <div key={idx} className="bg-muted/50 rounded px-1.5 py-0.5">
                                  {stop.stop_type}{stop.sub_type ? ` > ${stop.sub_type}` : ""}
                                </div>
                              )) : <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <div className="text-xs space-y-1">
                              {test.stops.filter(s => s.material_code).length > 0
                                ? test.stops.filter(s => s.material_code).map((stop, idx) => (
                                  <div key={idx} className="font-mono">{stop.material_code}</div>
                                ))
                                : <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="w-[200px]">
                            <div className="text-xs space-y-1">
                              {test.stops.filter(s => s.observations).length > 0
                                ? test.stops.filter(s => s.observations).map((stop, idx) => (
                                  <div key={idx} className="text-muted-foreground">{stop.observations}</div>
                                ))
                                : <span className="text-muted-foreground">-</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
