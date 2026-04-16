import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession } from "@/lib/auth"

// GET - Buscar obra e suas paradas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workNumber: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { workNumber } = await params

    // Buscar todos os testes da obra
    const tests = await sql`
      SELECT 
        id,
        work_number,
        model,
        bench,
        employee_id,
        expected_duration_minutes,
        actual_duration_minutes,
        created_at,
        finished_at,
        is_complete
      FROM tests
      WHERE work_number = ${workNumber}
      ORDER BY created_at DESC
    `

    if (tests.length === 0) {
      return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 })
    }

    // Buscar paradas de cada teste
    const testsWithStops = await Promise.all(
      tests.map(async (test) => {
        const stops = await sql`
          SELECT 
            id,
            stop_type,
            sub_type,
            material_code,
            duration_minutes,
            observations,
            created_at
          FROM stops
          WHERE test_id = ${test.id}
          ORDER BY created_at ASC
        `
        return { ...test, stops }
      })
    )

    return NextResponse.json({ tests: testsWithStops })
  } catch (error) {
    console.error("Erro ao buscar obra:", error)
    return NextResponse.json({ error: "Erro ao buscar obra" }, { status: 500 })
  }
}

// PUT - Atualizar dados do teste
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workNumber: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { workNumber } = await params
    const { testId, data } = await request.json()

    // Verificar se o teste pertence à obra
    const test = await sql`
      SELECT id FROM tests WHERE id = ${testId} AND work_number = ${workNumber}
    `

    if (test.length === 0) {
      return NextResponse.json({ error: "Teste não encontrado" }, { status: 404 })
    }

    // Determinar valores de is_complete e finished_at baseado no status
    let isComplete: boolean | null = null
    let finishedAt: Date | null = null

    if (data.status === "paused") {
      isComplete = false
      finishedAt = null
    } else if (data.status === "finished") {
      isComplete = true
      finishedAt = new Date()
    } else {
      // in_progress
      isComplete = null
      finishedAt = null
    }

    // Atualizar teste
    await sql`
      UPDATE tests
      SET 
        employee_id = ${data.employee_id},
        model = ${data.model},
        bench = ${data.bench},
        expected_duration_minutes = ${data.expected_duration_minutes},
        is_complete = ${isComplete},
        finished_at = ${finishedAt}
      WHERE id = ${testId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao atualizar teste:", error)
    return NextResponse.json({ error: "Erro ao atualizar teste" }, { status: 500 })
  }
}

// DELETE - Excluir teste e suas paradas
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workNumber: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "master") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { workNumber } = await params
    const { searchParams } = new URL(request.url)
    const testId = searchParams.get("testId")

    if (!testId) {
      return NextResponse.json({ error: "ID do teste é obrigatório" }, { status: 400 })
    }

    // Verificar se o teste pertence à obra
    const test = await sql`
      SELECT id FROM tests WHERE id = ${testId} AND work_number = ${workNumber}
    `

    if (test.length === 0) {
      return NextResponse.json({ error: "Teste não encontrado" }, { status: 404 })
    }

    // Excluir paradas do teste primeiro
    await sql`DELETE FROM stops WHERE test_id = ${testId}`

    // Excluir teste
    await sql`DELETE FROM tests WHERE id = ${testId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir teste:", error)
    return NextResponse.json({ error: "Erro ao excluir teste" }, { status: 500 })
  }
}
