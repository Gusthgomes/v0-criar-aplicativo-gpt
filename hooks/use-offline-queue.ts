"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface QueuedRequest {
  id: string
  url: string
  method: string
  body: string
  timestamp: number
  description: string
}

const STORAGE_KEY = "gpt-v01-offline-queue"

function loadQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // storage full or unavailable
  }
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true)
  const [queue, setQueue] = useState<QueuedRequest[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const syncingRef = useRef(false)
  const onSyncCallbacksRef = useRef<Map<string, () => void>>(new Map())

  // Inicializar
  useEffect(() => {
    setIsOnline(navigator.onLine)
    setQueue(loadQueue())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Processar fila quando voltar online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncingRef.current) {
      processQueue()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const processQueue = useCallback(async () => {
    const currentQueue = loadQueue()
    if (currentQueue.length === 0 || syncingRef.current) return

    syncingRef.current = true
    setIsSyncing(true)

    const remaining: QueuedRequest[] = []

    for (const item of currentQueue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: item.body,
        })

        if (res.ok) {
          // Chamar callback de sucesso se existir
          const cb = onSyncCallbacksRef.current.get(item.id)
          if (cb) {
            cb()
            onSyncCallbacksRef.current.delete(item.id)
          }
        } else {
          remaining.push(item)
        }
      } catch {
        remaining.push(item)
      }
    }

    saveQueue(remaining)
    setQueue(remaining)
    syncingRef.current = false
    setIsSyncing(false)
  }, [])

  // Adicionar request a fila
  const enqueue = useCallback(
    (
      url: string,
      method: string,
      body: object,
      description: string,
      onSync?: () => void
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const item: QueuedRequest = {
        id,
        url,
        method,
        body: JSON.stringify(body),
        timestamp: Date.now(),
        description,
      }

      if (onSync) {
        onSyncCallbacksRef.current.set(id, onSync)
      }

      const newQueue = [...loadQueue(), item]
      saveQueue(newQueue)
      setQueue(newQueue)

      return id
    },
    []
  )

  // Fetch resiliente: tenta enviar, se falhar por rede enfileira
  const resilientFetch = useCallback(
    async (
      url: string,
      options: { method: string; body: object; description: string },
      onSync?: () => void
    ): Promise<{ ok: boolean; data?: unknown; queued?: boolean }> => {
      try {
        const res = await fetch(url, {
          method: options.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body),
        })

        if (res.ok) {
          const data = await res.json()
          return { ok: true, data }
        }

        // Erro de servidor (nao de rede) - nao enfileirar
        const data = await res.json().catch(() => ({}))
        return { ok: false, data }
      } catch {
        // Erro de rede - enfileirar
        enqueue(url, options.method, options.body, options.description, onSync)
        return { ok: true, queued: true }
      }
    },
    [enqueue]
  )

  // Limpar um item manualmente
  const removeFromQueue = useCallback((id: string) => {
    const currentQueue = loadQueue().filter((item) => item.id !== id)
    saveQueue(currentQueue)
    setQueue(currentQueue)
  }, [])

  return {
    isOnline,
    queue,
    queueCount: queue.length,
    isSyncing,
    enqueue,
    resilientFetch,
    removeFromQueue,
    processQueue,
  }
}

// Hook para auto-save do estado do cronometro no localStorage
const TIMER_STORAGE_KEY = "gpt-v01-timer-state"

interface TimerState {
  testId: number
  elapsedSeconds: number
  timestamp: number
}

export function useTimerAutoSave(testId: number) {
  const save = useCallback(
    (elapsedSeconds: number) => {
      try {
        const state: TimerState = {
          testId,
          elapsedSeconds,
          timestamp: Date.now(),
        }
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
      } catch {
        // storage unavailable
      }
    },
    [testId]
  )

  const load = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY)
      if (!raw) return null
      const state: TimerState = JSON.parse(raw)
      if (state.testId !== testId) return null
      // Se o state foi salvo ha mais de 24h, ignorar
      if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) return null
      return state.elapsedSeconds
    } catch {
      return null
    }
  }, [testId])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    } catch {
      // storage unavailable
    }
  }, [])

  return { save, load, clear }
}
