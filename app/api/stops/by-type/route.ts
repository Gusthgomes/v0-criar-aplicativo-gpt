import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stopType = searchParams.get("type")

    if (!stopType) {
      return NextResponse.json(
        { error: "Tipo de parada e obrigatorio" },
        { status: 400 }
      )
    }

    const results = await sql`
      SELECT
        t.id as test_id,
        t.work_number,
        t.model,
        t.employee_id,
        t.bench,
        t.expected_duration_minutes,
        t.actual_duration_minutes,
        t.finished_at,
        t.is_complete,
        t.created_at,
        s.id as stop_id,
        s.stop_type,
        s.duration_minutes as stop_duration,
        s.observations,
        s.created_at as stop_created_at
      FROM stops s
      JOIN tests t ON t.id = s.test_id
      WHERE s.stop_type = ${stopType}
      ORDER BY t.created_at DESC
    `

    // Agrupar por obra
    const worksMap = new Map<string, {
      work_number: string
      tests: Map<number, {
        test_id: number
        model: string
        employee_id: string
        bench: number
        expected_duration_minutes: number
        actual_duration_minutes: number | null
        finished_at: string | null
        is_complete: boolean | null
        created_at: string
        stops: {
          stop_id: number
          duration_minutes: number | null
          observations: string | null
          created_at: string
        }[]
      }>
    }>()

    for (const row of results) {
      if (!worksMap.has(row.work_number)) {
        worksMap.set(row.work_number, {
          work_number: row.work_number,
          tests: new Map(),
        })
      }

      const work = worksMap.get(row.work_number)!
      if (!work.tests.has(row.test_id)) {
        work.tests.set(row.test_id, {
          test_id: row.test_id,
          model: row.model,
          employee_id: row.employee_id,
          bench: row.bench,
          expected_duration_minutes: row.expected_duration_minutes,
          actual_duration_minutes: row.actual_duration_minutes,
          finished_at: row.finished_at,
          is_complete: row.is_complete,
          created_at: row.created_at,
          stops: [],
        })
      }

      work.tests.get(row.test_id)!.stops.push({
        stop_id: row.stop_id,
        duration_minutes: row.stop_duration,
        observations: row.observations,
        created_at: row.stop_created_at,
      })
    }

    const works = Array.from(worksMap.values()).map((w) => ({
      work_number: w.work_number,
      total_occurrences: Array.from(w.tests.values()).reduce(
        (sum, t) => sum + t.stops.length, 0
      ),
      tests: Array.from(w.tests.values()),
    }))

    return NextResponse.json({
      stop_type: stopType,
      total_works: works.length,
      total_occurrences: results.length,
      works,
    })
  } catch (error) {
    console.error("Error fetching stops by type:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}
