"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  User
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Configuração de navegação com permissões
const NAV_ITEMS = [
  { path: "/", label: "Novo Teste", icon: null, roles: ["inspectors", "admin", "quality", "master"] },
  { path: "/consulta", label: "Consulta", icon: Search, roles: ["inspectors", "admin", "quality", "master"] },
  { path: "/relatorio", label: "Relatorio", icon: FileSpreadsheet, roles: ["admin", "quality", "master"] },
  { path: "/comparativo", label: "Comparativo", icon: TrendingUp, roles: ["admin", "master"] },
  { path: "/acompanhamento", label: "Tempo Real", icon: Activity, roles: ["admin", "quality", "master"] },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin", "quality", "master"], variant: "outline" as const },
  { path: "/assistente", label: "Assistente", icon: Sparkles, roles: ["admin", "master"], variant: "default" as const },
  { path: "/usuarios", label: "Usuarios", icon: Users, roles: ["master"] },
]

export function AppHeader() {
  const pathname = usePathname()
  const { user, logout, hasPermission } = useAuth()

  // Filtrar itens de navegação baseado nas permissões
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (pathname === item.path) return false
    return hasPermission(item.path)
  })

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
          {visibleNavItems.map(item => (
            <Button 
              key={item.path} 
              variant={item.variant || "ghost"} 
              size="sm" 
              asChild
            >
              <Link href={item.path} className="flex items-center gap-2">
                {item.icon && <item.icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          
          {/* Exportar - apenas para quality e master */}
          {(hasPermission("/exportar") || user?.role === "quality" || user?.role === "master") && (
            <ExportDialog />
          )}

          {/* Menu do usuário */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline max-w-24 truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit mt-1 ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  )
}
