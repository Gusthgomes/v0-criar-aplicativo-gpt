import { NextResponse } from "next/server"
import { getSession, createToken } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ user: null })
    }

    // Buscar role atualizada do banco de dados
    const result = await sql`
      SELECT id, email, name, role
      FROM users
      WHERE id = ${session.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ user: null })
    }

    const user = result[0]

    // Se a role mudou, atualizar o token
    if (user.role !== session.role) {
      const newToken = await createToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      })

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        roleUpdated: true,
      })

      response.cookies.set("auth-token", newToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      })

      return response
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Erro ao obter sessão:", error)
    return NextResponse.json({ user: null })
  }
}
