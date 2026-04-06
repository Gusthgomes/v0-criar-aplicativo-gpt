import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Buscar todos os testes de hoje (iniciados ou finalizados hoje)
    const today = new Date().toISOString().split("T")[0]
    
    const tests = await sql`
      SELECT 
        t.id,
        t.work_number,
        t.model,
        t.bench,
        t.expected_duration_minutes,
        t.actual_duration_minutes,
        t.created_at,
        t.finished_at,
        t.is_complete
      FROM tests t
      WHERE DATE(t.created_at) = ${today}::date
         OR DATE(t.finished_at) = ${today}::date
      ORDER BY t.bench ASC, t.created_at ASC
    `

    // Agrupar por banca (1 a 8)
    const benchData: Record<number, {
      bench: number
      tests: {
        id: number
        work_number: string
        model: string
        start_time: string
        end_time: string | null
        expected_minutes: number
        actual_minutes: number | null
        exceeded: boolean
        in_progress: boolean
      }[]
    }> = {}

    // Inicializar todas as 8 bancas
    for (let i = 1; i <= 8; i++) {
      benchData[i] = { bench: i, tests: [] }
    }

    const now = new Date()

    // Processar cada teste
    for (const test of tests) {
      const bench = test.bench
      if (bench < 1 || bench > 8) continue

      const startTime = new Date(test.created_at)
      const endTime = test.finished_at ? new Date(test.finished_at) : null
      const inProgress = !test.finished_at && test.is_complete !== false
      
      // Calcular tempo real
      let actualMinutes = test.actual_duration_minutes
      if (!actualMinutes && !endTime) {
        // Teste em andamento - calcular tempo decorrido
        actualMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000)
      }

      const exceeded = actualMinutes ? actualMinutes > test.expected_duration_minutes : false

      benchData[bench].tests.push({
        id: test.id,
        work_number: test.work_number,
        model: test.model,
        start_time: test.created_at,
        end_time: test.finished_at,
        expected_minutes: test.expected_duration_minutes,
        actual_minutes: actualMinutes,
        exceeded,
        in_progress: inProgress
      })
    }

    // Converter para array
    const benchArray = Object.values(benchData).sort((a, b) => a.bench - b.bench)

    return NextResponse.json({
      date: today,
      benches: benchArray,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error("Erro ao buscar timeline:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados da timeline" },
      { status: 500 }
    )
  }
}
