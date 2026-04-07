import "server-only"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { type UserRole, PAGE_PERMISSIONS } from "./auth-constants"

export { type UserRole, PAGE_PERMISSIONS }

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
)

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
}

export interface JWTPayload {
  id: number
  email: string
  name: string
  role: UserRole
}

// Hash de senha
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verificar senha
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Criar token JWT
export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  return token
}

// Verificar token JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// Obter usuário da sessão
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  return verifyToken(token)
}

// Verificar se usuário tem permissão para acessar uma página
export function hasPermission(role: UserRole, path: string): boolean {
  // Master tem acesso a tudo
  if (role === "master") return true
  
  // Visitor não tem acesso a nada
  if (role === "visitor") return false

  const allowedRoles = PAGE_PERMISSIONS[path]
  if (!allowedRoles) return false

  return allowedRoles.includes(role)
}

// Obter páginas permitidas para um role
export function getAllowedPages(role: UserRole): string[] {
  if (role === "master") return Object.keys(PAGE_PERMISSIONS)
  if (role === "visitor") return []

  return Object.entries(PAGE_PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([path]) => path)
}
