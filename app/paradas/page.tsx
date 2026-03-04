import { Suspense } from "react"
import { StopDetailView } from "@/components/stop-detail-view"

export default function ParadasPage() {
  return (
    <Suspense>
      <StopDetailView />
    </Suspense>
  )
}
