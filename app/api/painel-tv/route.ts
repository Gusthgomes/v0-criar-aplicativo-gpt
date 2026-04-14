import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]
    
    // KPIs do dia
    const testsToday = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END) as finished,
        COUNT(CASE WHEN finished_at IS NULL AND is_complete IS NULL THEN 1 END) as in_progress,
        COUNT(CASE WHEN is_complete = false THEN 1 END) as paused,
        AVG(CASE WHEN actual_duration_minutes IS NOT NULL THEN actual_duration_minutes END) as avg_duration
      FROM tests
      WHERE DATE(created_at) = ${today}::date OR DATE(finished_at) = ${today}::date
    `

    // Taxa de aprovação no tempo (finalizados dentro do tempo esperado)
    const approvalRate = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN actual_duration_minutes <= expected_duration_minutes THEN 1 END) as approved
      FROM tests
      WHERE finished_at IS NOT NULL
        AND (DATE(created_at) = ${today}::date OR DATE(finished_at) = ${today}::date)
    `

    // Aprovação no primeiro teste (sem paradas de erro)
    const firstTestApproval = await sql`
      SELECT COUNT(*) as total, COUNT(*) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM stops s 
          WHERE s.test_id = t.id 
          AND s.stop_type IN ('Erro de montagem', 'Erro de fornecedor', 'Retrabalho', 'Erro de especificação', 'Material trocado')
        )
      ) as approved
      FROM (
        SELECT DISTINCT ON (work_number) id, work_number
        FROM tests
        WHERE DATE(created_at) = ${today}::date OR DATE(finished_at) = ${today}::date
        ORDER BY work_number, created_at ASC
      ) t
    `

    // Testes em andamento com detalhes
    const activeTests = await sql`
      SELECT 
        t.id, t.work_number, t.model, t.bench, t.employee_id,
        t.expected_duration_minutes, t.created_at,
        COALESCE(SUM(s.duration_minutes), 0) as total_stop_duration
      FROM tests t
      LEFT JOIN stops s ON s.test_id = t.id
      WHERE t.finished_at IS NULL AND t.is_complete IS NULL
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `

    // Testes pausados
    const pausedTests = await sql`
      SELECT 
        t.id, t.work_number, t.model, t.bench, t.employee_id,
        t.expected_duration_minutes, t.created_at
      FROM tests t
      WHERE t.is_complete = false
      ORDER BY t.created_at ASC
    `

    // Últimos testes finalizados
    const recentTests = await sql`
      SELECT 
        t.work_number, t.model, t.bench, t.employee_id,
        t.expected_duration_minutes, t.actual_duration_minutes,
        t.finished_at,
        CASE WHEN t.actual_duration_minutes <= t.expected_duration_minutes THEN true ELSE false END as on_time
      FROM tests t
      WHERE t.finished_at IS NOT NULL
        AND (DATE(created_at) = ${today}::date OR DATE(finished_at) = ${today}::date)
      ORDER BY t.finished_at DESC
      LIMIT 8
    `

    // Timeline das bancas (para o gráfico Gantt)
    const benchTimeline = await sql`
      SELECT 
        t.bench,
        t.work_number,
        t.model,
        t.created_at as start_time,
        t.finished_at as end_time,
        t.expected_duration_minutes,
        t.actual_duration_minutes,
        CASE 
          WHEN t.finished_at IS NULL AND t.is_complete IS NULL THEN 'in_progress'
          WHEN t.is_complete = false THEN 'paused'
          WHEN t.actual_duration_minutes <= t.expected_duration_minutes THEN 'on_time'
          ELSE 'exceeded'
        END as status
      FROM tests t
      WHERE DATE(t.created_at) = ${today}::date OR DATE(t.finished_at) = ${today}::date
      ORDER BY t.bench, t.created_at ASC
    `

    // Produtividade por modelo
    const productivityByModel = await sql`
      SELECT 
        model,
        COUNT(*) as total,
        COUNT(CASE WHEN actual_duration_minutes <= expected_duration_minutes THEN 1 END) as on_time
      FROM tests
      WHERE finished_at IS NOT NULL
        AND (DATE(created_at) = ${today}::date OR DATE(finished_at) = ${today}::date)
      GROUP BY model
      ORDER BY total DESC
    `

    const stats = testsToday[0]
    const approval = approvalRate[0]
    const firstTest = firstTestApproval[0]

    return NextResponse.json({
      date: today,
      kpis: {
        totalTests: Number(stats.total) || 0,
        finishedTests: Number(stats.finished) || 0,
        inProgressTests: Number(stats.in_progress) || 0,
        pausedTests: Number(stats.paused) || 0,
        avgDuration: Math.round(Number(stats.avg_duration) || 0),
        approvalRate: approval.total > 0 
          ? Math.round((Number(approval.approved) / Number(approval.total)) * 100)
          : 0,
        firstTestApprovalRate: firstTest.total > 0
          ? Math.round((Number(firstTest.approved) / Number(firstTest.total)) * 100)
          : 0,
        firstTestApproved: Number(firstTest.approved) || 0,
        firstTestTotal: Number(firstTest.total) || 0,
      },
      activeTests,
      pausedTests,
      recentTests,
      benchTimeline,
      productivityByModel,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao buscar dados do painel:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados do painel" },
      { status: 500 }
    )
  }
}
