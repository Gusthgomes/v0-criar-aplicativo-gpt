import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const [
      totalTests,
      finishedTests,
      stopsByType,
      testsByModel,
      recentTests,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM tests`,
      sql`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as on_time,
          COUNT(CASE WHEN actual_duration_minutes > expected_duration_minutes THEN 1 END)::int as exceeded,
          COALESCE(AVG(actual_duration_minutes), 0)::float as avg_duration,
          COALESCE(AVG(expected_duration_minutes), 0)::float as avg_expected
        FROM tests
        WHERE finished_at IS NOT NULL
      `,
      sql`
        SELECT stop_type, COUNT(*)::int as count
        FROM stops
        GROUP BY stop_type
        ORDER BY count DESC
      `,
      sql`
        SELECT 
          model,
          COUNT(*)::int as total,
          COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as on_time,
          COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes > expected_duration_minutes THEN 1 END)::int as exceeded,
          COALESCE(AVG(CASE WHEN finished_at IS NOT NULL THEN actual_duration_minutes END), 0)::float as avg_duration
        FROM tests
        GROUP BY model
        ORDER BY total DESC
      `,
      sql`
        SELECT 
          t.*,
          COUNT(s.id)::int as stop_count
        FROM tests t
        LEFT JOIN stops s ON s.test_id = t.id
        WHERE t.finished_at IS NOT NULL
        GROUP BY t.id
        ORDER BY t.finished_at DESC
        LIMIT 50
      `,
    ])

    const totalStops = await sql`
      SELECT COUNT(*)::int as count FROM stops
    `

    const finishedCount = finishedTests[0]?.total || 0
    const avgStopsPerTest =
      finishedCount > 0
        ? (totalStops[0]?.count || 0) / finishedCount
        : 0

    return NextResponse.json({
      total_tests: totalTests[0]?.count || 0,
      finished_tests: finishedCount,
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
      recent_tests: recentTests,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados do dashboard" },
      { status: 500 }
    )
  }
}
