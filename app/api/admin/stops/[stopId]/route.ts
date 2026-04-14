import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// PUT - Atualizar parada
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { stopId } = await params
    const data = await request.json()

    // Verificar se a parada existe
    const stop = await sql`SELECT id FROM stops WHERE id = ${stopId}`

    if (stop.length === 0) {
      return NextResponse.json({ error: "Parada não encontrada" }, { status: 404 })
    }

    // Atualizar parada
    await sql`
      UPDATE stops
      SET 
        stop_type = ${data.stop_type},
        sub_type = ${data.sub_type || null},
        material_code = ${data.material_code || null},
        duration_minutes = ${data.duration_minutes},
        observations = ${data.observations || null}
      WHERE id = ${stopId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar parada:", error)
    return NextResponse.json({ error: "Erro ao atualizar parada" }, { status: 500 })
  }
}

// DELETE - Excluir parada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stopId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { stopId } = await params

    // Verificar se a parada existe
    const stop = await sql`SELECT id FROM stops WHERE id = ${stopId}`

    if (stop.length === 0) {
      return NextResponse.json({ error: "Parada não encontrada" }, { status: 404 })
    }

    // Excluir parada
    await sql`DELETE FROM stops WHERE id = ${stopId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir parada:", error)
    return NextResponse.json({ error: "Erro ao excluir parada" }, { status: 500 })
  }
}
