import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const model = searchParams.get("model")

    if (!date) {
      return NextResponse.json(
        { error: "Data é obrigatória" },
        { status: 400 }
      )
    }

    // Construir query com filtro opcional de modelo
    let query = `
      SELECT 
        t.id,
        t.work_number,
        t.model,
        t.bench,
        t.employee_id,
        t.expected_duration_minutes,
        t.actual_duration_minutes,
        t.finished_at,
        t.is_complete,
        t.created_at
      FROM tests t
      WHERE (DATE(t.created_at) = '${date}'::date
         OR DATE(t.finished_at) = '${date}'::date)
    `
    
    if (model) {
      query += ` AND t.model = '${model}'`
    }
    
    query += ` ORDER BY t.created_at ASC`

    // Buscar testes da data especificada
    const tests = await sql(query)

    if (tests.length === 0) {
      return NextResponse.json({
        date,
        total_tests: 0,
        tests: [],
      })
    }

    // Buscar paradas de todos os testes
    const testIds = tests.map((t: { id: number }) => t.id)
    const stops = await sql`
      SELECT 
        s.id,
        s.test_id,
        s.stop_type,
        s.sub_type,
        s.material_code,
        s.observations,
        s.duration_minutes,
        s.created_at
      FROM stops s
      WHERE s.test_id = ANY(${testIds})
      ORDER BY s.created_at ASC
    `

    // Agrupar paradas por teste
    const stopsByTest = new Map<number, typeof stops>()
    for (const stop of stops) {
      const testStops = stopsByTest.get(stop.test_id) || []
      testStops.push(stop)
      stopsByTest.set(stop.test_id, testStops)
    }

    // Montar resposta
    const testsWithStops = tests.map((test: {
      id: number
      work_number: string
      model: string
      bench: number
      employee_id: string
      expected_duration_minutes: number
      actual_duration_minutes: number | null
      finished_at: string | null
      is_complete: boolean | null
      created_at: string
    }) => ({
      ...test,
      stops: stopsByTest.get(test.id) || [],
    }))

    return NextResponse.json({
      date,
      total_tests: tests.length,
      tests: testsWithStops,
    })
  } catch (error) {
    console.error("Erro ao buscar relatório diário:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}
