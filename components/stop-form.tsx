"use client"

import { useState, useEffect, useRef } from "react"
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
import { Card, CardContent } from "@/components/ui/card"
import { STOP_TYPES, STOP_SUBTYPES } from "@/lib/constants"
import { useOfflineQueue } from "@/hooks/use-offline-queue"
import { Plus, Loader2, Play, Square, X, Clock, WifiOff } from "lucide-react"
import { toast } from "sonner"

interface StopFormProps {
  testId: number
  onStopAdded: () => void
  isOnline?: boolean
}

type Phase = "idle" | "timing" | "classify"

export function StopForm({ testId, onStopAdded, isOnline = true }: StopFormProps) {
  const [phase, setPhase] = useState<Phase>("idle")

  // cronometro
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalSeconds, setFinalSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // classificacao
  const [stopType, setStopType] = useState("")
  const [subType, setSubType] = useState("")
  const [observations, setObservations] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verifica se o tipo selecionado tem subtipos
  const hasSubtypes = stopType && stopType in STOP_SUBTYPES
  const availableSubtypes = hasSubtypes ? STOP_SUBTYPES[stopType] : []

  const { resilientFetch } = useOfflineQueue()

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

  const handleStartTimer = () => {
    setError(null)
    setPhase("timing")
    const now = Date.now()
    setStartTime(now)
    setElapsedSeconds(0)

    intervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - now) / 1000))
    }, 1000)
  }

  const handleStopTimer = () => {
    if (!startTime) return
    if (intervalRef.current) clearInterval(intervalRef.current)

    const totalSec = Math.floor((Date.now() - startTime) / 1000)
    setFinalSeconds(totalSec)
    setElapsedSeconds(totalSec)
    setStartTime(null)
    setPhase("classify")
  }

  const handleCancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPhase("idle")
    setStartTime(null)
    setElapsedSeconds(0)
    setFinalSeconds(0)
    setStopType("")
    setObservations("")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!stopType) {
      setError("Selecione o tipo de parada")
      return
    }

    if (hasSubtypes && !subType) {
      setError("Selecione o subtipo da parada")
      return
    }

    const durationMinutes = Math.max(1, Math.ceil(finalSeconds / 60))

    setIsSubmitting(true)
    try {
      const result = await resilientFetch(
        `/api/tests/${testId}/stops`,
        {
          method: "POST",
          body: {
            stop_type: stopType,
            sub_type: subType || null,
            observations: observations.trim() || null,
            duration_minutes: durationMinutes,
          },
          description: `Parada: ${stopType}${subType ? ` > ${subType}` : ""} (${durationMinutes}min)`,
        },
        () => onStopAdded()
      )

      if (result.queued) {
        toast.info("Parada salva localmente. Sera sincronizada quando a conexao voltar.", {
          icon: <WifiOff className="h-4 w-4" />,
        })
      }

      if (!result.ok && !result.queued) {
        const errData = result.data as { error?: string }
        throw new Error(errData?.error || "Erro ao registrar parada")
      }

      // Limpa tudo e volta ao idle
      setPhase("idle")
      setStopType("")
      setSubType("")
      setObservations("")
      setFinalSeconds(0)
      setElapsedSeconds(0)

      if (!result.queued) {
        onStopAdded()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setIsSubmitting(false)
    }
  }

  // FASE 1: Idle
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-sm text-muted-foreground text-center">
          Para registrar uma parada, inicie o cronometro primeiro.
          Depois selecione o motivo.
        </p>
        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5">
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              Offline - paradas serao salvas localmente
            </span>
          </div>
        )}
        <Button
          type="button"
          onClick={handleStartTimer}
          size="lg"
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Iniciar Parada
        </Button>
      </div>
    )
  }

  // FASE 2: Timing
  if (phase === "timing") {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
            </span>
            <p className="text-sm font-medium text-amber-700">
              Parada em andamento
            </p>
            {!isOnline && (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>

          <div className="font-mono text-4xl font-bold tracking-wider text-foreground">
            {formatTime(elapsedSeconds)}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleStopTimer}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Parar e Classificar
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // FASE 3: Classify
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Classifique a parada
          </p>
          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatTime(finalSeconds)}
            </span>
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5">
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              Offline - a parada sera salva localmente e sincronizada depois
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Tipo de Parada
            </Label>
            <Select 
              value={stopType} 
              onValueChange={(value) => {
                setStopType(value)
                setSubType("") // Limpa subtipo ao mudar tipo
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo da parada" />
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

          {hasSubtypes && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">
                Detalhamento
              </Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o detalhamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubtypes.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Observacoes{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Adicione detalhes sobre a parada..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Salvar Parada
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
