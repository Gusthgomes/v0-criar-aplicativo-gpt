import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
)

// Páginas públicas (não requerem autenticação)
const PUBLIC_PATHS = ["/login", "/registro"]

// Permissões por página
const PAGE_PERMISSIONS: Record<string, string[]> = {
  "/": ["inspectors", "admin", "quality", "master"],
  "/consulta": ["inspectors", "admin", "quality", "master"],
  "/relatorio": ["admin", "quality", "master"],
  "/comparativo": ["admin", "master"],
  "/acompanhamento": ["admin", "quality", "master"],
  "/dashboard": ["admin", "quality", "master"],
  "/assistente": ["admin", "master"],
  "/exportar": ["quality", "master"],
  "/usuarios": ["master"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar arquivos estáticos e API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Páginas públicas
  if (PUBLIC_PATHS.includes(pathname)) {
    // Se já está logado, redirecionar para home
    const token = request.cookies.get("auth-token")?.value
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET)
        return NextResponse.redirect(new URL("/", request.url))
      } catch {
        // Token inválido, deixar acessar página de login
      }
    }
    return NextResponse.next()
  }

  // Verificar autenticação
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const role = payload.role as string

    // Visitor não tem acesso a nenhuma página
    if (role === "visitor") {
      // Permitir acesso apenas à página de espera
      if (pathname === "/aguarde") {
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL("/aguarde", request.url))
    }

    // Master tem acesso a tudo
    if (role === "master") {
      return NextResponse.next()
    }

    // Verificar permissão para a página
    const allowedRoles = PAGE_PERMISSIONS[pathname]
    
    if (allowedRoles && !allowedRoles.includes(role)) {
      // Redirecionar para a primeira página permitida
      const firstAllowedPage = Object.entries(PAGE_PERMISSIONS)
        .find(([, roles]) => roles.includes(role))?.[0]
      
      if (firstAllowedPage) {
        return NextResponse.redirect(new URL(firstAllowedPage, request.url))
      }
      
      return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
  } catch {
    // Token inválido
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("auth-token")
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
