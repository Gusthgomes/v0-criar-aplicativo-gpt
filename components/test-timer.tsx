"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { formatTimer } from "@/lib/constants"

interface TestTimerProps {
  durationMinutes: number
  startTime: string
  isFinished: boolean
  initialElapsedSeconds?: number
  onElapsedChange?: (seconds: number) => void
}

export function TestTimer({
  durationMinutes,
  startTime,
  isFinished,
  initialElapsedSeconds = 0,
  onElapsedChange,
}: TestTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateTimer = useCallback(() => {
    const start = new Date(startTime).getTime()
    const now = Date.now()
    const elapsedSinceResume = Math.floor((now - start) / 1000)
    const totalElapsed = initialElapsedSeconds + elapsedSinceResume
    const remaining = durationMinutes * 60 - totalElapsed

    setRemainingSeconds(remaining)
    onElapsedChange?.(totalElapsed)
  }, [startTime, durationMinutes, initialElapsedSeconds, onElapsedChange])

  useEffect(() => {
    if (isFinished) return

    updateTimer()
    intervalRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isFinished, updateTimer])

  const isExceeded = remainingSeconds < 0
  const totalSeconds = durationMinutes * 60
  const progressPercent = Math.max(
    0,
    Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)
  )

  return (
    <div className="flex flex-col items-center gap-4">
      {initialElapsedSeconds > 0 && !isFinished && (
        <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-1.5">
          <p className="text-xs font-medium text-primary">
            Teste retomado - tempo anterior acumulado
          </p>
        </div>
      )}

      <div
        className={`flex items-center justify-center rounded-2xl px-8 py-6 transition-colors duration-300 ${
          isFinished
            ? "bg-muted"
            : isExceeded
            ? "bg-destructive/10 border-2 border-destructive/30 animate-pulse"
            : "bg-primary/5 border-2 border-primary/10"
        }`}
      >
        <span
          className={`font-mono text-6xl font-bold tabular-nums tracking-wider md:text-7xl ${
            isFinished
              ? "text-muted-foreground"
              : isExceeded
              ? "text-destructive"
              : "text-foreground"
          }`}
        >
          {formatTimer(remainingSeconds)}
        </span>
      </div>

      {isExceeded && !isFinished && (
        <p className="text-sm font-medium text-destructive">
          Tempo excedido! O teste ultrapassou o tempo estipulado.
        </p>
      )}

      {!isFinished && (
        <div className="w-full max-w-md">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isExceeded ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>{Math.round(progressPercent)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}
