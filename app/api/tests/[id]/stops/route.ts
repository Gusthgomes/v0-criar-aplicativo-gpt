import { sql } from "@/lib/db"
import { STOP_TYPES } from "@/lib/constants"
import { NextResponse } from "next/server"
import type { StopType } from "@/lib/constants"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { stop_type, observations } = body

    if (!stop_type) {
      return NextResponse.json(
        { error: "Tipo de parada é obrigatório" },
        { status: 400 }
      )
    }

    if (!STOP_TYPES.includes(stop_type as StopType)) {
      return NextResponse.json(
        { error: "Tipo de parada inválido" },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO stops (test_id, stop_type, observations)
      VALUES (${testId}, ${stop_type}, ${observations || null})
      RETURNING *
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating stop:", error)
    return NextResponse.json(
      { error: "Erro ao registrar parada" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      )
    }

    const stops = await sql`
      SELECT * FROM stops WHERE test_id = ${testId} ORDER BY created_at ASC
    `

    return NextResponse.json(stops)
  } catch (error) {
    console.error("Error fetching stops:", error)
    return NextResponse.json(
      { error: "Erro ao buscar paradas" },
      { status: 500 }
    )
  }
}
