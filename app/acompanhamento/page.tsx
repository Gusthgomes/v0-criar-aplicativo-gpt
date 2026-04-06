import { AppHeader } from "@/components/app-header"
import { AcompanhamentoView } from "@/components/acompanhamento-view"

export const metadata = {
  title: "Acompanhamento em Tempo Real | Sistema de Testes",
  description: "Monitoramento de testes em andamento",
}

export default function AcompanhamentoPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-6">
        <AcompanhamentoView />
      </div>
    </main>
  )
}
