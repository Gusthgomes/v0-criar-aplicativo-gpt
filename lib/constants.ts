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
  "Falta de material comprado",
  "Falta de material fabricado",
  "Retrabalho",
  "ECM",
  "Vinculação",
  "Setup",
  "Desconexão",
  "Esquecimento separação",
  "Abastecimento DALG",
  "Qualidade",
  "Variação estoque",
  "Engenharia",
  "DPCP",
  "Falta de energia",
  "Defeito",
  "Erro de montagem",
  "Fornecedor",
  "Outros",
] as const

export type StopType = (typeof STOP_TYPES)[number]

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
