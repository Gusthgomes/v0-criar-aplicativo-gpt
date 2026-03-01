import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID invalido" },
        { status: 400 }
      )
    }

    // Check that the test exists, is finished, and is NOT complete
    const tests = await sql`
      SELECT * FROM tests WHERE id = ${testId}
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Teste nao encontrado" },
        { status: 404 }
      )
    }

    const test = tests[0]

    if (test.is_complete) {
      return NextResponse.json(
        { error: "Este teste ja foi finalizado como completo e nao pode ser retomado" },
        { status: 400 }
      )
    }

    if (!test.finished_at) {
      return NextResponse.json(
        { error: "Este teste ainda esta em andamento" },
        { status: 400 }
      )
    }

    // Resume the test: clear finished_at but keep elapsed_seconds_at_pause
    // The timer will use elapsed_seconds_at_pause to know where to resume from
    const result = await sql`
      UPDATE tests 
      SET finished_at = NULL,
          actual_duration_minutes = NULL,
          created_at = NOW()
      WHERE id = ${testId}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error resuming test:", error)
    return NextResponse.json(
      { error: "Erro ao retomar teste" },
      { status: 500 }
    )
  }
}
