import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const tests = await sql`
      SELECT * FROM tests WHERE id = ${testId}
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Teste não encontrado" },
        { status: 404 }
      )
    }

    const stops = await sql`
      SELECT * FROM stops WHERE test_id = ${testId} ORDER BY created_at ASC
    `

    return NextResponse.json({ ...tests[0], stops })
  } catch (error) {
    console.error("Error fetching test:", error)
    return NextResponse.json(
      { error: "Erro ao buscar teste" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { actual_duration_minutes } = body

    if (actual_duration_minutes === undefined || actual_duration_minutes === null) {
      return NextResponse.json(
        { error: "Tempo real é obrigatório" },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE tests 
      SET actual_duration_minutes = ${actual_duration_minutes},
          finished_at = NOW()
      WHERE id = ${testId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Teste não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating test:", error)
    return NextResponse.json(
      { error: "Erro ao finalizar teste" },
      { status: 500 }
    )
  }
}
