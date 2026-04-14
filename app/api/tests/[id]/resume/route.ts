import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testId = Number(id)
    
    // Verificar se tem um novo employee_id no body
    let newEmployeeId: string | null = null
    try {
      const body = await request.json()
      newEmployeeId = body.employee_id || null
    } catch {
      // Sem body ou body inválido, continua sem alterar employee_id
    }

    if (isNaN(testId)) {
      return NextResponse.json(
        { error: "ID invalido" },
        { status: 400 }
      )
    }

    // Check that the test exists, is finished, and is NOT complete
    const tests = await sql`
      SELECT * FROM tests WHERE id = ${testId}
    `

    if (tests.length === 0) {
      return NextResponse.json(
        { error: "Teste nao encontrado" },
        { status: 404 }
      )
    }

    const test = tests[0]

    // Teste completo (is_complete = true) não pode ser retomado
    if (test.is_complete === true) {
      return NextResponse.json(
        { error: "Este teste ja foi finalizado como completo e nao pode ser retomado" },
        { status: 400 }
      )
    }

    // Teste pausado deve ter: finished_at = NULL e is_complete = false
    if (test.is_complete !== false) {
      return NextResponse.json(
        { error: "Este teste nao esta pausado" },
        { status: 400 }
      )
    }

    // Retomar o teste: marca que está sendo retomado e atualiza employee_id se necessário
    // O elapsed_seconds_at_pause será usado pelo timer para saber de onde continuar
    let result
    if (newEmployeeId) {
      result = await sql`
        UPDATE tests 
        SET is_complete = NULL, employee_id = ${newEmployeeId}
        WHERE id = ${testId}
        RETURNING *
      `
    } else {
      result = await sql`
        UPDATE tests 
        SET is_complete = NULL
        WHERE id = ${testId}
        RETURNING *
      `
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error resuming test:", error)
    return NextResponse.json(
      { error: "Erro ao retomar teste" },
      { status: 500 }
    )
  }
}
