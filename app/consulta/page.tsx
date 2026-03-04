import { Suspense } from "react"
import { WorkSearchView } from "@/components/work-search-view"

export default function ConsultaPage() {
  return (
    <Suspense>
      <WorkSearchView />
    </Suspense>
  )
}
