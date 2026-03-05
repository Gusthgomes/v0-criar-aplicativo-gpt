import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai"
import { z } from "zod"
import { sql } from "@/lib/db"

export const maxDuration = 60

// Tool para buscar informações de uma obra específica
const getWorkInfo = tool({
  description: "Busca informações detalhadas de uma obra pelo número. Use quando o usuário perguntar sobre uma obra específica.",
  inputSchema: z.object({
    workNumber: z.string().describe("Número da obra (3 a 6 dígitos)"),
  }),
  execute: async ({ workNumber }) => {
    const tests = await sql`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id) as stop_count,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM stops WHERE test_id = t.id) as total_stop_duration
      FROM tests t
      WHERE t.work_number = ${workNumber}
      ORDER BY t.created_at DESC
    `
    
    if (tests.length === 0) {
      return { found: false, message: `Nenhum teste encontrado para a obra ${workNumber}` }
    }

    const stops = await sql`
      SELECT s.* FROM stops s
      INNER JOIN tests t ON s.test_id = t.id
      WHERE t.work_number = ${workNumber}
      ORDER BY s.created_at DESC
    `

    return {
      found: true,
      workNumber,
      totalTests: tests.length,
      tests: tests.map((t: Record<string, unknown>) => ({
        id: t.id,
        model: t.model,
        bench: t.bench,
        employeeId: t.employee_id,
        expectedMinutes: t.expected_duration_minutes,
        actualMinutes: t.actual_duration_minutes,
        stopCount: t.stop_count,
        totalStopDuration: t.total_stop_duration,
        status: t.finished_at ? (Number(t.actual_duration_minutes) <= Number(t.expected_duration_minutes) ? "No Tempo" : "Excedeu") : (t.is_complete === false ? "Pausado" : "Em Andamento"),
        date: t.created_at,
      })),
      stops: stops.map((s: Record<string, unknown>) => ({
        type: s.stop_type,
        duration: s.duration_minutes,
        observations: s.observations,
        date: s.created_at,
      })),
    }
  },
})

// Tool para buscar estatísticas gerais
const getStatistics = tool({
  description: "Busca estatísticas gerais dos testes. Use para perguntas sobre totais, médias, percentuais.",
  inputSchema: z.object({
    dateFrom: z.string().nullable().describe("Data inicial no formato YYYY-MM-DD (opcional)"),
    dateTo: z.string().nullable().describe("Data final no formato YYYY-MM-DD (opcional)"),
    model: z.string().nullable().describe("Filtrar por modelo específico (opcional)"),
    bench: z.number().nullable().describe("Filtrar por banca específica (opcional)"),
  }),
  execute: async ({ dateFrom, dateTo, model, bench }) => {
    let whereClause = "WHERE t.finished_at IS NOT NULL"
    if (dateFrom) whereClause += ` AND t.created_at >= '${dateFrom}'`
    if (dateTo) whereClause += ` AND t.created_at <= '${dateTo}T23:59:59'`
    if (model) whereClause += ` AND t.model = '${model}'`
    if (bench) whereClause += ` AND t.bench = ${bench}`

    const stats = await sql(`
      SELECT 
        COUNT(*)::int as total_tests,
        COUNT(CASE WHEN t.actual_duration_minutes <= t.expected_duration_minutes THEN 1 END)::int as on_time,
        COUNT(CASE WHEN t.actual_duration_minutes > t.expected_duration_minutes THEN 1 END)::int as exceeded,
        ROUND(AVG(t.actual_duration_minutes))::int as avg_duration,
        ROUND(AVG(t.expected_duration_minutes))::int as avg_expected
      FROM tests t
      ${whereClause}
    `)

    const stopStats = await sql(`
      SELECT 
        s.stop_type,
        COUNT(*)::int as count,
        ROUND(AVG(COALESCE(s.duration_minutes, 0)))::int as avg_duration
      FROM stops s
      INNER JOIN tests t ON s.test_id = t.id
      ${whereClause}
      GROUP BY s.stop_type
      ORDER BY count DESC
      LIMIT 10
    `)

    const s = stats[0]
    return {
      totalTests: s.total_tests,
      onTime: s.on_time,
      exceeded: s.exceeded,
      onTimePercentage: s.total_tests > 0 ? Math.round((s.on_time / s.total_tests) * 100) : 0,
      avgDurationMinutes: s.avg_duration,
      avgExpectedMinutes: s.avg_expected,
      topStops: stopStats.map((st: Record<string, unknown>) => ({
        type: st.stop_type,
        count: st.count,
        avgDuration: st.avg_duration,
      })),
      filters: { dateFrom, dateTo, model, bench },
    }
  },
})

// Tool para buscar testes por colaborador
const getEmployeeTests = tool({
  description: "Busca testes realizados por um colaborador específico (8ID).",
  inputSchema: z.object({
    employeeId: z.string().describe("8ID do colaborador (8 dígitos)"),
  }),
  execute: async ({ employeeId }) => {
    const tests = await sql`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id) as stop_count
      FROM tests t
      WHERE t.employee_id = ${employeeId}
      ORDER BY t.created_at DESC
      LIMIT 50
    `

    if (tests.length === 0) {
      return { found: false, message: `Nenhum teste encontrado para o colaborador ${employeeId}` }
    }

    const onTime = tests.filter((t: Record<string, unknown>) => t.finished_at && Number(t.actual_duration_minutes) <= Number(t.expected_duration_minutes)).length
    const finished = tests.filter((t: Record<string, unknown>) => t.finished_at).length

    return {
      found: true,
      employeeId,
      totalTests: tests.length,
      finishedTests: finished,
      onTime,
      exceeded: finished - onTime,
      onTimePercentage: finished > 0 ? Math.round((onTime / finished) * 100) : 0,
      tests: tests.slice(0, 10).map((t: Record<string, unknown>) => ({
        workNumber: t.work_number,
        model: t.model,
        bench: t.bench,
        status: t.finished_at ? (Number(t.actual_duration_minutes) <= Number(t.expected_duration_minutes) ? "No Tempo" : "Excedeu") : "Em Andamento",
        stopCount: t.stop_count,
        date: t.created_at,
      })),
    }
  },
})

// Tool para buscar obras com uma parada específica
const getStopTypeWorks = tool({
  description: "Busca todas as obras que tiveram um tipo específico de parada.",
  inputSchema: z.object({
    stopType: z.string().describe("Tipo de parada (ex: Retrabalho, Setup, Erro de montagem)"),
  }),
  execute: async ({ stopType }) => {
    const works = await sql`
      SELECT DISTINCT 
        t.work_number,
        t.model,
        COUNT(s.id)::int as stop_count,
        SUM(COALESCE(s.duration_minutes, 0))::int as total_duration
      FROM stops s
      INNER JOIN tests t ON s.test_id = t.id
      WHERE LOWER(s.stop_type) LIKE LOWER(${`%${stopType}%`})
      GROUP BY t.work_number, t.model
      ORDER BY stop_count DESC
      LIMIT 20
    `

    return {
      stopType,
      totalWorks: works.length,
      works: works.map((w: Record<string, unknown>) => ({
        workNumber: w.work_number,
        model: w.model,
        occurrences: w.stop_count,
        totalDuration: w.total_duration,
      })),
    }
  },
})

// Tool para comparar modelos
const compareModels = tool({
  description: "Compara o desempenho entre diferentes modelos de obra.",
  inputSchema: z.object({
    models: z.array(z.string()).describe("Lista de modelos para comparar (ex: ['M76', 'M77'])"),
  }),
  execute: async ({ models }) => {
    const modelList = models.map(m => `'${m}'`).join(",")
    
    const stats = await sql(`
      SELECT 
        t.model,
        COUNT(*)::int as total_tests,
        COUNT(CASE WHEN t.actual_duration_minutes <= t.expected_duration_minutes THEN 1 END)::int as on_time,
        ROUND(AVG(t.actual_duration_minutes))::int as avg_duration,
        ROUND(AVG(t.expected_duration_minutes))::int as expected_duration
      FROM tests t
      WHERE t.finished_at IS NOT NULL AND t.model IN (${modelList})
      GROUP BY t.model
      ORDER BY t.model
    `)

    return {
      comparison: stats.map((s: Record<string, unknown>) => ({
        model: s.model,
        totalTests: s.total_tests,
        onTime: s.on_time,
        onTimePercentage: Number(s.total_tests) > 0 ? Math.round((Number(s.on_time) / Number(s.total_tests)) * 100) : 0,
        avgDuration: s.avg_duration,
        expectedDuration: s.expected_duration,
        difference: Number(s.avg_duration) - Number(s.expected_duration),
      })),
    }
  },
})

const tools = {
  getWorkInfo,
  getStatistics,
  getEmployeeTests,
  getStopTypeWorks,
  compareModels,
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: `Você é um assistente especializado em análise de testes de obras industriais. 
Você tem acesso a um banco de dados com informações sobre testes de obras, incluindo:
- Testes realizados (obra, modelo, banca, colaborador, tempo esperado vs realizado)
- Paradas durante os testes (tipo de parada, duração, observações)

Responda sempre em português brasileiro de forma clara e objetiva.
Quando apresentar dados numéricos, formate de forma legível (ex: duração em horas e minutos).
Se não encontrar dados, informe educadamente ao usuário.

Tipos de parada disponíveis: Erro de montagem, Erro de fornecedor, Retrabalho, Movimentação, Erro de especificação, Software, Desconexão, PTE PCO PFI ZETE, Falta de material, Material trocado, Material sem identificação, Sem saldo comprado, Sem saldo fabricado, Falha não identificada, Apoio DPCP, Setup, Vinculação, Parada pessoal, Refeição, Apoio técnico, GD.

Modelos disponíveis: M25, M28, M29, M30, M31, M33, M34, M35, M73, M74, M75, M76, M77, OUTROS.`,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
