import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { hashPassword, createToken } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Validações
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, senha e nome são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      )
    }

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Criar usuário com role "visitor" (padrão)
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${name}, 'visitor')
      RETURNING id, email, name, role
    `

    const user = result[0]

    // Criar token JWT
    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Definir cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Erro no registro:", error)
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    )
  }
}
