import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Função para formatar duração em minutos para texto legível
function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return "0min"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

// Função para formatar data
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Parser de comandos - detecta o que o usuário quer
function parseQuery(input: string): { type: string; value: string } | null {
  const text = input.toLowerCase().trim()

  // Busca por obra: "obra 123456", "123456", "dados da obra 123456"
  const obraMatch = text.match(/(?:obra\s*)?(\d{5,6})(?:\s|$)/i)
  if (obraMatch) {
    return { type: "obra", value: obraMatch[1] }
  }

  // Busca por modelo: "modelo M76", "M76", "estatísticas do M76"
  const modeloMatch = text.match(/(?:modelo\s*)?(m\d{2}|outros)/i)
  if (modeloMatch) {
    return { type: "modelo", value: modeloMatch[1].toUpperCase() }
  }

  // Busca por colaborador/8ID: "colaborador 10284005", "8id 10284005"
  const colaboradorMatch = text.match(/(?:colaborador|8id|funcionario)\s*(\d{8})/i)
  if (colaboradorMatch) {
    return { type: "colaborador", value: colaboradorMatch[1] }
  }

  // Busca por banca: "banca 3", "bancada 3"
  const bancaMatch = text.match(/(?:banca|bancada)\s*(\d{1,2})/i)
  if (bancaMatch) {
    return { type: "banca", value: bancaMatch[1] }
  }

  // Busca por parada: "parada retrabalho", "paradas de setup"
  const paradaMatch = text.match(/(?:parada|paradas)(?:\s+de)?\s+(.+)/i)
  if (paradaMatch) {
    return { type: "parada", value: paradaMatch[1].trim() }
  }

  // Busca por data: "hoje", "ontem", "03/03/2026"
  if (text.includes("hoje")) {
    const today = new Date().toISOString().split("T")[0]
    return { type: "data", value: today }
  }
  if (text.includes("ontem")) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    return { type: "data", value: yesterday }
  }
  const dataMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dataMatch) {
    const [, day, month, year] = dataMatch
    return { type: "data", value: `${year}-${month}-${day}` }
  }

  // Estatísticas gerais
  if (text.includes("estatistica") || text.includes("resumo") || text.includes("geral") || text.includes("total")) {
    return { type: "estatisticas", value: "" }
  }

  // Busca por status: "status em andamento", "obras pausadas", "testes excederam"
  const statusMatch = text.match(/(?:status|obras?|testes?)\s*(?:que\s*)?(em andamento|andamento|pausad[oa]s?|excede(?:u|ram)?|no tempo|finalizad[oa]s?)/i)
  if (statusMatch) {
    const statusValue = statusMatch[1].toLowerCase()
    if (statusValue.includes("andamento")) return { type: "status", value: "em_andamento" }
    if (statusValue.includes("pausad")) return { type: "status", value: "pausado" }
    if (statusValue.includes("exced")) return { type: "status", value: "excedeu" }
    if (statusValue.includes("tempo")) return { type: "status", value: "no_tempo" }
    if (statusValue.includes("finaliz")) return { type: "status", value: "finalizado" }
  }

  // Ajuda
  if (text.includes("ajuda") || text.includes("help") || text.includes("comando")) {
    return { type: "ajuda", value: "" }
  }

  return null
}

// Busca dados de uma obra específica
async function buscarObra(workNumber: string): Promise<string> {
  const tests = await sql`
    SELECT t.*, 
      (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count,
      (SELECT COALESCE(SUM(duration_minutes), 0) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as total_stop_duration
    FROM tests t
    WHERE t.work_number = ${workNumber}
    ORDER BY t.created_at DESC
  `

  if (tests.length === 0) {
    return `Nenhum teste encontrado para a obra **${workNumber}**.`
  }

  let response = `**Obra ${workNumber}** - ${tests.length} teste(s) encontrado(s)\n\n`

  for (const test of tests) {
    const status = test.finished_at
      ? test.actual_duration_minutes <= test.expected_duration_minutes
        ? "No Tempo"
        : "Excedeu"
      : test.is_complete === false
      ? "Pausado"
      : "Em Andamento"

    response += `---\n`
    response += `**Teste #${test.id}**\n`
    response += `- Modelo: **${test.model}** | Banca: **${test.bench}** | 8ID: **${test.employee_id}**\n`
    response += `- Tempo Estipulado: ${formatDuration(test.expected_duration_minutes)}\n`
    response += `- Tempo Real: ${test.actual_duration_minutes ? formatDuration(test.actual_duration_minutes) : "-"}\n`
    response += `- Status: **${status}**\n`
    response += `- Paradas: ${test.stop_count} (${formatDuration(test.total_stop_duration)} parado)\n`
    response += `- Data: ${formatDate(test.created_at)}\n`

    // Buscar paradas desse teste
    if (test.stop_count > 0) {
      const stops = await sql`SELECT * FROM stops WHERE test_id = ${test.id} ORDER BY created_at`
      response += `- Detalhes das paradas:\n`
      for (const stop of stops) {
        response += `  • ${stop.stop_type}${stop.duration_minutes ? ` (${formatDuration(stop.duration_minutes)})` : ""}${stop.observations ? ` - ${stop.observations}` : ""}\n`
      }
    }
    response += "\n"
  }

  return response
}

// Busca estatísticas de um modelo
async function buscarModelo(model: string): Promise<string> {
  const stats = await sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END)::int as finalizados,
      COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as no_tempo,
      COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes > expected_duration_minutes THEN 1 END)::int as excedeu,
      ROUND(AVG(actual_duration_minutes))::int as tempo_medio
    FROM tests
    WHERE model = ${model}
  `

  if (stats[0].total === 0) {
    return `Nenhum teste encontrado para o modelo **${model}**.`
  }

  const s = stats[0]
  const pctNoTempo = s.finalizados > 0 ? Math.round((s.no_tempo / s.finalizados) * 100) : 0

  let response = `**Estatísticas do Modelo ${model}**\n\n`
  response += `- Total de Testes: **${s.total}**\n`
  response += `- Finalizados: **${s.finalizados}**\n`
  response += `- No Tempo: **${s.no_tempo}** (${pctNoTempo}%)\n`
  response += `- Excederam: **${s.excedeu}** (${100 - pctNoTempo}%)\n`
  response += `- Tempo Médio: **${s.tempo_medio ? formatDuration(s.tempo_medio) : "N/A"}**\n`

  // Top paradas
  const topStops = await sql`
    SELECT s.stop_type, COUNT(*)::int as count
    FROM stops s
    JOIN tests t ON t.id = s.test_id
    WHERE t.model = ${model}
    GROUP BY s.stop_type
    ORDER BY count DESC
    LIMIT 5
  `

  if (topStops.length > 0) {
    response += `\n**Paradas mais comuns:**\n`
    for (const stop of topStops) {
      response += `- ${stop.stop_type}: ${stop.count}x\n`
    }
  }

  return response
}

// Busca testes de um colaborador
async function buscarColaborador(employeeId: string): Promise<string> {
  const tests = await sql`
    SELECT t.*, 
      (SELECT COUNT(*) FROM stops WHERE test_id = t.id)::int as stop_count
    FROM tests t
    WHERE t.employee_id = ${employeeId}
    ORDER BY t.created_at DESC
    LIMIT 20
  `

  if (tests.length === 0) {
    return `Nenhum teste encontrado para o colaborador **${employeeId}**.`
  }

  const stats = await sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as no_tempo
    FROM tests
    WHERE employee_id = ${employeeId} AND finished_at IS NOT NULL
  `

  const s = stats[0]
  const pctNoTempo = s.total > 0 ? Math.round((s.no_tempo / s.total) * 100) : 0

  let response = `**Colaborador ${employeeId}**\n`
  response += `- Total de Testes Finalizados: **${s.total}** | No Tempo: **${pctNoTempo}%**\n\n`
  response += `**Últimos testes:**\n`

  for (const test of tests.slice(0, 10)) {
    const status = test.finished_at
      ? test.actual_duration_minutes <= test.expected_duration_minutes
        ? "OK"
        : "Excedeu"
      : "Em andamento"
    response += `- Obra **${test.work_number}** (${test.model}) - ${status} - ${test.stop_count} parada(s)\n`
  }

  return response
}

// Busca testes de uma banca
async function buscarBanca(bench: string): Promise<string> {
  const stats = await sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as no_tempo
    FROM tests
    WHERE bench = ${parseInt(bench)} AND finished_at IS NOT NULL
  `

  const recentTests = await sql`
    SELECT work_number, model, employee_id, actual_duration_minutes, expected_duration_minutes, created_at
    FROM tests
    WHERE bench = ${parseInt(bench)}
    ORDER BY created_at DESC
    LIMIT 10
  `

  if (stats[0].total === 0 && recentTests.length === 0) {
    return `Nenhum teste encontrado para a banca **${bench}**.`
  }

  const s = stats[0]
  const pctNoTempo = s.total > 0 ? Math.round((s.no_tempo / s.total) * 100) : 0

  let response = `**Banca ${bench}**\n`
  response += `- Total de Testes Finalizados: **${s.total}** | No Tempo: **${pctNoTempo}%**\n\n`
  response += `**Últimos testes:**\n`

  for (const test of recentTests) {
    const status = test.actual_duration_minutes
      ? test.actual_duration_minutes <= test.expected_duration_minutes
        ? "OK"
        : "Excedeu"
      : "Em andamento"
    response += `- Obra **${test.work_number}** (${test.model}) - 8ID: ${test.employee_id} - ${status}\n`
  }

  return response
}

// Busca obras com determinado tipo de parada
async function buscarParada(stopType: string): Promise<string> {
  // Busca paradas que contenham o texto
  const stops = await sql`
    SELECT DISTINCT ON (t.work_number) t.work_number, t.model, t.bench, s.stop_type, s.duration_minutes
    FROM stops s
    JOIN tests t ON t.id = s.test_id
    WHERE LOWER(s.stop_type) LIKE LOWER(${`%${stopType}%`})
    ORDER BY t.work_number, s.created_at DESC
    LIMIT 20
  `

  if (stops.length === 0) {
    return `Nenhuma obra encontrada com parada "**${stopType}**".`
  }

  const totalCount = await sql`
    SELECT COUNT(DISTINCT t.work_number)::int as count
    FROM stops s
    JOIN tests t ON t.id = s.test_id
    WHERE LOWER(s.stop_type) LIKE LOWER(${`%${stopType}%`})
  `

  let response = `**Obras com parada "${stopType}"**\n`
  response += `- **${totalCount[0].count}** obra(s) encontrada(s)\n\n`

  for (const stop of stops) {
    response += `- Obra **${stop.work_number}** (${stop.model}, Banca ${stop.bench})${stop.duration_minutes ? ` - ${formatDuration(stop.duration_minutes)}` : ""}\n`
  }

  return response
}

// Busca testes de uma data
async function buscarData(date: string): Promise<string> {
  const tests = await sql`
    SELECT t.*, 
      (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
    FROM tests t
    WHERE DATE(t.created_at) = ${date}::date
    ORDER BY t.created_at DESC
  `

  if (tests.length === 0) {
    return `Nenhum teste encontrado para a data **${date.split("-").reverse().join("/")}**.`
  }

  const finalizados = tests.filter((t: { finished_at: string | null }) => t.finished_at)
  const noTempo = finalizados.filter((t: { actual_duration_minutes: number; expected_duration_minutes: number }) => 
    t.actual_duration_minutes <= t.expected_duration_minutes
  )

  let response = `**Testes em ${date.split("-").reverse().join("/")}**\n`
  response += `- Total: **${tests.length}** | Finalizados: **${finalizados.length}** | No Tempo: **${noTempo.length}**\n\n`

  for (const test of tests) {
    const status = test.finished_at
      ? test.actual_duration_minutes <= test.expected_duration_minutes
        ? "OK"
        : "Excedeu"
      : "Em andamento"
    response += `- Obra **${test.work_number}** (${test.model}, Banca ${test.bench}) - ${status} - ${test.stop_count} parada(s)\n`
  }

  return response
}

// Busca estatísticas gerais
async function buscarEstatisticas(): Promise<string> {
  const stats = await sql`
    SELECT 
      COUNT(*)::int as total,
      COUNT(CASE WHEN finished_at IS NOT NULL THEN 1 END)::int as finalizados,
      COUNT(CASE WHEN finished_at IS NOT NULL AND actual_duration_minutes <= expected_duration_minutes THEN 1 END)::int as no_tempo,
      ROUND(AVG(actual_duration_minutes))::int as tempo_medio
    FROM tests
  `

  const topModels = await sql`
    SELECT model, COUNT(*)::int as count
    FROM tests
    WHERE finished_at IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
    LIMIT 5
  `

  const topStops = await sql`
    SELECT stop_type, COUNT(*)::int as count
    FROM stops
    GROUP BY stop_type
    ORDER BY count DESC
    LIMIT 5
  `

  const s = stats[0]
  const pctNoTempo = s.finalizados > 0 ? Math.round((s.no_tempo / s.finalizados) * 100) : 0

  let response = `**Estatísticas Gerais**\n\n`
  response += `- Total de Testes: **${s.total}**\n`
  response += `- Finalizados: **${s.finalizados}**\n`
  response += `- No Tempo: **${s.no_tempo}** (${pctNoTempo}%)\n`
  response += `- Tempo Médio: **${s.tempo_medio ? formatDuration(s.tempo_medio) : "N/A"}**\n\n`

  if (topModels.length > 0) {
    response += `**Modelos mais testados:**\n`
    for (const m of topModels) {
      response += `- ${m.model}: ${m.count} testes\n`
    }
    response += "\n"
  }

  if (topStops.length > 0) {
    response += `**Paradas mais comuns:**\n`
    for (const stop of topStops) {
      response += `- ${stop.stop_type}: ${stop.count}x\n`
    }
  }

  return response
}

// Busca testes por status
async function buscarStatus(status: string): Promise<string> {
  let statusLabel = ""
  let query = ""
  
  switch (status) {
    case "em_andamento":
      statusLabel = "Em Andamento"
      query = `SELECT t.*, 
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
        FROM tests t
        WHERE t.finished_at IS NULL AND t.is_complete IS NOT FALSE
        ORDER BY t.created_at DESC
        LIMIT 50`
      break
    case "pausado":
      statusLabel = "Pausados"
      query = `SELECT t.*, 
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
        FROM tests t
        WHERE t.finished_at IS NULL AND t.is_complete = FALSE
        ORDER BY t.created_at DESC
        LIMIT 50`
      break
    case "excedeu":
      statusLabel = "Excederam o Tempo"
      query = `SELECT t.*, 
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
        FROM tests t
        WHERE t.finished_at IS NOT NULL AND t.actual_duration_minutes > t.expected_duration_minutes
        ORDER BY t.finished_at DESC
        LIMIT 50`
      break
    case "no_tempo":
      statusLabel = "No Tempo"
      query = `SELECT t.*, 
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
        FROM tests t
        WHERE t.finished_at IS NOT NULL AND t.actual_duration_minutes <= t.expected_duration_minutes
        ORDER BY t.finished_at DESC
        LIMIT 50`
      break
    case "finalizado":
      statusLabel = "Finalizados"
      query = `SELECT t.*, 
        (SELECT COUNT(*) FROM stops WHERE test_id = t.id AND stop_type != 'Refeição')::int as stop_count
        FROM tests t
        WHERE t.finished_at IS NOT NULL
        ORDER BY t.finished_at DESC
        LIMIT 50`
      break
    default:
      return "Status não reconhecido."
  }

  const tests = await sql(query)

  if (tests.length === 0) {
    return `Nenhum teste encontrado com status **${statusLabel}**.`
  }

  let response = `**Testes ${statusLabel}** (${tests.length} encontrado${tests.length > 1 ? "s" : ""})\n\n`

  for (const test of tests) {
    const tempoInfo = test.actual_duration_minutes 
      ? `${formatDuration(test.actual_duration_minutes)}/${formatDuration(test.expected_duration_minutes)}`
      : `Est: ${formatDuration(test.expected_duration_minutes)}`
    
    response += `- Obra **${test.work_number}** | ${test.model} | Banca ${test.bench} | 8ID: ${test.employee_id} | ${tempoInfo} | ${test.stop_count} parada(s)\n`
  }

  return response
}

// Retorna ajuda
function getAjuda(): string {
  return `**Comandos disponíveis:**

**Buscar obra:**
- Digite o número da obra: \`208233\` ou \`obra 208233\`

**Buscar por modelo:**
- \`modelo M76\` ou apenas \`M76\`

**Buscar por colaborador:**
- \`colaborador 10284005\` ou \`8id 10284005\`

**Buscar por banca:**
- \`banca 3\`

**Buscar por parada:**
- \`parada retrabalho\` ou \`paradas de setup\`

**Buscar por data:**
- \`hoje\`, \`ontem\` ou \`03/03/2026\`

**Buscar por status:**
- \`obras em andamento\`, \`testes pausados\`, \`obras que excederam\`, \`testes no tempo\`, \`finalizados\`

**Estatísticas gerais:**
- \`estatísticas\` ou \`resumo geral\`

**Dica:** Você pode combinar termos naturalmente, como "mostre os dados da obra 208233"`
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ 
        response: "Por favor, digite uma pergunta ou comando. Digite **ajuda** para ver os comandos disponíveis." 
      })
    }

    const parsed = parseQuery(message)

    if (!parsed) {
      return NextResponse.json({ 
        response: `Não entendi o comando. Tente algo como:\n- \`obra 123456\`\n- \`modelo M76\`\n- \`colaborador 10284005\`\n- \`hoje\`\n\nDigite **ajuda** para ver todos os comandos.` 
      })
    }

    let response: string

    switch (parsed.type) {
      case "obra":
        response = await buscarObra(parsed.value)
        break
      case "modelo":
        response = await buscarModelo(parsed.value)
        break
      case "colaborador":
        response = await buscarColaborador(parsed.value)
        break
      case "banca":
        response = await buscarBanca(parsed.value)
        break
      case "parada":
        response = await buscarParada(parsed.value)
        break
case "data":
  response = await buscarData(parsed.value)
  break
  case "status":
  response = await buscarStatus(parsed.value)
  break
  case "estatisticas":
        response = await buscarEstatisticas()
        break
      case "ajuda":
        response = getAjuda()
        break
      default:
        response = "Comando não reconhecido. Digite **ajuda** para ver os comandos disponíveis."
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error("Agent API error:", error)
    return NextResponse.json({ 
      response: "Erro ao processar a solicitação. Tente novamente." 
    }, { status: 500 })
  }
}
