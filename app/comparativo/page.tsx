import { AppHeader } from "@/components/app-header"
import { ComparativoView } from "@/components/comparativo-view"

export default function ComparativoPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-6">
        <ComparativoView />
      </div>
    </main>
  )
}
