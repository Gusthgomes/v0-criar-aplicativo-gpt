"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TestTimer } from "@/components/test-timer"
import { StopForm } from "@/components/stop-form"
import { StopsList } from "@/components/stops-list"
import { formatDuration } from "@/lib/constants"
import { AppHeader } from "@/components/app-header"
import { Square, Loader2, User, Wrench, Hash, Timer } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TestSessionProps {
  testId: number
}

export function TestSession({ testId }: TestSessionProps) {
  const router = useRouter()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isFinishing, setIsFinishing] = useState(false)

  const { data: test, error, mutate } = useSWR(
    `/api/tests/${testId}`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const handleElapsedChange = useCallback((seconds: number) => {
    setElapsedSeconds(seconds)
  }, [])

  async function handleFinish() {
    setIsFinishing(true)
    try {
      const actualMinutes = Math.ceil(elapsedSeconds / 60)

      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_duration_minutes: actualMinutes,
        }),
      })

      if (!res.ok) {
        throw new Error("Erro ao encerrar teste")
      }

      router.push("/?finished=true")
    } catch {
      setIsFinishing(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-10 text-center">
              <p className="text-destructive">Teste não encontrado</p>
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
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    )
  }

  const isFinished = !!test.finished_at

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
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
              {isFinished && (
                <Badge
                  className={`px-3 py-1 ${test.actual_duration_minutes <= test.expected_duration_minutes
                      ? "bg-[oklch(0.60_0.18_155)] text-[oklch(0.985_0_0)]"
                      : "bg-destructive text-[oklch(0.985_0_0)]"
                    }`}
                >
                  {test.actual_duration_minutes <= test.expected_duration_minutes
                    ? "No Tempo"
                    : "Excedeu"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cronômetro */}
        <Card>
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-lg text-foreground">
              {isFinished ? "Teste Encerrado" : "Cronômetro do Teste"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <TestTimer
              durationMinutes={test.expected_duration_minutes}
              startTime={test.created_at}
              isFinished={isFinished}
              onElapsedChange={handleElapsedChange}
            />

            {!isFinished && (
              <div className="mt-6 flex justify-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="gap-2">
                      <Square className="h-4 w-4" />
                      Encerrar Teste
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Encerrar teste?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja encerrar este teste? O tempo real será registrado e esta ação não poderá ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleFinish}
                        disabled={isFinishing}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        {isFinishing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {isFinished && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Tempo real: <span className="font-medium text-foreground">{formatDuration(test.actual_duration_minutes)}</span>
                  {" / "}
                  Tempo estipulado: <span className="font-medium text-foreground">{formatDuration(test.expected_duration_minutes)}</span>
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
              <StopForm testId={testId} onStopAdded={() => mutate()} />
            )}
            <StopsList stops={test.stops || []} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
