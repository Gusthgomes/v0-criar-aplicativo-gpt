"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { AppHeader } from "@/components/app-header"
import { toast } from "sonner"
import { MODELS, MODEL_DURATION_MINUTES, BENCHES, STOP_TYPES, STOP_SUBTYPES, STOPS_WITH_SUBTYPES, formatDuration } from "@/lib/constants"
import type { Model } from "@/lib/constants"
import { Search, Loader2, Pencil, Trash2, AlertTriangle, Clock, User, Wrench } from "lucide-react"

interface Stop {
  id: number
  stop_type: string
  sub_type: string | null
  material_code: string | null
  duration_minutes: number
  observations: string | null
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
  created_at: string
  finished_at: string | null
  is_complete: boolean
  stops: Stop[]
}

export function EditarObraView() {
  const [workNumber, setWorkNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tests, setTests] = useState<Test[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Estado para edição de teste
  const [editingTest, setEditingTest] = useState<Test | null>(null)
  const [editTestData, setEditTestData] = useState({
    employee_id: "",
    model: "",
    bench: "",
    expected_duration_minutes: 0,
    status: "" as "in_progress" | "paused" | "finished",
  })

  // Estado para edição de parada
  const [editingStop, setEditingStop] = useState<Stop | null>(null)
  const [editStopData, setEditStopData] = useState({
    stop_type: "",
    sub_type: "",
    material_code: "",
    duration_minutes: 0,
    observations: "",
  })

  // Estado para confirmação de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "test" | "stop", id: number, testId?: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSearch = async () => {
    if (!workNumber.trim()) {
      setError("Digite o número da obra")
      return
    }

    setIsLoading(true)
    setError(null)
    setTests(null)

    try {
      const response = await fetch(`/api/admin/obra/${workNumber}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar obra")
      }

      setTests(data.tests)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar obra")
    } finally {
      setIsLoading(false)
    }
  }

  const getTestStatus = (test: Test): "in_progress" | "paused" | "finished" => {
    if (test.finished_at) return "finished"
    if (test.is_complete === false) return "paused"
    return "in_progress"
  }

  const openEditTest = (test: Test) => {
    setEditingTest(test)
    setEditTestData({
      employee_id: test.employee_id,
      model: test.model,
      bench: test.bench.toString(),
      expected_duration_minutes: test.expected_duration_minutes,
      status: getTestStatus(test),
    })
  }

  const handleSaveTest = async () => {
    if (!editingTest) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/obra/${editingTest.work_number}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: editingTest.id,
          data: {
            employee_id: editTestData.employee_id,
            model: editTestData.model,
            bench: Number(editTestData.bench),
            expected_duration_minutes: editTestData.expected_duration_minutes,
            status: editTestData.status,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações")
      }

      toast.success("Teste atualizado com sucesso")
      setEditingTest(null)
      handleSearch() // Recarregar dados
    } catch {
      toast.error("Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const openEditStop = (stop: Stop) => {
    setEditingStop(stop)
    setEditStopData({
      stop_type: stop.stop_type,
      sub_type: stop.sub_type || "",
      material_code: stop.material_code || "",
      duration_minutes: stop.duration_minutes,
      observations: stop.observations || "",
    })
  }

  const handleSaveStop = async () => {
    if (!editingStop) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/stops/${editingStop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStopData),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações")
      }

      toast.success("Parada atualizada com sucesso")
      setEditingStop(null)
      handleSearch() // Recarregar dados
    } catch {
      toast.error("Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      let response

      if (deleteConfirm.type === "test") {
        response = await fetch(`/api/admin/obra/${workNumber}?testId=${deleteConfirm.id}`, {
          method: "DELETE",
        })
      } else {
        response = await fetch(`/api/admin/stops/${deleteConfirm.id}`, {
          method: "DELETE",
        })
      }

      if (!response.ok) {
        throw new Error("Erro ao excluir")
      }

      toast.success(deleteConfirm.type === "test" ? "Teste excluído com sucesso" : "Parada excluída com sucesso")
      setDeleteConfirm(null)
      handleSearch() // Recarregar dados
    } catch {
      toast.error("Erro ao excluir")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasSubtypes = (stopType: string) => STOPS_WITH_SUBTYPES.includes(stopType)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Editar Obra
            </CardTitle>
            <CardDescription>
              Busque uma obra pelo número para editar ou excluir seus dados e paradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Digite o número da obra"
                  value={workNumber}
                  onChange={(e) => setWorkNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {tests && tests.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">
              Encontrado(s) {tests.length} teste(s) para a obra {workNumber}
            </h2>

            <Accordion type="single" collapsible className="space-y-4">
              {tests.map((test, index) => (
                <AccordionItem key={test.id} value={`test-${test.id}`} className="border rounded-lg">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Teste #{index + 1}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(test.created_at).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(test.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${test.is_complete ? "bg-green-500/20 text-green-600" : "bg-yellow-500/20 text-yellow-600"}`}>
                          {test.is_complete ? "Finalizado" : "Em andamento"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditTest(test)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm({ type: "test", id: test.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">8ID</p>
                          <p className="font-medium">{test.employee_id}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Modelo</p>
                        <p className="font-medium">{test.model}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Banca</p>
                        <p className="font-medium">{test.bench}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Tempo Esperado</p>
                          <p className="font-medium">{formatDuration(test.expected_duration_minutes)}</p>
                        </div>
                      </div>
                    </div>

                    {test.stops.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Paradas ({test.stops.length})</h4>
                        <div className="space-y-2">
                          {test.stops.map((stop) => (
                            <div
                              key={stop.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stop.stop_type}</span>
                                  {stop.sub_type && (
                                    <span className="text-sm text-muted-foreground">
                                      ({stop.sub_type})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Duração: {stop.duration_minutes} min
                                  {stop.material_code && ` | Material: ${stop.material_code}`}
                                </div>
                                {stop.observations && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {stop.observations}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditStop(stop)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirm({ type: "stop", id: stop.id, testId: test.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {test.stops.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma parada registrada para este teste.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {tests && tests.length === 0 && (
          <Card className="mt-6">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum teste encontrado para a obra {workNumber}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog de edição de teste */}
      <Dialog open={!!editingTest} onOpenChange={() => setEditingTest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Teste</DialogTitle>
            <DialogDescription>
              Altere os dados do teste, incluindo o status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>8ID do Funcionário</Label>
              <Input
                value={editTestData.employee_id}
                onChange={(e) => setEditTestData({ ...editTestData, employee_id: e.target.value })}
                maxLength={8}
              />
            </div>

            <div>
              <Label>Modelo</Label>
              <Select
                value={editTestData.model}
                onValueChange={(value) => {
                  const duration = MODEL_DURATION_MINUTES[value as Model] || 0
                  setEditTestData({ ...editTestData, model: value, expected_duration_minutes: duration })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Banca</Label>
              <Select
                value={editTestData.bench}
                onValueChange={(value) => setEditTestData({ ...editTestData, bench: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENCHES.map((b) => (
                    <SelectItem key={b} value={b.toString()}>
                      Banca {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tempo Esperado (minutos)</Label>
              <Input
                type="number"
                value={editTestData.expected_duration_minutes}
                onChange={(e) => setEditTestData({ ...editTestData, expected_duration_minutes: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Status do Teste</Label>
              <Select
                value={editTestData.status}
                onValueChange={(value) => setEditTestData({ ...editTestData, status: value as "in_progress" | "paused" | "finished" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTest(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTest} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição de parada */}
      <Dialog open={!!editingStop} onOpenChange={() => setEditingStop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parada</DialogTitle>
            <DialogDescription>
              Altere os dados da parada registrada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Parada</Label>
              <Select
                value={editStopData.stop_type}
                onValueChange={(value) => setEditStopData({ ...editStopData, stop_type: value, sub_type: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasSubtypes(editStopData.stop_type) && (
              <div>
                <Label>Subtipo</Label>
                <Select
                  value={editStopData.sub_type}
                  onValueChange={(value) => setEditStopData({ ...editStopData, sub_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o subtipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {STOP_SUBTYPES[editStopData.stop_type]?.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Código do Material (opcional)</Label>
              <Input
                value={editStopData.material_code}
                onChange={(e) => setEditStopData({ ...editStopData, material_code: e.target.value })}
                placeholder="Ex: ABC123"
              />
            </div>

            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                value={editStopData.duration_minutes}
                onChange={(e) => setEditStopData({ ...editStopData, duration_minutes: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={editStopData.observations}
                onChange={(e) => setEditStopData({ ...editStopData, observations: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStop(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStop} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              {deleteConfirm?.type === "test"
                ? "Tem certeza que deseja excluir este teste? Esta ação excluirá também todas as paradas associadas e não pode ser desfeita."
                : "Tem certeza que deseja excluir esta parada? Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
