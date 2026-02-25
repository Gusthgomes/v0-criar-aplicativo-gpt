"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MODELS, MODEL_DURATION_MINUTES, BENCHES, formatDuration } from "@/lib/constants"
import type { Model } from "@/lib/constants"
import { Clock, Loader2 } from "lucide-react"

export function TestForm() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [workNumber, setWorkNumber] = useState("")
  const [model, setModel] = useState<string>("")
  const [bench, setBench] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedDuration = model
    ? MODEL_DURATION_MINUTES[model as Model]
    : null

  const now = new Date()
  const formattedDate = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!/^\d{8}$/.test(employeeId)) {
      setError("8ID deve ter exatamente 8 dígitos")
      return
    }
    if (!/^\d{3,6}$/.test(workNumber)) {
      setError("Número da obra deve ter de 3 a 6 dígitos")
      return
    }
    if (!model) {
      setError("Selecione um modelo")
      return
    }
    if (!bench) {
      setError("Selecione uma banca")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          work_number: workNumber,
          model,
          bench: Number(bench),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao criar teste")
      }

      const data = await res.json()
      router.push(`/test/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-lg border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-foreground">Iniciar Novo Teste</CardTitle>
        <CardDescription>
          Preencha os dados abaixo para iniciar o cronômetro de teste
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="employeeId" className="text-sm font-medium text-foreground">
              8ID
            </Label>
            <Input
              id="employeeId"
              placeholder="12345678"
              value={employeeId}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 8)
                setEmployeeId(v)
              }}
              maxLength={8}
              inputMode="numeric"
              required
            />
            <p className="text-xs text-muted-foreground">
              {employeeId.length}/8 dígitos
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="workNumber" className="text-sm font-medium text-foreground">
              Número da Obra
            </Label>
            <Input
              id="workNumber"
              placeholder="123456"
              value={workNumber}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6)
                setWorkNumber(v)
              }}
              maxLength={6}
              inputMode="numeric"
              required
            />
            <p className="text-xs text-muted-foreground">
              {workNumber.length}/6 dígitos (mínimo 3)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">Banca</Label>
              <Select value={bench} onValueChange={setBench}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BENCHES.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      Banca {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDuration !== null && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tempo de Teste: {formatDuration(selectedDuration)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Baseado no modelo {model}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Data</Label>
            <Input value={formattedDate} readOnly className="bg-muted text-muted-foreground" />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Iniciar Teste"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
