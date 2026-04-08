// Constantes de autenticação que podem ser usadas no client-side

export type UserRole = "visitor" | "inspectors" | "admin" | "quality" | "master"

// Permissões por página
export const PAGE_PERMISSIONS: Record<string, UserRole[]> = {
  "/": ["inspectors", "admin", "quality", "master"], // Tela inicial (novo teste)
  "/consulta": ["inspectors", "admin", "quality", "master"],
  "/relatorio": ["admin", "quality", "master"],
  "/comparativo": ["admin", "master"],
  "/acompanhamento": ["admin", "quality", "master"],
  "/dashboard": ["inspectors", "admin", "quality", "master"],
  "/assistente": ["admin", "master"],
  "/exportar": ["quality", "master"],
  "/usuarios": ["master"],
}
