export const MODELS = [
  "M25",
  "M28",
  "M29",
  "M30",
  "M31",
  "M33",
  "M34",
  "M35",
  "M73",
  "M74",
  "M75",
  "M76",
  "M77",
  "OUTROS",
] as const

export type Model = (typeof MODELS)[number]

export const MODEL_DURATION_MINUTES: Record<Model, number> = {
  M25: 90,
  M29: 90,
  M28: 210,
  M30: 120,
  M31: 120,
  M33: 120,
  M34: 120,
  M35: 120,
  M73: 240,
  M74: 240,
  M75: 240,
  M76: 180,
  M77: 360,
  OUTROS: 110,
}

export const STOP_TYPES = [
  "Erro de montagem",
  "Erro de fornecedor",
  "Erro de separação",
  "Movimentação",
  "Erro de especificação",
  "Software",
  "Desconexão",
  "PTE PCO PFI ZETE",
  "Falta de material",
  "Material trocado",
  "Material sem identificação",
  "Sem saldo comprado",
  "Sem saldo fabricado",
  "Falha não identificada",
  "Apoio DPCP",
  "Setup",
  "Vinculação",
  "Parada pessoal",
  "Refeição",
  "Apoio técnico",
  "Manutenção de bancada",
  "Manutenção simulador",
  "GD"
] as const

export type StopType = (typeof STOP_TYPES)[number]

// Subgrupos para cada tipo de parada que possui detalhamento
export const STOP_SUBTYPES: Record<string, readonly string[]> = {
  "Erro de montagem": [
    "Bot",
    "Ind",
    "Bot.Ind Acoplado",
    "Lid",
    "COP",
    "QC",
    "CTB",
    "PIT",
    "DPB",
    "DPB-C",
    "P4S",
  ],
  "Erro de fornecedor": [
    "Fiação com defeito",
    "Módulo com defeito",
    "Falta de identificação",
    "Linha solta",
    "Linha invertida",
    "Conector quebrado",
  ],
  "Erro de especificação": [
    "Erro lógica elétrica",
    "Desenho errado",
    "RTC incorreta",
    "ECM/Desvio",
  ],
  "Software": [
    "JobFile faltante",
    "JobFile incorreto",
    "Versão de firmware errada",
    "Atualização de software",
  ],
  "Erro de separação": [
    "Item trocado",
    "Item não enviado/localizado",
  ],
} as const

// Lista de paradas que possuem subgrupos
export const STOPS_WITH_SUBTYPES = Object.keys(STOP_SUBTYPES)

export const BENCHES = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h${mins.toString().padStart(2, "0")}`
}

export function formatTimer(totalSeconds: number): string {
  const isNegative = totalSeconds < 0
  const abs = Math.abs(totalSeconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return isNegative ? `-${time}` : time
}
