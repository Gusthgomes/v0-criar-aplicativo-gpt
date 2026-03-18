import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stopType = searchParams.get("stop_type")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const model = searchParams.get("model")
    const bench = searchParams.get("bench")

    if (!stopType) {
      return NextResponse.json(
        { error: "stop_type é obrigatório" },
        { status: 400 }
      )
    }

    // Build conditions
    const conditions: string[] = ["s.stop_type = $1", "s.sub_type IS NOT NULL"]
    const params: (string | number)[] = [stopType]
    let paramIndex = 2

    if (dateFrom && dateTo) {
      conditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at >= $${paramIndex} AND t.finished_at <= $${paramIndex + 1})
        OR 
        (t.finished_at IS NULL AND t.created_at >= $${paramIndex} AND t.created_at <= $${paramIndex + 1})
      )`)
      params.push(`${dateFrom}T00:00:00.000Z`, `${dateTo}T23:59:59.999Z`)
      paramIndex += 2
    } else if (dateFrom) {
      conditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at >= $${paramIndex})
        OR 
        (t.finished_at IS NULL AND t.created_at >= $${paramIndex})
      )`)
      params.push(`${dateFrom}T00:00:00.000Z`)
      paramIndex++
    } else if (dateTo) {
      conditions.push(`(
        (t.finished_at IS NOT NULL AND t.finished_at <= $${paramIndex})
        OR 
        (t.finished_at IS NULL AND t.created_at <= $${paramIndex})
      )`)
      params.push(`${dateTo}T23:59:59.999Z`)
      paramIndex++
    }

    if (model) {
      conditions.push(`t.model = $${paramIndex}`)
      params.push(model)
      paramIndex++
    }

    if (bench) {
      conditions.push(`t.bench = $${paramIndex}`)
      params.push(Number(bench))
      paramIndex++
    }

    const whereClause = conditions.join(" AND ")

    const query = `
      SELECT s.sub_type, COUNT(*)::int as count
      FROM stops s
      JOIN tests t ON t.id = s.test_id
      WHERE ${whereClause}
      GROUP BY s.sub_type
      ORDER BY count DESC
    `

    const result = await sql(query, params)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching subtypes:", error)
    return NextResponse.json(
      { error: "Erro ao buscar subtipos" },
      { status: 500 }
    )
  }
}
