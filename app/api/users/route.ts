import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || session.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    const users = await sql`
      SELECT id, email, name, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 }
    )
  }
}
