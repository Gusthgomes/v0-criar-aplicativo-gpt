import { sql } from "@/lib/db"
import { MODEL_DURATION_MINUTES, MODELS, BENCHES } from "@/lib/constants"
import { NextResponse } from "next/server"
import type { Model } from "@/lib/constants"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employee_id, work_number, model, bench } = body

    if (
      !employee_id ||
      !work_number ||
      !model ||
      bench === undefined ||
      bench === null
    ) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      )
    }

    if (!/^\d{8}$/.test(employee_id)) {
      return NextResponse.json(
        { error: "8ID deve ter exatamente 8 dígitos" },
        { status: 400 }
      )
    }

    if (!/^\d{3,6}$/.test(work_number)) {
      return NextResponse.json(
        { error: "Número da obra deve ter de 3 a 6 dígitos" },
        { status: 400 }
      )
    }

    if (!MODELS.includes(model as Model)) {
      return NextResponse.json(
        { error: "Modelo inválido" },
        { status: 400 }
      )
    }

    const benchNum = Number(bench)
    if (!BENCHES.includes(benchNum as (typeof BENCHES)[number])) {
      return NextResponse.json(
        { error: "Banca deve ser de 1 a 8" },
        { status: 400 }
      )
    }

    const expected_duration_minutes = MODEL_DURATION_MINUTES[model as Model]

    const result = await sql`
      INSERT INTO tests (employee_id, work_number, model, bench, expected_duration_minutes)
      VALUES (${employee_id}, ${work_number}, ${model}, ${benchNum}, ${expected_duration_minutes})
      RETURNING id
    `

    return NextResponse.json({ id: result[0].id }, { status: 201 })
  } catch (error) {
    console.error("Error creating test:", error)
    return NextResponse.json(
      { error: "Erro ao criar teste" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const tests = await sql`
      SELECT 
        t.*,
        COUNT(s.id)::int as stop_count
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `
    return NextResponse.json(tests)
  } catch (error) {
    console.error("Error fetching tests:", error)
    return NextResponse.json(
      { error: "Erro ao buscar testes" },
      { status: 500 }
    )
  }
}
