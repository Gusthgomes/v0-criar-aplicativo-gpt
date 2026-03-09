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
        { error: "ID invalido" },
        { status: 400 }
      )
    }

    const tests = await sql`
      SELECT * FROM tests WHERE id = ${testId}
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Teste nao encontrado" },
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
        { error: "ID invalido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { actual_duration_minutes, is_complete, elapsed_seconds_at_pause } = body

    // Case 1: Finishing a test (complete or paused for next day)
    if (actual_duration_minutes !== undefined && actual_duration_minutes !== null) {
      const complete = is_complete !== false // default true

      if (complete) {
        // Fully finishing the test
        const result = await sql`
          UPDATE tests 
          SET actual_duration_minutes = ${actual_duration_minutes},
              finished_at = NOW(),
              is_complete = true
          WHERE id = ${testId}
          RETURNING *
        `

        if (result.length === 0) {
          return NextResponse.json(
            { error: "Teste nao encontrado" },
            { status: 404 }
          )
        }

        return NextResponse.json(result[0])
      } else {
        // Pausing the test for the next day
        // finished_at permanece NULL para indicar que o teste não acabou
        const elapsedSec = elapsed_seconds_at_pause ?? Math.ceil(actual_duration_minutes * 60)

        const result = await sql`
          UPDATE tests 
          SET actual_duration_minutes = ${actual_duration_minutes},
              finished_at = NULL,
              is_complete = false,
              elapsed_seconds_at_pause = ${elapsedSec},
              paused_at = NOW()
          WHERE id = ${testId}
          RETURNING *
        `

        if (result.length === 0) {
          return NextResponse.json(
            { error: "Teste nao encontrado" },
            { status: 404 }
          )
        }

        return NextResponse.json(result[0])
      }
    }

    return NextResponse.json(
      { error: "Dados invalidos" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating test:", error)
    return NextResponse.json(
      { error: "Erro ao finalizar teste" },
      { status: 500 }
    )
  }
}
