import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const date = searchParams.get("date") // Compatibilidade
    const models = searchParams.get("models")
    const stopsFilter = searchParams.get("stops") // ✅ RESTAURADO
    const bench = searchParams.get("bench")
    const employeeId = searchParams.get("employee_id")

    // Validação obrigatória
    if (!date && !dateFrom) {
      return NextResponse.json(
        { error: "É necessário 'date', 'date_from' ou 'date_to'" },
        { status: 400 }
      )
    }

    // Build condições de data (igual dashboard)
    const dateConditions: string[] = []

    if (dateFrom && dateTo) {
      dateConditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at >= '${dateFrom}T00:00:00.000Z' AND t.finished_at <= '${dateTo}T23:59:59.999Z')
        OR 
        (t.finished_at IS NULL AND t.created_at >= '${dateFrom}T00:00:00.000Z' AND t.created_at <= '${dateTo}T23:59:59.999Z')
      )`)
    } else if (dateFrom) {
      dateConditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at >= '${dateFrom}T00:00:00.000Z')
        OR 
        (t.finished_at IS NULL AND t.created_at >= '${dateFrom}T00:00:00.000Z')
      )`)
    } else if (dateTo) {
      dateConditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at <= '${dateTo}T23:59:59.999Z')
        OR 
        (t.finished_at IS NULL AND t.created_at <= '${dateTo}T23:59:59.999Z')
      )`)
    } else if (date) {
      dateConditions.push(`(DATE(t.created_at) = '${date}'::date OR DATE(t.finished_at) = '${date}'::date)`)
    }

    // Build filtro geral
    const conditions: string[] = [...dateConditions]

    if (models) {
      const modelList = models.split(",").map(m => `'${m.trim()}'`).join(",")
      conditions.push(`t.model IN (${modelList})`)
    }

    if (bench) {
      conditions.push(`t.bench = ${parseInt(bench, 10)}`)
    }

    if (employeeId) {
      conditions.push(`t.employee_id = '${employeeId}'`)
    }

    // ✅ FILTRO DE PARADAS RESTAURADO
    if (stopsFilter) {
      const stopList = stopsFilter.split(",").map(s => `'${s.trim()}'`).join(",")
      conditions.push(`t.id IN (SELECT DISTINCT test_id FROM stops WHERE stop_type IN (${stopList}))`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // ✅ Query com template string tradicional (sem sql.raw)
    const query = `
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
        t.created_at,
        COALESCE(json_agg(
          json_build_object(
            'id', s.id,
            'test_id', s.test_id,
            'stop_type', s.stop_type,
            'sub_type', s.sub_type,
            'material_code', s.material_code,
            'observations', s.observations,
            'duration_minutes', s.duration_minutes,
            'created_at', s.created_at
          ) ORDER BY s.created_at ASC
        ) FILTER (WHERE s.id IS NOT NULL), '[]'::json) as stops
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      ${whereClause}
      GROUP BY t.id, t.work_number, t.model, t.bench, t.employee_id, 
               t.expected_duration_minutes, t.actual_duration_minutes, 
               t.finished_at, t.is_complete, t.created_at
      ORDER BY t.created_at ASC
    `

    const testsWithStops = await sql(query)
    const totalTests = testsWithStops.length

    return NextResponse.json({
      date_from: dateFrom || date,
      date_to: dateTo,
      total_tests: totalTests,
      tests: testsWithStops,
    })
  } catch (error) {
    console.error("Erro ao buscar relatório:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}
