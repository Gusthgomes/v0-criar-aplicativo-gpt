"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { formatDuration } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { 
  CheckCircle2, 
  Clock, 
  Pause, 
  Play, 
  TrendingUp,
  Target,
  Timer,
  Activity
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface KPIs {
  totalTests: number
  finishedTests: number
  inProgressTests: number
  pausedTests: number
  avgDuration: number
  approvalRate: number
  firstTestApprovalRate: number
  firstTestApproved: number
  firstTestTotal: number
}

interface ActiveTest {
  id: number
  work_number: string
  model: string
  bench: number
  employee_id: string
  expected_duration_minutes: number
  created_at: string
  total_stop_duration: number
}

interface RecentTest {
  work_number: string
  model: string
  bench: number
  employee_id: string
  expected_duration_minutes: number
  actual_duration_minutes: number
  finished_at: string
  on_time: boolean
}

interface BenchTimelineItem {
  bench: number
  work_number: string
  model: string
  start_time: string
  end_time: string | null
  expected_duration_minutes: number
  actual_duration_minutes: number | null
  status: "in_progress" | "paused" | "on_time" | "exceeded"
}

interface ProductivityByModel {
  model: string
  total: number
  on_time: number
}

interface PanelData {
  date: string
  kpis: KPIs
  activeTests: ActiveTest[]
  pausedTests: ActiveTest[]
  recentTests: RecentTest[]
  benchTimeline: BenchTimelineItem[]
  productivityByModel: ProductivityByModel[]
  timestamp: string
}

function formatElapsedTime(startTime: string, stopDuration: number = 0): string {
  const start = new Date(startTime)
  const now = new Date()
  const elapsedMs = now.getTime() - start.getTime()
  const totalMinutes = Math.floor(elapsedMs / 60000) - stopDuration
  const effectiveMinutes = Math.max(0, totalMinutes)
  const hours = Math.floor(effectiveMinutes / 60)
  const mins = effectiveMinutes % 60
  
  if (hours > 0) {
    return `${hours}h ${mins}min`
  }
  return `${mins}min`
}

function getProgressPercent(startTime: string, expectedMinutes: number, stopDuration: number = 0): number {
  const start = new Date(startTime)
  const now = new Date()
  const elapsedMs = now.getTime() - start.getTime()
  const totalMinutes = Math.floor(elapsedMs / 60000) - stopDuration
  const effectiveMinutes = Math.max(0, totalMinutes)
  return Math.min((effectiveMinutes / expectedMinutes) * 100, 150)
}

export function PainelTVView() {
  const { data, isLoading } = useSWR<PanelData>("/api/painel-tv", fetcher, {
    refreshInterval: 15000, // Atualiza a cada 15 segundos
  })
  
  const [currentTime, setCurrentTime] = useState(new Date())

  // Atualiza o relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Carregando painel...</div>
      </div>
    )
  }

  const { kpis, activeTests, pausedTests, recentTests, benchTimeline, productivityByModel } = data

  // Agrupa timeline por banca
  const benchGroups = [1, 2, 3, 4, 5, 6, 7, 8].map(bench => ({
    bench,
    tests: benchTimeline.filter(t => t.bench === bench)
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Painel de Controle</h1>
          <p className="text-zinc-400">Testes de Qualidade em Tempo Real</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold text-white">
            {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-zinc-400">
            {currentTime.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Obras Testadas"
          value={kpis.finishedTests}
          subtitle={`${kpis.totalTests} total hoje`}
          icon={<CheckCircle2 className="h-8 w-8" />}
          color="emerald"
        />
        <KPICard
          title="Taxa de Aprovação"
          value={`${kpis.approvalRate}%`}
          subtitle="No tempo esperado"
          icon={<TrendingUp className="h-8 w-8" />}
          color={kpis.approvalRate >= 80 ? "emerald" : kpis.approvalRate >= 60 ? "yellow" : "red"}
        />
        <KPICard
          title="Aprovação 1º Teste"
          value={`${kpis.firstTestApprovalRate}%`}
          subtitle={`${kpis.firstTestApproved}/${kpis.firstTestTotal} obras`}
          icon={<Target className="h-8 w-8" />}
          color={kpis.firstTestApprovalRate >= 80 ? "emerald" : kpis.firstTestApprovalRate >= 60 ? "yellow" : "red"}
        />
        <KPICard
          title="Tempo Médio"
          value={formatDuration(kpis.avgDuration)}
          subtitle="Por teste finalizado"
          icon={<Timer className="h-8 w-8" />}
          color="blue"
        />
      </div>

      {/* Seção principal */}
      <div className="grid grid-cols-12 gap-4">
        {/* Testes em Andamento e Pausados */}
        <div className="col-span-4 space-y-4">
          {/* Em andamento */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold">Em Andamento</h2>
              <span className="ml-auto bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-sm font-medium">
                {activeTests.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {activeTests.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">Nenhum teste em andamento</p>
              ) : (
                activeTests.map((test) => {
                  const progress = getProgressPercent(test.created_at, test.expected_duration_minutes, test.total_stop_duration)
                  return (
                    <div key={test.id} className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-lg">{test.work_number}</span>
                        <span className={cn(
                          "font-mono font-bold",
                          progress >= 100 ? "text-red-400" : progress >= 80 ? "text-yellow-400" : "text-emerald-400"
                        )}>
                          {formatElapsedTime(test.created_at, test.total_stop_duration)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                        <span>{test.model}</span>
                        <span>Banca {test.bench}</span>
                        <span>{test.employee_id}</span>
                      </div>
                      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            progress >= 100 ? "bg-red-500" : progress >= 80 ? "bg-yellow-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Pausados */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <Pause className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Pausados</h2>
              <span className="ml-auto bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
                {pausedTests.length}
              </span>
            </div>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {pausedTests.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">Nenhum teste pausado</p>
              ) : (
                pausedTests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-2">
                    <span className="font-mono font-bold">{test.work_number}</span>
                    <span className="text-sm text-zinc-400">{test.model}</span>
                    <span className="text-sm text-zinc-400">Banca {test.bench}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Timeline das Bancas */}
        <div className="col-span-8 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Timeline das Bancas</h2>
            <div className="ml-auto flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-zinc-400">No tempo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-zinc-400">Excedeu</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500 animate-pulse" />
                <span className="text-zinc-400">Em andamento</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {benchGroups.map(({ bench, tests }) => (
              <div key={bench} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-zinc-400">Banca {bench}</div>
                <div className="flex-1 h-8 bg-zinc-800 rounded relative overflow-hidden">
                  {/* Marcadores de hora */}
                  <div className="absolute inset-0 flex justify-between px-1">
                    {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => (
                      <div key={hour} className="h-full border-l border-zinc-700/50" />
                    ))}
                  </div>
                  
                  {/* Blocos de testes */}
                  {tests.map((test, idx) => {
                    const startHour = new Date(test.start_time).getHours()
                    const startMinute = new Date(test.start_time).getMinutes()
                    const startPercent = ((startHour - 7) * 60 + startMinute) / (10 * 60) * 100
                    
                    let duration = test.actual_duration_minutes
                    if (!duration && test.status === "in_progress") {
                      const now = new Date()
                      const start = new Date(test.start_time)
                      duration = Math.floor((now.getTime() - start.getTime()) / 60000)
                    }
                    const widthPercent = Math.max((duration || 30) / (10 * 60) * 100, 3)
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "absolute top-1 bottom-1 rounded flex items-center justify-center text-xs font-mono font-bold text-white truncate px-1",
                          test.status === "on_time" && "bg-emerald-500",
                          test.status === "exceeded" && "bg-red-500",
                          test.status === "in_progress" && "bg-blue-500 animate-pulse",
                          test.status === "paused" && "bg-yellow-500"
                        )}
                        style={{
                          left: `${Math.max(0, Math.min(startPercent, 97))}%`,
                          width: `${Math.min(widthPercent, 100 - startPercent)}%`,
                        }}
                        title={`${test.work_number} - ${test.model}`}
                      >
                        {test.work_number}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            
            {/* Escala de horas */}
            <div className="flex items-center gap-3 mt-2">
              <div className="w-20" />
              <div className="flex-1 flex justify-between text-xs text-zinc-500">
                {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => (
                  <span key={hour}>{hour}:00</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção inferior */}
      <div className="grid grid-cols-12 gap-4 mt-4">
        {/* Últimos testes finalizados */}
        <div className="col-span-8 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold">Últimos Testes Finalizados</h2>
          </div>
          <div className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-zinc-400 text-sm border-b border-zinc-800">
                  <th className="text-left py-2 font-medium">Obra</th>
                  <th className="text-left py-2 font-medium">Modelo</th>
                  <th className="text-left py-2 font-medium">Banca</th>
                  <th className="text-left py-2 font-medium">8ID</th>
                  <th className="text-left py-2 font-medium">Tempo</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Hora</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test, idx) => (
                  <tr key={idx} className="border-b border-zinc-800/50 last:border-0">
                    <td className="py-2 font-mono font-bold">{test.work_number}</td>
                    <td className="py-2 text-zinc-300">{test.model}</td>
                    <td className="py-2 text-zinc-300">{test.bench}</td>
                    <td className="py-2 text-zinc-300">{test.employee_id}</td>
                    <td className="py-2 font-mono">
                      {formatDuration(test.actual_duration_minutes)}
                      <span className="text-zinc-500 text-sm ml-1">/ {formatDuration(test.expected_duration_minutes)}</span>
                    </td>
                    <td className="py-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        test.on_time ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {test.on_time ? "No tempo" : "Excedeu"}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-400 text-sm">
                      {new Date(test.finished_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtividade por modelo */}
        <div className="col-span-4 bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Por Modelo</h2>
          </div>
          <div className="space-y-3">
            {productivityByModel.length === 0 ? (
              <p className="text-zinc-500 text-center py-4">Sem dados</p>
            ) : (
              productivityByModel.slice(0, 6).map((item) => {
                const rate = item.total > 0 ? Math.round((item.on_time / item.total) * 100) : 0
                return (
                  <div key={item.model} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.model}</span>
                      <span className="text-zinc-400">{item.on_time}/{item.total} ({rate}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full",
                          rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-yellow-500" : "bg-red-500"
                        )}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-4 flex items-center justify-between text-zinc-500 text-sm">
        <span>Atualização automática a cada 15 segundos</span>
        <span>Última atualização: {new Date(data.timestamp).toLocaleTimeString("pt-BR")}</span>
      </div>
    </div>
  )
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: { 
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: "emerald" | "blue" | "yellow" | "red"
}) {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400",
    red: "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400",
  }

  return (
    <div className={cn(
      "bg-gradient-to-br rounded-xl p-5 border",
      colorClasses[color]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
          <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className={cn("opacity-80", `text-${color}-400`)}>
          {icon}
        </div>
      </div>
    </div>
  )
}
