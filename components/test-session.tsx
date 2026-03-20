"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TestTimer } from "@/components/test-timer"
import { StopForm } from "@/components/stop-form"
import { StopsList } from "@/components/stops-list"
import { ConnectionBanner } from "@/components/connection-banner"
import { formatDuration, STOPS_NOT_COUNTED_IN_TIME } from "@/lib/constants"
import { AppHeader } from "@/components/app-header"
import { useOfflineQueue, useTimerAutoSave } from "@/hooks/use-offline-queue"
import { Square, Loader2, User, Wrench, Hash, Timer, Moon } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TestSessionProps {
  testId: number
}

export function TestSession({ testId }: TestSessionProps) {
  const router = useRouter()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)
  const [isComplete, setIsComplete] = useState<"yes" | "no">("yes")
  const [dialogOpen, setDialogOpen] = useState(false)

  const { isOnline, isSyncing, queueCount, resilientFetch, processQueue } =
    useOfflineQueue()
  const { save: saveTimer, clear: clearTimer } = useTimerAutoSave(testId)

  const { data: test, error, mutate } = useSWR(
    `/api/tests/${testId}`,
    fetcher,
    {
      refreshInterval: isOnline ? 5000 : 0,
      revalidateOnFocus: false,
      shouldRetryOnError: isOnline,
    }
  )

  const handleElapsedChange = useCallback(
    (seconds: number) => {
      setElapsedSeconds(seconds)
      // Auto-save a cada 10 segundos
      if (seconds % 10 === 0) {
        saveTimer(seconds)
      }
    },
    [saveTimer]
  )

  // Tentar sincronizar quando voltar online
  useEffect(() => {
    if (isOnline && queueCount > 0) {
      processQueue().then(() => mutate())
    }
  }, [isOnline, queueCount, processQueue, mutate])

  async function handleFinish() {
    setIsFinishing(true)
    try {
      // Calcular tempo das paradas que não contam (ex: Refeição)
      const stopsNotCounted = test?.stops?.filter(
        (s: { stop_type: string }) => STOPS_NOT_COUNTED_IN_TIME.includes(s.stop_type as typeof STOPS_NOT_COUNTED_IN_TIME[number])
      ) || []
      const minutesNotCounted = stopsNotCounted.reduce(
        (sum: number, s: { duration_minutes: number | null }) => sum + (s.duration_minutes || 0),
        0
      )
      
      // Tempo total menos tempo de paradas que não contam
      const totalMinutes = Math.ceil(elapsedSeconds / 60)
      const actualMinutes = Math.max(0, totalMinutes - minutesNotCounted)
      const complete = isComplete === "yes"

      const result = await resilientFetch(
        `/api/tests/${testId}`,
        {
          method: "PATCH",
          body: {
            actual_duration_minutes: actualMinutes,
            is_complete: complete,
            elapsed_seconds_at_pause: complete ? null : elapsedSeconds,
          },
          description: complete
            ? `Encerrar teste #${testId}`
            : `Pausar teste #${testId}`,
        },
        () => mutate()
      )

      if (result.queued) {
        toast.info("Sem conexao. O encerramento sera sincronizado automaticamente quando a internet voltar.")
        clearTimer()
        setTimeout(() => {
          router.push(complete ? "/?finished=true" : "/?paused=true")
        }, 1500)
        return
      }

      if (!result.ok) {
        throw new Error("Erro ao encerrar teste")
      }

      clearTimer()
      router.push(complete ? "/?finished=true" : "/?paused=true")
    } catch {
      toast.error("Erro ao encerrar teste")
      setIsFinishing(false)
    }
  }

  if (error && isOnline) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-10 text-center">
              <p className="text-destructive">Teste nao encontrado</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!test || !test.id) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <ConnectionBanner
          isOnline={isOnline}
          isSyncing={isSyncing}
          queueCount={queueCount}
          onRetrySync={processQueue}
        />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  const isFinished = !!test.finished_at
  const initialElapsed = test.elapsed_seconds_at_pause ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <ConnectionBanner
        isOnline={isOnline}
        isSyncing={isSyncing}
        queueCount={queueCount}
        onRetrySync={processQueue}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {/* Info do teste */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                <User className="h-3 w-3" />
                {test.employee_id}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                <Hash className="h-3 w-3" />
                Obra {test.work_number}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                <Wrench className="h-3 w-3" />
                {test.model}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                Banca {test.bench}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                <Timer className="h-3 w-3" />
                {formatDuration(test.expected_duration_minutes)}
              </Badge>
              {isFinished && test.is_complete && (
                <Badge
                  className={`px-3 py-1 ${
                    test.actual_duration_minutes <= test.expected_duration_minutes
                      ? "bg-[oklch(0.60_0.18_155)] text-[oklch(0.985_0_0)]"
                      : "bg-destructive text-[oklch(0.985_0_0)]"
                  }`}
                >
                  {test.actual_duration_minutes <= test.expected_duration_minutes
                    ? "No Tempo"
                    : "Excedeu"}
                </Badge>
              )}
              {isFinished && !test.is_complete && (
                <Badge className="bg-amber-500 px-3 py-1 text-white">
                  <Moon className="mr-1 h-3 w-3" />
                  Pausado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cronometro */}
        <Card>
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-lg text-foreground">
              {isFinished && test.is_complete
                ? "Teste Encerrado"
                : isFinished && !test.is_complete
                ? "Teste Pausado"
                : "Cronometro do Teste"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <TestTimer
              durationMinutes={test.expected_duration_minutes}
              startTime={test.created_at}
              isFinished={isFinished}
              initialElapsedSeconds={initialElapsed}
              onElapsedChange={handleElapsedChange}
            />

            {!isFinished && (
              <div className="mt-6 flex justify-center">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="gap-2">
                      <Square className="h-4 w-4" />
                      Encerrar Teste
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Encerrar teste</DialogTitle>
                      <DialogDescription>
                        O teste foi completado ou precisa ser continuado em outro dia?
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-4">
                      <Label className="text-sm font-semibold text-foreground">
                        Teste completo?
                      </Label>
                      <RadioGroup
                        value={isComplete}
                        onValueChange={(val) => setIsComplete(val as "yes" | "no")}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="yes" id="complete-yes" className="mt-0.5" />
                          <Label htmlFor="complete-yes" className="cursor-pointer flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Sim - Teste finalizado
                            </p>
                            <p className="text-xs text-muted-foreground">
                              O teste da obra foi concluido. Nao podera ser retomado.
                            </p>
                          </Label>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                          <RadioGroupItem value="no" id="complete-no" className="mt-0.5" />
                          <Label htmlFor="complete-no" className="cursor-pointer flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Nao - Continuar amanha
                            </p>
                            <p className="text-xs text-muted-foreground">
                              O teste sera pausado e podera ser retomado de onde parou no proximo dia.
                            </p>
                          </Label>
                        </div>
                      </RadioGroup>

                      {isComplete === "no" && (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                          <Moon className="h-4 w-4 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700">
                            O cronometro sera pausado com o tempo atual acumulado. Voce podera retomar este teste pela tela inicial.
                          </p>
                        </div>
                      )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        disabled={isFinishing}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleFinish}
                        disabled={isFinishing}
                        variant={isComplete === "yes" ? "destructive" : "default"}
                      >
                        {isFinishing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isComplete === "yes" ? "Finalizar Teste" : "Pausar para Amanha"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {isFinished && test.is_complete && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Tempo real:{" "}
                  <span className="font-medium text-foreground">
                    {formatDuration(test.actual_duration_minutes)}
                  </span>
                  {" / "}
                  Tempo estipulado:{" "}
                  <span className="font-medium text-foreground">
                    {formatDuration(test.expected_duration_minutes)}
                  </span>
                </p>
              </div>
            )}

            {isFinished && !test.is_complete && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Teste pausado com{" "}
                  <span className="font-medium text-foreground">
                    {formatDuration(test.actual_duration_minutes)}
                  </span>{" "}
                  registrados. Retome pela tela inicial.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paradas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground">Registro de Paradas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {!isFinished && (
              <StopForm
                testId={testId}
                onStopAdded={() => mutate()}
                isOnline={isOnline}
              />
            )}
            <StopsList stops={test.stops || []} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
