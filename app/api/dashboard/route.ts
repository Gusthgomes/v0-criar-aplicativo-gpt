import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { MODEL_DURATION_MINUTES } from "@/lib/constants"
import type { Model } from "@/lib/constants"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const bench = searchParams.get("bench")
    const models = searchParams.get("models") // comma-separated list
    const employeeId = searchParams.get("employee_id")
    const status = searchParams.get("status") // "finished", "pending", "paused"

    // Build filter conditions dynamically
    const conditions: string[] = []
    const stopConditions: string[] = []

    if (dateFrom) {
      // Usa finished_at para filtrar por data de finalização (não criação)
      conditions.push(`t.finished_at >= '${dateFrom}T00:00:00.000Z'`)
      stopConditions.push(`s.created_at >= '${dateFrom}T00:00:00.000Z'`)
    }
    if (dateTo) {
      conditions.push(`t.finished_at <= '${dateTo}T23:59:59.999Z'`)
      stopConditions.push(`s.created_at <= '${dateTo}T23:59:59.999Z'`)
    }
    if (bench) {
      conditions.push(`t.bench = ${parseInt(bench, 10)}`)
    }
    if (models) {
      const modelList = models.split(",").map(m => `'${m.trim()}'`).join(",")
      conditions.push(`t.model IN (${modelList})`)
    }
    if (employeeId) {
      conditions.push(`t.employee_id = '${employeeId}'`)
    }
    if (status === "finished") {
      conditions.push(`t.finished_at IS NOT NULL`)
    } else if (status === "pending") {
      conditions.push(`t.finished_at IS NULL AND t.is_complete IS NULL`)
    } else if (status === "paused") {
      conditions.push(`t.finished_at IS NULL AND t.is_complete = false`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const finishedWhereClause = conditions.length > 0
      ? `WHERE t.finished_at IS NOT NULL AND ${conditions.join(" AND ")}`
      : "WHERE t.finished_at IS NOT NULL"

    // We need to use raw template strings for dynamic conditions
    // Since neon sql tagged templates don't support dynamic WHERE easily,
    // we'll use a workaround with separate queries
    const totalTests = await sql(
      `SELECT COUNT(*)::int as count FROM tests t ${whereClause}`
    )

    const finishedTests = await sql(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN t.actual_duration_minutes <= t.expected_duration_minutes THEN 1 END)::int as on_time,
        COUNT(CASE WHEN t.actual_duration_minutes > t.expected_duration_minutes THEN 1 END)::int as exceeded,
        COALESCE(AVG(t.actual_duration_minutes), 0)::float as avg_duration,
        COALESCE(AVG(t.expected_duration_minutes), 0)::float as avg_expected
      FROM tests t
      ${finishedWhereClause}`
    )

    const stopJoinWhere = conditions.length > 0
      ? `WHERE ${conditions.map(c => c).join(" AND ")}`
      : ""

    const stopsQuery = stopConditions.length > 0
      ? `WHERE ${stopConditions.join(" AND ")}`
      : ""

    const stopsByType = await sql(
      `SELECT s.stop_type, COUNT(*)::int as count, COALESCE(SUM(s.duration_minutes), 0)::int as total_duration
      FROM stops s
      JOIN tests t ON t.id = s.test_id
      ${stopJoinWhere ? stopJoinWhere : stopsQuery}
      GROUP BY s.stop_type
      ORDER BY count DESC`
    )

    const testsByModel = await sql(
      `SELECT 
        t.model,
        COUNT(*)::int as total,
        COUNT(CASE WHEN t.finished_at IS NOT NULL AND t.actual_duration_minutes <= t.expected_duration_minutes THEN 1 END)::int as on_time,
        COUNT(CASE WHEN t.finished_at IS NOT NULL AND t.actual_duration_minutes > t.expected_duration_minutes THEN 1 END)::int as exceeded,
        COALESCE(AVG(CASE WHEN t.finished_at IS NOT NULL THEN t.actual_duration_minutes END), 0)::float as avg_duration
      FROM tests t
      ${whereClause}
      GROUP BY t.model
      ORDER BY total DESC`
    )

    const recentTests = await sql(
      `SELECT 
        t.*,
        COUNT(s.id)::int as stop_count,
        COALESCE(SUM(s.duration_minutes), 0)::int as total_stop_duration
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 50`
    )

    const totalStops = await sql(
      `SELECT COUNT(*)::int as count FROM stops s JOIN tests t ON t.id = s.test_id ${stopJoinWhere}`
    )

    const pendingTests = await sql(
      `SELECT COUNT(*)::int as count FROM tests t ${whereClause ? whereClause + " AND" : "WHERE"} t.finished_at IS NULL`
    )

    const finishedCount = finishedTests[0]?.total || 0
    const avgStopsPerTest =
      finishedCount > 0
        ? (totalStops[0]?.count || 0) / finishedCount
        : 0

    // Obras aprovadas no primeiro teste
    // Uma obra é "não aprovada no 1º teste" se teve alguma dessas paradas:
    // Erro de montagem, Erro de fornecedor, Retrabalho, Erro de especificação, Material trocado
    // Todas as demais paradas NÃO reprovam a obra
    const firstTestApproval = await sql(
      `WITH first_tests AS (
        SELECT DISTINCT ON (t.work_number)
          t.id,
          t.work_number,
          t.model,
          t.actual_duration_minutes,
          t.expected_duration_minutes,
          t.finished_at
        FROM tests t
        ${finishedWhereClause}
        ORDER BY t.work_number, t.created_at ASC
      ),
      failing_stops AS (
        SELECT ft.id as test_id, COUNT(s.id)::int as fail_stop_count
        FROM first_tests ft
        LEFT JOIN stops s ON s.test_id = ft.id
          AND s.stop_type IN ('Erro de montagem', 'Erro de fornecedor', 'Retrabalho', 'Erro de especificação', 'Material trocado')
        GROUP BY ft.id
      )
      SELECT
        ft.model,
        COUNT(*)::int as total_first_tests,
        COUNT(CASE
          WHEN COALESCE(fs.fail_stop_count, 0) = 0
          THEN 1
        END)::int as approved_no_stops,
        COUNT(CASE
          WHEN COALESCE(fs.fail_stop_count, 0) > 0
          THEN 1
        END)::int as not_approved
      FROM first_tests ft
      LEFT JOIN failing_stops fs ON fs.test_id = ft.id
      GROUP BY ft.model
      ORDER BY ft.model`
    )

    // Build expected vs actual data for the chart
    const expectedVsActual = testsByModel.map((t: { model: string; avg_duration: number }) => {
      const expectedMinutes = MODEL_DURATION_MINUTES[t.model as Model] || 0
      return {
        model: t.model,
        expected: expectedMinutes,
        actual: Math.round(t.avg_duration),
      }
    })

    // Build conditions string without WHERE prefix for use in JOINs
    const baseConditions = conditions.length > 0 ? conditions.join(" AND ") : "1=1"

    // Pareto: motivos de exceder tempo para M76
    const exceededReasonsM76 = await sql(
      `SELECT s.stop_type, COUNT(DISTINCT t.id)::int as count
       FROM stops s
       JOIN tests t ON t.id = s.test_id
       WHERE t.finished_at IS NOT NULL 
         AND t.model = 'M76' 
         AND t.actual_duration_minutes > t.expected_duration_minutes
         AND ${baseConditions}
       GROUP BY s.stop_type
       ORDER BY count DESC
       LIMIT 10`
    )

    // Pareto: motivos de exceder tempo para M73, M74, M75, M77
    const exceededReasonsOthers = await sql(
      `SELECT s.stop_type, COUNT(DISTINCT t.id)::int as count
       FROM stops s
       JOIN tests t ON t.id = s.test_id
       WHERE t.finished_at IS NOT NULL 
         AND t.model IN ('M73', 'M74', 'M75', 'M77') 
         AND t.actual_duration_minutes > t.expected_duration_minutes
         AND ${baseConditions}
       GROUP BY s.stop_type
       ORDER BY count DESC
       LIMIT 10`
    )

    // Pareto: motivos de não aprovação no primeiro teste para M76
    const notApprovedReasonsM76 = await sql(
      `WITH first_tests AS (
        SELECT DISTINCT ON (t.work_number) t.id, t.work_number, t.model
        FROM tests t
        WHERE t.finished_at IS NOT NULL AND t.model = 'M76' AND ${baseConditions}
        ORDER BY t.work_number, t.created_at ASC
      )
      SELECT s.stop_type, COUNT(*)::int as count
      FROM stops s
      JOIN first_tests ft ON ft.id = s.test_id
      WHERE s.stop_type IN ('Erro de montagem', 'Erro de fornecedor', 'Retrabalho', 'Erro de especificação', 'Material trocado')
      GROUP BY s.stop_type
      ORDER BY count DESC`
    )

    // Pareto: motivos de não aprovação no primeiro teste para outros modelos
    const notApprovedReasonsOthers = await sql(
      `WITH first_tests AS (
        SELECT DISTINCT ON (t.work_number) t.id, t.work_number, t.model
        FROM tests t
        WHERE t.finished_at IS NOT NULL AND t.model IN ('M73', 'M74', 'M75', 'M77') AND ${baseConditions}
        ORDER BY t.work_number, t.created_at ASC
      )
      SELECT s.stop_type, COUNT(*)::int as count
      FROM stops s
      JOIN first_tests ft ON ft.id = s.test_id
      WHERE s.stop_type IN ('Erro de montagem', 'Erro de fornecedor', 'Retrabalho', 'Erro de especificação', 'Material trocado')
      GROUP BY s.stop_type
      ORDER BY count DESC`
    )

    return NextResponse.json({
      total_tests: totalTests[0]?.count || 0,
      finished_tests: finishedCount,
      pending_tests: pendingTests[0]?.count || 0,
      on_time: finishedTests[0]?.on_time || 0,
      exceeded: finishedTests[0]?.exceeded || 0,
      on_time_percentage:
        finishedCount > 0
          ? Math.round(((finishedTests[0]?.on_time || 0) / finishedCount) * 100)
          : 0,
      exceeded_percentage:
        finishedCount > 0
          ? Math.round(((finishedTests[0]?.exceeded || 0) / finishedCount) * 100)
          : 0,
      avg_duration: Math.round(finishedTests[0]?.avg_duration || 0),
      avg_expected: Math.round(finishedTests[0]?.avg_expected || 0),
      avg_stops_per_test: Math.round(avgStopsPerTest * 10) / 10,
      stops_by_type: stopsByType,
      tests_by_model: testsByModel,
      expected_vs_actual: expectedVsActual,
      first_test_approval: firstTestApproval,
      recent_tests: recentTests,
      exceeded_reasons_m76: exceededReasonsM76,
      exceeded_reasons_others: exceededReasonsOthers,
      not_approved_reasons_m76: notApprovedReasonsM76,
      not_approved_reasons_others: notApprovedReasonsOthers,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados do dashboard" },
      { status: 500 }
    )
  }
}
