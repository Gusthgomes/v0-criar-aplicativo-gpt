"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, ClipboardList } from "lucide-react"

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
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
          {pathname !== "/dashboard" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
