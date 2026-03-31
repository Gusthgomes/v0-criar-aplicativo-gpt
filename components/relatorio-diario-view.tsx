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
  date: string
  total_tests: number
  tests: Test[]
}

export function RelatorioDiarioView() {
  const [date, setDate] = useState("")
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedStops, setSelectedStops] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!date) {
      setError("Selecione uma data")
      return
    }

    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      let url = `/api/relatorio-diario?date=${date}`
      if (selectedModels.length > 0) url += `&models=${selectedModels.join(",")}`
      if (selectedStops.length > 0) url += `&stops=${selectedStops.join(",")}`
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

  function getStatusBadge(test: Test) {
    if (!test.finished_at) {
      return <Badge variant="outline">Em andamento</Badge>
    }
    if (test.actual_duration_minutes && test.actual_duration_minutes > test.expected_duration_minutes) {
      return <Badge variant="destructive">Excedeu</Badge>
    }
    return <Badge className="bg-green-600 hover:bg-green-700">No tempo</Badge>
  }

  function formatStops(stops: Stop[]) {
    if (stops.length === 0) return "-"
    return stops.map(s => {
      let text = s.stop_type
      if (s.sub_type) text += ` > ${s.sub_type}`
      return text
    }).join("; ")
  }

  function formatMaterialCodes(stops: Stop[]) {
    const codes = stops.filter(s => s.material_code).map(s => s.material_code)
    if (codes.length === 0) return "-"
    return codes.join(", ")
  }

  function formatObservations(stops: Stop[]) {
    const obs = stops.filter(s => s.observations).map(s => s.observations)
    if (obs.length === 0) return "-"
    return obs.join("; ")
  }

  function gerarRelatorioImpressao() {
    if (!data || data.tests.length === 0) return

    const reportWindow = window.open("", "_blank")
    if (!reportWindow) return

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("pt-BR")
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatorio Diario - ${formatDate(data.date)}</title>
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
          @media print { 
            .no-print { display: none; } 
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding: 8px 16px; font-size: 12px; cursor: pointer;">
            Imprimir Relatorio
          </button>
        </div>
        
        <div class="header">
          <h1>Relatorio Diario - ${formatDate(data.date)}</h1>
          <p>Gerado em ${new Date().toLocaleDateString("pt-BR")} as ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>

        <div class="summary">
          <strong>Total de testes:</strong> ${data.total_tests}
        </div>

        <table>
          <thead>
            <tr>
              <th>Obra</th>
              <th>Modelo</th>
              <th>Banca</th>
              <th>8ID</th>
              <th>Tempo Est.</th>
              <th>Tempo Real</th>
              <th>Status</th>
              <th>Paradas</th>
              <th>Cod. Material</th>
              <th>Observacoes</th>
              <th>Inicio</th>
            </tr>
          </thead>
          <tbody>
            ${data.tests.map(test => {
              const isFinished = !!test.finished_at
              const exceeded = isFinished && test.actual_duration_minutes && test.actual_duration_minutes > test.expected_duration_minutes
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
                  <td>${formatStops(test.stops)}</td>
                  <td>${formatMaterialCodes(test.stops)}</td>
                  <td>${formatObservations(test.stops)}</td>
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
          <h2 className="text-2xl font-bold text-foreground">Relatorio Diario</h2>
          <p className="text-sm text-muted-foreground">
            Consulte todas as obras testadas em uma data especifica
          </p>
        </div>

        {/* Filtro de Data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Selecionar Data
            </CardTitle>
            <CardDescription>
              Escolha a data para visualizar os testes realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="date" className="text-sm font-medium">
                  Data
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
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
              <div>
                <Label className="text-sm font-medium">
                  Paradas <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <MultiSelect
                  options={[...STOP_TYPES]}
                  selected={selectedStops}
                  onChange={setSelectedStops}
                  placeholder="Todas as paradas"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !date}
                  className="flex items-center gap-2 w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {data && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  Testes do dia {new Date(data.date).toLocaleDateString("pt-BR")}
                  {selectedModels.length > 0 && selectedModels.length < MODELS.length && ` - ${selectedModels.join(", ")}`}
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
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum teste encontrado nesta data
                </p>
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
                        <TableHead className="w-[200px]">Observacoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.tests.map((test) => (
                        <TableRow key={test.id} className="align-top">
                          <TableCell className="font-medium">
                            {test.work_number}
                          </TableCell>
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
