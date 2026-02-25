import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"

interface Stop {
  id: number
  stop_type: string
  observations: string | null
  created_at: string
}

interface StopsListProps {
  stops: Stop[]
}

export function StopsList({ stops }: StopsListProps) {
  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma parada registrada
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {stops.length} parada{stops.length !== 1 ? "s" : ""} registrada{stops.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {stops.map((stop, index) => (
          <div
            key={stop.id}
            className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  #{index + 1}
                </Badge>
                <span className="text-sm font-medium text-foreground">
                  {stop.stop_type}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(stop.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {stop.observations && (
              <p className="text-xs text-muted-foreground">
                {stop.observations}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
