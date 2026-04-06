import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Buscar todos os testes em andamento (não finalizados e não pausados)
    const activeTests = await sql`
      SELECT 
        t.id,
        t.work_number,
        t.model,
        t.bench,
        t.employee_id,
        t.expected_duration_minutes,
        t.created_at,
        t.is_complete,
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as total_stop_duration
      FROM tests t
      WHERE t.finished_at IS NULL 
        AND (t.is_complete IS NULL OR t.is_complete = TRUE)
      ORDER BY t.created_at ASC
    `

    // Buscar testes pausados
    const pausedTests = await sql`
      SELECT 
        t.id,
        t.work_number,
        t.model,
        t.bench,
        t.employee_id,
        t.expected_duration_minutes,
        t.created_at,
        t.is_complete,
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as total_stop_duration
      FROM tests t
      WHERE t.finished_at IS NULL 
        AND t.is_complete = FALSE
      ORDER BY t.created_at ASC
    `

    // Calcular tempo decorrido e status para cada teste
    const now = new Date()
    
    const processTests = (tests: typeof activeTests, isPaused: boolean) => {
      return tests.map(test => {
        const startTime = new Date(test.created_at)
        const elapsedMs = now.getTime() - startTime.getTime()
        const elapsedMinutes = Math.floor(elapsedMs / 60000)
        const effectiveElapsed = Math.max(0, elapsedMinutes - (test.total_stop_duration || 0))
        
        console.log(`[v0] Test ${test.work_number}: created_at=${test.created_at}, startTime=${startTime.toISOString()}, now=${now.toISOString()}, elapsedMs=${elapsedMs}, elapsedMinutes=${elapsedMinutes}, stopDuration=${test.total_stop_duration}, effectiveElapsed=${effectiveElapsed}`)
        
        const expectedMinutes = test.expected_duration_minutes
        const percentComplete = Math.min((effectiveElapsed / expectedMinutes) * 100, 150)
        
        // Status baseado no progresso
        let urgency: "ok" | "warning" | "danger" = "ok"
        if (percentComplete >= 100) {
          urgency = "danger"
        } else if (percentComplete >= 80) {
          urgency = "warning"
        }

        return {
          ...test,
          elapsed_minutes: effectiveElapsed,
          percent_complete: Math.round(percentComplete),
          urgency,
          is_paused: isPaused,
          start_time: test.created_at
        }
      })
    }

    const processedActive = processTests(activeTests, false)
    const processedPaused = processTests(pausedTests, true)

    // Ordenar por urgência (danger primeiro, depois warning, depois ok)
    const urgencyOrder = { danger: 0, warning: 1, ok: 2 }
    const allTests = [...processedActive, ...processedPaused].sort((a, b) => {
      // Pausados vão para o final
      if (a.is_paused !== b.is_paused) return a.is_paused ? 1 : -1
      // Ordenar por urgência
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      }
      // Depois por percentual (maior primeiro)
      return b.percent_complete - a.percent_complete
    })

    return NextResponse.json({
      tests: allTests,
      total_active: processedActive.length,
      total_paused: processedPaused.length,
      timestamp: now.toISOString()
    })
  } catch (error) {
    console.error("Erro ao buscar testes ativos:", error)
    return NextResponse.json(
      { error: "Erro ao buscar testes ativos" },
      { status: 500 }
    )
  }
}
