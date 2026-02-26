"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Loader2, Play, Square } from "lucide-react"

interface StopFormProps {
  testId: number
  onStopAdded: () => void
}

export function StopForm({ testId, onStopAdded }: StopFormProps) {
  const [stopType, setStopType] = useState("")
  const [observations, setObservations] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null) // minutos a salvar
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // intervalo para atualizar a contagem visual
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // limpa o intervalo quando o componente desmonta
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleStart = () => {
    setError(null)
    setIsRunning(true)
    const now = Date.now()
    setStartTime(now)

    // inicia contagem a cada segundo
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - now) / 1000))
    }, 1000)
  }

  const handleStop = () => {
    if (!startTime) return

    // limpa intervalo
    if (intervalRef.current) clearInterval(intervalRef.current)

    const totalSec = Math.floor((Date.now() - startTime) / 1000)
    const totalMin = Math.floor(totalSec / 60) // arredonda para baixo
    setDurationMinutes(totalMin)
    setElapsedSeconds(totalSec)

    setIsRunning(false)
    setStartTime(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!stopType) {
      setError("Selecione o tipo de parada")
      return
    }

    // garante que o cronômetro tenha sido finalizado
    if (durationMinutes === null) {
      setError("Inicie e finalize o cronômetro antes de salvar")
      return
    }

    if (durationMinutes <= 0) {
      setError("O tempo de parada deve ser maior que 0")
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
          duration_minutes: durationMinutes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao registrar parada")
      }

      // limpa estado para uma nova inserção
      setStopType("")
      setObservations("")
      setDurationMinutes(null)
      setElapsedSeconds(0)
      onStopAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tipo de parada */}
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

      {/* Cronômetro */}
      {stopType && (
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            Cronômetro da Parada
          </Label>

          {/* Exibição do tempo */}
          <div className="text-lg font-mono">
            {formatTime(elapsedSeconds)}
          </div>

          {/* Botões de controle */}
          {!isRunning ? (
            <Button
              type="button"
              onClick={handleStart}
              disabled={isSubmitting}
              variant="default"
            >
              <Play className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStop}
              disabled={isSubmitting}
              variant="destructive"
            >
              <Square className="mr-2 h-4 w-4" />
              Parar
            </Button>
          )}
        </div>
      )}

      {/* Observações (opcional) */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-foreground">
          Observações <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          placeholder="Adicione detalhes sobre a parada..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={2}
        />
      </div>

      {/* Mensagem de erro */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Botão de enviar */}
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
