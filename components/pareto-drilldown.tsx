"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { STOPS_WITH_SUBTYPES } from "@/lib/constants"

const CHART_RED = "#ef4444"
const CHART_BLUE = "#3b82f6"

interface ParetoData {
  stop_type: string
  count: number
}

interface SubtypeData {
  sub_type: string
  count: number
}

interface ParetoDrilldownProps {
  data: ParetoData[]
  title: string
  filterParams?: string
  color?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ParetoDrilldown({ 
  data, 
  title, 
  filterParams = "",
  color = CHART_RED 
}: ParetoDrilldownProps) {
  const [selectedStopType, setSelectedStopType] = useState<string | null>(null)

  // Busca subtipos quando uma parada é selecionada
  const { data: subtypeData, isLoading: isLoadingSubtypes } = useSWR<SubtypeData[]>(
    selectedStopType 
      ? `/api/dashboard/subtypes?stop_type=${encodeURIComponent(selectedStopType)}${filterParams ? `&${filterParams}` : ""}`
      : null,
    fetcher
  )

  const handleBarClick = (stopType: string) => {
    // Só permite drill-down se a parada tiver subtipos
    if (STOPS_WITH_SUBTYPES.includes(stopType)) {
      setSelectedStopType(stopType)
    }
  }

  const handleBack = () => {
    setSelectedStopType(null)
  }

  if (!data || data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados</p>
  }

  // View de drill-down (subtipos)
  if (selectedStopType) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 px-2">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            {title}: {selectedStopType}
          </p>
        </div>
        
        {isLoadingSubtypes ? (
          <div className="flex h-[180px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !subtypeData || subtypeData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem detalhamento disponivel
          </p>
        ) : (
          <ChartContainer config={{ count: { label: "Ocorrencias", color: CHART_BLUE } }} className="h-[180px]">
            <BarChart data={subtypeData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="sub_type" type="category" width={130} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [`${value} ocorrencias`, "Quantidade"]} />
              <Bar dataKey="count" fill={CHART_BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    )
  }

  // View principal (paradas)
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
      <ChartContainer config={{ count: { label: "Ocorrencias", color } }} className="h-[220px]">
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis 
            dataKey="stop_type" 
            type="category" 
            width={120} 
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value} ocorrencias`, "Quantidade"]}
            labelFormatter={(label) => {
              const hasSubtypes = STOPS_WITH_SUBTYPES.includes(label)
              return hasSubtypes ? `${label} (clique para detalhar)` : label
            }}
          />
          <Bar 
            dataKey="count" 
            fill={color} 
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(data) => handleBarClick(data.stop_type)}
          />
        </BarChart>
      </ChartContainer>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Clique em uma barra para ver detalhes (quando disponivel)
      </p>
    </div>
  )
}
