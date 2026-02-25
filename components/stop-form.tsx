"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STOP_TYPES } from "@/lib/constants"
import { Plus, Loader2 } from "lucide-react"

interface StopFormProps {
  testId: number
  onStopAdded: () => void
}

export function StopForm({ testId, onStopAdded }: StopFormProps) {
  const [stopType, setStopType] = useState("")
  const [observations, setObservations] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!stopType) {
      setError("Selecione o tipo de parada")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tests/${testId}/stops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stop_type: stopType,
          observations: observations.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao registrar parada")
      }

      setStopType("")
      setObservations("")
      onStopAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-foreground">
          Tipo de Parada
        </Label>
        <Select value={stopType} onValueChange={setStopType}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de parada" />
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

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-foreground">
          Observações <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          placeholder="Adicione detalhes sobre a parada..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" variant="outline" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Adicionar Parada
      </Button>
    </form>
  )
}
