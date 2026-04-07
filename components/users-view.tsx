"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Users, Shield, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { AppHeader } from "./app-header"
import { type UserRole } from "@/lib/auth-constants"

interface User {
  id: number
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "visitor", label: "Visitante", description: "Sem acesso - aguardando permissões" },
  { value: "inspectors", label: "Inspetor", description: "Novo Teste, Consulta" },
  { value: "admin", label: "Admin", description: "Consulta, Relatório, Comparativo, Tempo Real, Dashboard, Assistente" },
  { value: "quality", label: "Qualidade", description: "Consulta, Relatório, Tempo Real, Dashboard, Exportar" },
  { value: "master", label: "Master", description: "Acesso total + Gerenciar Usuários" },
]

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "master": return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
    case "admin": return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "quality": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    case "inspectors": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
  }
}

export function UsersView() {
  const { data, error, isLoading, mutate } = useSWR<{ users: User[] }>("/api/users", fetcher)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao atualizar permissão")
      }

      toast.success("Permissão atualizada com sucesso")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar permissão")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (userId: number) => {
    setDeletingId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao excluir usuário")
      }

      toast.success("Usuário excluído com sucesso")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário")
    } finally {
      setDeletingId(null)
    }
  }

  const users = data?.users || []
  const countByRole = ROLES.reduce((acc, role) => {
    acc[role.value] = users.filter(u => u.role === role.value).length
    return acc
  }, {} as Record<UserRole, number>)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              Gerenciamento de Usuários
            </h2>
            <p className="text-muted-foreground">
              Gerencie as permissões de acesso dos usuários
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {ROLES.map(role => (
            <Card key={role.value}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{role.label}</p>
                    <p className="text-2xl font-bold">{countByRole[role.value] || 0}</p>
                  </div>
                  <div className={`p-2 rounded-full ${getRoleBadgeColor(role.value)}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados</CardTitle>
            <CardDescription>
              {users.length} usuário(s) no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-center py-10 text-red-500">Erro ao carregar usuários</p>
            ) : users.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Nenhum usuário cadastrado</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                            disabled={updatingId === user.id}
                          >
                            <SelectTrigger className="w-36">
                              {updatingId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${getRoleBadgeColor(role.value).split(" ")[0]}`} />
                                    {role.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                                disabled={deletingId === user.id}
                              >
                                {deletingId === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda de permissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legenda de Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROLES.map(role => (
                <div key={role.value} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(role.value)}`}>
                    {role.label}
                  </span>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
