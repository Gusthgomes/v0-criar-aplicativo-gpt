"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExportDialog } from "@/components/export-dialog"
import {
  BarChart3,
  ClipboardList,
  Search,
  Sparkles,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  LogOut,
  Users,
  User,
  Menu,
  Wrench,
  Tv
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

// Configuração de navegação com permissões
const NAV_ITEMS = [
  { path: "/", label: "Novo Teste", icon: ClipboardList, roles: ["inspectors", "admin", "quality", "master"] },
  { path: "/consulta", label: "Consulta", icon: Search, roles: ["inspectors", "admin", "quality", "master"] },
  { path: "/relatorio", label: "Relatório", icon: FileSpreadsheet, roles: ["admin", "quality", "master"] },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin", "quality", "master"] },
  { path: "/comparativo", label: "Comparativo", icon: TrendingUp, roles: ["admin", "master"] },
  { path: "/acompanhamento", label: "Tempo Real", icon: Activity, roles: ["admin", "quality", "master"] },
  { path: "/assistente", label: "Assistente", icon: Sparkles, roles: ["admin", "master"] },
  { path: "/usuarios", label: "Usuários", icon: Users, roles: ["master"] },
  { path: "/editar-obra", label: "Editar Obra", icon: Wrench, roles: ["master"] },
  { path: "/painel", label: "Painel TV", icon: Tv, roles: ["inspectors", "admin", "quality", "master"] },
]

export function AppHeader() {
  const pathname = usePathname()
  const { user, logout, hasPermission } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Filtrar itens de navegação baseado nas permissões
  const visibleNavItems = NAV_ITEMS.filter(item => hasPermission(item.path))

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "master": return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
      case "admin": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      case "quality": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      case "inspectors": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "master": return "Master"
      case "admin": return "Admin"
      case "quality": return "Qualidade"
      case "inspectors": return "Inspetor"
      case "visitor": return "Visitante"
      default: return role
    }
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold leading-tight text-foreground">
              GPT V24
            </h1>
            <p className="text-xs text-muted-foreground">
              Controle de Testes
            </p>
          </div>
        </Link>

        {/* Desktop Navigation - apenas alguns itens principais */}
        <nav className="hidden lg:flex items-center gap-1">
          {visibleNavItems.slice(0, 4).map(item => (
            <Button
              key={item.path}
              variant={pathname === item.path ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={item.path} className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right side - Export, User menu e Sheet */}
        <div className="flex items-center gap-2">
          {/* Exportar - desktop */}
          {(user?.role === "quality" || user?.role === "master") && (
            <div className="hidden lg:block">
              <ExportDialog />
            </div>
          )}

          {/* Sheet Menu */}
          {user && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  <span className="hidden sm:inline">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3 text-center">
                    <div className="flex h-10 w-10 items-center justify-center text-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-2 w-full flex justify-center items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <Separator className="my-4" />

                {/* Navegação */}
                <div className="space-y-1 justify-center items-center w-full px-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Navegação</p>
                  {visibleNavItems.map(item => (
                    <Button
                      key={item.path}
                      variant={pathname === item.path ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      asChild
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href={item.path} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  ))}
                </div>

                {/* Exportar - dentro do Sheet */}
                {(user.role === "quality" || user.role === "master") && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-1 w-full justify-center items-center pl-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Exportação</p>
                      <ExportDialog />
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Logout */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sair da conta
                </Button>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  )
}
