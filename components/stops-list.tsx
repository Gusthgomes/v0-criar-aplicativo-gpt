import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock } from "lucide-react"

interface Stop {
  id: number
  stop_type: string
  sub_type: string | null
  observations: string | null
  duration_minutes: number | null
  created_at: string
}

interface StopsListProps {
  stops: Stop[]
}

function formatStopDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, "0")}min`
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

  const totalMinutes = stops.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {stops.length} parada{stops.length !== 1 ? "s" : ""} registrada{stops.length !== 1 ? "s" : ""}
          </span>
        </div>
        {totalMinutes > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Total parado: {formatStopDuration(totalMinutes)}
          </Badge>
        )}
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
                  {stop.sub_type && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      &gt; {stop.sub_type}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {stop.duration_minutes != null && stop.duration_minutes > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    {formatStopDuration(stop.duration_minutes)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(stop.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
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
