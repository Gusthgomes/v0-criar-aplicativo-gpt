import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

interface PeriodStats {
  total_tests: number
  finished_tests: number
  on_time: number
  exceeded: number
  on_time_percentage: number
  avg_duration: number | null
  total_stops: number
  first_test_approval: number
  first_test_approval_percentage: number
  stops_by_type: { stop_type: string; count: number; total_duration: number }[]
}

async function getPeriodStats(dateFrom: string, dateTo: string): Promise<PeriodStats> {
  // Total de testes no período
  const testsResult = await sql`
    SELECT 
      COUNT(*)::int as total_tests,
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int as finished_tests,
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes)::int as on_time,
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND actual_duration_minutes > expected_duration_minutes)::int as exceeded,
      ROUND(AVG(actual_duration_minutes) FILTER (WHERE finished_at IS NOT NULL))::int as avg_duration
    FROM tests
    WHERE (finished_at >= ${dateFrom}::date AND finished_at <= ${dateTo}::date + interval '1 day')
       OR (finished_at IS NULL AND created_at >= ${dateFrom}::date AND created_at <= ${dateTo}::date + interval '1 day')
  `

  const stats = testsResult[0]

  // Total de paradas (excluindo Refeição)
  const stopsResult = await sql`
    SELECT COUNT(*)::int as total_stops
    FROM stops s
    JOIN tests t ON t.id = s.test_id
    WHERE s.stop_type != 'Refeição'
      AND ((t.finished_at >= ${dateFrom}::date AND t.finished_at <= ${dateTo}::date + interval '1 day')
       OR (t.finished_at IS NULL AND t.created_at >= ${dateFrom}::date AND t.created_at <= ${dateTo}::date + interval '1 day'))
  `

  // Paradas por tipo
  const stopsByType = await sql`
    SELECT s.stop_type, COUNT(*)::int as count, COALESCE(SUM(s.duration_minutes), 0)::int as total_duration
    FROM stops s
    JOIN tests t ON t.id = s.test_id
    WHERE s.stop_type != 'Refeição'
      AND ((t.finished_at >= ${dateFrom}::date AND t.finished_at <= ${dateTo}::date + interval '1 day')
       OR (t.finished_at IS NULL AND t.created_at >= ${dateFrom}::date AND t.created_at <= ${dateTo}::date + interval '1 day'))
    GROUP BY s.stop_type
    ORDER BY total_duration DESC
  `

  // Taxa de aprovação no primeiro teste (obras que passaram no primeiro teste)
  const firstTestResult = await sql`
    WITH first_tests AS (
      SELECT DISTINCT ON (work_number) 
        work_number,
        actual_duration_minutes,
        expected_duration_minutes,
        finished_at
      FROM tests
      WHERE (finished_at >= ${dateFrom}::date AND finished_at <= ${dateTo}::date + interval '1 day')
         OR (finished_at IS NULL AND created_at >= ${dateFrom}::date AND created_at <= ${dateTo}::date + interval '1 day')
      ORDER BY work_number, created_at ASC
    )
    SELECT 
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::int as total_first_tests,
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes)::int as approved_first
    FROM first_tests
  `

  const firstTest = firstTestResult[0]
  const firstTestApprovalPct = firstTest.total_first_tests > 0
    ? Math.round((firstTest.approved_first / firstTest.total_first_tests) * 100)
    : 0

  const onTimePct = stats.finished_tests > 0
    ? Math.round((stats.on_time / stats.finished_tests) * 100)
    : 0

  return {
    total_tests: stats.total_tests || 0,
    finished_tests: stats.finished_tests || 0,
    on_time: stats.on_time || 0,
    exceeded: stats.exceeded || 0,
    on_time_percentage: onTimePct,
    avg_duration: stats.avg_duration,
    total_stops: stopsResult[0]?.total_stops || 0,
    first_test_approval: firstTest.approved_first || 0,
    first_test_approval_percentage: firstTestApprovalPct,
    stops_by_type: stopsByType as { stop_type: string; count: number; total_duration: number }[],
  }
}

function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period1From = searchParams.get("period1_from")
    const period1To = searchParams.get("period1_to")
    const period2From = searchParams.get("period2_from")
    const period2To = searchParams.get("period2_to")

    if (!period1From || !period1To || !period2From || !period2To) {
      return NextResponse.json(
        { error: "Todos os períodos são obrigatórios" },
        { status: 400 }
      )
    }

    const [period1Stats, period2Stats] = await Promise.all([
      getPeriodStats(period1From, period1To),
      getPeriodStats(period2From, period2To),
    ])

    // Calcular variações (período 1 é o atual, período 2 é o anterior)
    const variations = {
      total_tests: calculateVariation(period1Stats.total_tests, period2Stats.total_tests),
      on_time_percentage: period1Stats.on_time_percentage - period2Stats.on_time_percentage,
      avg_duration: period1Stats.avg_duration && period2Stats.avg_duration
        ? calculateVariation(period1Stats.avg_duration, period2Stats.avg_duration)
        : 0,
      total_stops: calculateVariation(period1Stats.total_stops, period2Stats.total_stops),
      first_test_approval_percentage: period1Stats.first_test_approval_percentage - period2Stats.first_test_approval_percentage,
    }

    return NextResponse.json({
      period1: {
        from: period1From,
        to: period1To,
        stats: period1Stats,
      },
      period2: {
        from: period2From,
        to: period2To,
        stats: period2Stats,
      },
      variations,
    })
  } catch (error) {
    console.error("Erro ao buscar comparativo:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}
