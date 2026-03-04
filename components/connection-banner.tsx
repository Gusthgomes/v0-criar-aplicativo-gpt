"use client"

import { WifiOff, RefreshCw, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConnectionBannerProps {
  isOnline: boolean
  isSyncing: boolean
  queueCount: number
  onRetrySync: () => void
}

export function ConnectionBanner({
  isOnline,
  isSyncing,
  queueCount,
  onRetrySync,
}: ConnectionBannerProps) {
  if (isOnline && queueCount === 0) return null

  // Offline
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center gap-3 bg-destructive px-4 py-2.5 text-destructive-foreground">
        <WifiOff className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">
          Sem conexao. O cronometro continua rodando e suas paradas serao salvas localmente.
        </p>
      </div>
    )
  }

  // Online mas sincronizando
  if (isSyncing) {
    return (
      <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-white">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        <p className="text-sm font-medium">
          Sincronizando {queueCount} {queueCount === 1 ? "registro" : "registros"} pendentes...
        </p>
      </div>
    )
  }

  // Online com itens na fila aguardando
  if (queueCount > 0) {
    return (
      <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-white">
        <CloudOff className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">
          {queueCount} {queueCount === 1 ? "registro pendente" : "registros pendentes"} para sincronizar
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="ml-2 h-7 bg-white/20 text-white hover:bg-white/30"
          onClick={onRetrySync}
        >
          <RefreshCw className="mr-1.5 h-3 w-3" />
          Sincronizar
        </Button>
      </div>
    )
  }

  return null
}
