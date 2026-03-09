"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDuration } from "@/lib/constants"
import { Play, Moon, Loader2, Hash, Wrench, User, Timer } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function PendingTests() {
  const router = useRouter()
  const { data: tests, isLoading } = useSWR("/api/tests/pending", fetcher, {
    refreshInterval: 30000,
  })
  const [resumingId, setResumingId] = useState<number | null>(null)

  async function handleResume(testId: number) {
    setResumingId(testId)
    console.log("[v0] Resuming test:", testId)
    try {
      const res = await fetch(`/api/tests/${testId}/resume`, {
        method: "POST",
      })
      console.log("[v0] Resume response status:", res.status)

      const data = await res.json()
      console.log("[v0] Resume response data:", data)

      if (!res.ok) {
        throw new Error(data.error || "Erro ao retomar teste")
      }

      console.log("[v0] Redirecting to /test/" + testId)
      router.push(`/test/${testId}`)
    } catch (err) {
      console.error("[v0] Error resuming test:", err)
      setResumingId(null)
    }
  }

  if (isLoading || !tests || tests.length === 0) {
    return null
  }

  return (
    <Card className="w-full max-w-lg border-amber-500/30 bg-amber-500/5 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg text-foreground">
            Testes Pendentes
          </CardTitle>
        </div>
        <CardDescription>
          Testes pausados que podem ser retomados de onde pararam
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tests.map(
          (test: {
            id: number
            employee_id: string
            work_number: string
            model: string
            bench: number
            expected_duration_minutes: number
            actual_duration_minutes: number | null
            elapsed_seconds_at_pause: number | null
            paused_at: string
            stop_count: number
          }) => (
            <div
              key={test.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                    <Hash className="h-2.5 w-2.5" />
                    {test.work_number}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                    <Wrench className="h-2.5 w-2.5" />
                    {test.model}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                    <User className="h-2.5 w-2.5" />
                    {test.employee_id}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                    Banca {test.bench}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {test.actual_duration_minutes
                      ? formatDuration(test.actual_duration_minutes)
                      : "0min"}{" "}
                    / {formatDuration(test.expected_duration_minutes)}
                  </span>
                  <span>
                    {test.stop_count} parada{test.stop_count !== 1 ? "s" : ""}
                  </span>
                  <span>
                    Pausado em{" "}
                    {new Date(test.paused_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleResume(test.id)}
                disabled={resumingId === test.id}
                className="shrink-0 gap-1.5"
              >
                {resumingId === test.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Continuar
              </Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
