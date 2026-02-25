import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Data inicial e final são obrigatórias" },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use AAAA-MM-DD" },
        { status: 400 }
      )
    }

    // Fetch tests within date range
    const tests = await sql`
      SELECT 
        t.*,
        COUNT(s.id)::int as stop_count
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      WHERE t.created_at >= ${startDate}::date
        AND t.created_at < (${endDate}::date + interval '1 day')
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Nenhum teste encontrado no período selecionado" },
        { status: 404 }
      )
    }

    // Fetch all stops for these tests
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

    const exportData = {
      exported_at: new Date().toISOString(),
      period: {
        start: startDate,
        end: endDate,
      },
      total_tests: tests.length,
      total_stops: stops.length,
      tests: tests.map((t: { id: number }) => ({
        ...t,
        stops: stopsByTest[t.id] || [],
      })),
    }

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gpt-v01-export-${startDate}-a-${endDate}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting data:", error)
    return NextResponse.json(
      { error: "Erro ao exportar dados" },
      { status: 500 }
    )
  }
}
