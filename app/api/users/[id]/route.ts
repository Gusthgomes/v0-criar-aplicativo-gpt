import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, type UserRole } from "@/lib/auth"

const VALID_ROLES: UserRole[] = ["visitor", "inspectors", "admin", "quality", "master"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    const { id } = await params
    const userId = parseInt(id)
    const { role } = await request.json()

    // Validar role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Permissão inválida" },
        { status: 400 }
      )
    }

    // Não permitir alterar a própria permissão
    if (userId === session.id) {
      return NextResponse.json(
        { error: "Você não pode alterar sua própria permissão" },
        { status: 400 }
      )
    }

    // Atualizar usuário
    const result = await sql`
      UPDATE users
      SET role = ${role}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, email, name, role, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: result[0] })
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== "master") {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    const { id } = await params
    const userId = parseInt(id)

    // Não permitir deletar a própria conta
    if (userId === session.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta" },
        { status: 400 }
      )
    }

    await sql`DELETE FROM users WHERE id = ${userId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir usuário:", error)
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    )
  }
}
