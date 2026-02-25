import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workNumber: string }> }
) {
  try {
    const { workNumber } = await params

    if (!/^\d{3,6}$/.test(workNumber)) {
      return NextResponse.json(
        { error: "Número da obra deve ter de 3 a 6 dígitos" },
        { status: 400 }
      )
    }

    const tests = await sql`
      SELECT 
        t.*,
        COUNT(s.id)::int as stop_count
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      WHERE t.work_number = ${workNumber}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Nenhum teste encontrado para esta obra" },
        { status: 404 }
      )
    }

    // Fetch all stops for all tests of this work
    const testIds = tests.map((t: { id: number }) => t.id)
    const stops = await sql`
      SELECT * FROM stops WHERE test_id = ANY(${testIds}) ORDER BY created_at ASC
    `

    // Group stops by test_id
    const stopsByTest: Record<number, typeof stops> = {}
    for (const stop of stops) {
      if (!stopsByTest[stop.test_id]) {
        stopsByTest[stop.test_id] = []
      }
      stopsByTest[stop.test_id].push(stop)
    }

    // Compute summary stats
    const finishedTests = tests.filter((t: { finished_at: string | null }) => t.finished_at)
    const totalTests = tests.length
    const finishedCount = finishedTests.length
    const onTimeCount = finishedTests.filter(
      (t: { actual_duration_minutes: number; expected_duration_minutes: number }) =>
        t.actual_duration_minutes <= t.expected_duration_minutes
    ).length
    const totalStops = stops.length
    const avgDuration =
      finishedCount > 0
        ? Math.round(
            finishedTests.reduce(
              (sum: number, t: { actual_duration_minutes: number }) =>
                sum + t.actual_duration_minutes,
              0
            ) / finishedCount
          )
        : 0

    // Count stop types
    const stopTypeCounts: Record<string, number> = {}
    for (const stop of stops) {
      stopTypeCounts[stop.stop_type] = (stopTypeCounts[stop.stop_type] || 0) + 1
    }
    const topStopTypes = Object.entries(stopTypeCounts)
      .map(([type, count]) => ({ stop_type: type, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      work_number: workNumber,
      summary: {
        total_tests: totalTests,
        finished_tests: finishedCount,
        on_time: onTimeCount,
        exceeded: finishedCount - onTimeCount,
        on_time_percentage: finishedCount > 0 ? Math.round((onTimeCount / finishedCount) * 100) : 0,
        total_stops: totalStops,
        avg_stops_per_test: totalTests > 0 ? +(totalStops / totalTests).toFixed(1) : 0,
        avg_duration: avgDuration,
      },
      top_stop_types: topStopTypes,
      tests: tests.map((t: { id: number }) => ({
        ...t,
        stops: stopsByTest[t.id] || [],
      })),
    })
  } catch (error) {
    console.error("Error fetching work data:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados da obra" },
      { status: 500 }
    )
  }
}
