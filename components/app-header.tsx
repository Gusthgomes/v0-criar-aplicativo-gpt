"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExportDialog } from "@/components/export-dialog"
import { BarChart3, ClipboardList, Search, Sparkles, FileSpreadsheet, TrendingUp, Activity } from "lucide-react"

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">
              GPT V01
            </h1>
            <p className="text-xs text-muted-foreground">
              Controle de Testes
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {pathname !== "/" && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Novo Teste</Link>
            </Button>
          )}
          {pathname !== "/consulta" && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/consulta" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Consulta</span>
              </Link>
            </Button>
          )}
          {pathname !== "/relatorio" && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/relatorio" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Relatorio</span>
              </Link>
            </Button>
          )}
          {pathname !== "/comparativo" && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/comparativo" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Comparativo</span>
              </Link>
            </Button>
          )}
          {pathname !== "/acompanhamento" && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/acompanhamento" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Tempo Real</span>
              </Link>
            </Button>
          )}
          {pathname !== "/dashboard" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          )}
          {pathname !== "/assistente" && (
            <Button variant="default" size="sm" asChild>
              <Link href="/assistente" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Assistente</span>
              </Link>
            </Button>
          )}
          {pathname !== "/" && (
            <Button className="bg-black" size="sm" asChild>
              <Link href="https://v0-avaliacao-de-repositorio.vercel.app/" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">QC Ações</span>
              </Link>
            </Button>
          )}
          <ExportDialog />
        </nav>
      </div>
    </header>
  )
}
