import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Find tests that were paused (not finished and is_complete = false)
    const pendingTests = await sql`
      SELECT 
        t.*,
        COUNT(s.id)::int as stop_count
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      WHERE t.finished_at IS NULL 
        AND t.is_complete = false
      GROUP BY t.id
      ORDER BY t.paused_at DESC
    `

    return NextResponse.json(pendingTests)
  } catch (error) {
    console.error("Error fetching pending tests:", error)
    return NextResponse.json(
      { error: "Erro ao buscar testes pendentes" },
      { status: 500 }
    )
  }
}
