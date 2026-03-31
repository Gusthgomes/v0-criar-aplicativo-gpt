import { Suspense } from "react"
import { RelatorioDiarioView } from "@/components/relatorio-diario-view"

export default function RelatorioPage() {
  return (
    <Suspense>
      <RelatorioDiarioView />
    </Suspense>
  )
}
