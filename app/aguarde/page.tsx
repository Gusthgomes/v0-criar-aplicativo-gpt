"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function AguardePage() {
  const { user, logout, refreshSession } = useAuth()
  const router = useRouter()

  // Verificar periodicamente se as permissões foram atualizadas
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSession().then(() => {
        if (user && user.role !== "visitor") {
          router.push("/")
        }
      })
    }, 10000) // Verificar a cada 10 segundos

    return () => clearInterval(interval)
  }, [user, refreshSession, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">Aguarde um momento</CardTitle>
          <CardDescription className="text-base">
            Enquanto preparamos as suas permissoes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso! Um administrador precisa liberar seu acesso ao sistema.
            Esta pagina sera atualizada automaticamente quando suas permissoes forem configuradas.
          </p>
          
          {user && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Logado como:</p>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          )}

          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
