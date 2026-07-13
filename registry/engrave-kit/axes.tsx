"use client"

import { useEffect, useMemo } from "react"
import { useChartContext } from "./chart-context"
import { xCenter } from "./scales"

export type XAxisProps = {
  dataKey: string
  tickFormatter?: (value: string | number) => string
  maxTicks?: number
}

export type YAxisProps = {
  tickFormatter?: (value: string | number) => string
  tickCount?: number
}

function pickTicks<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  const step = Math.ceil(items.length / max)
  return items.filter((_, i) => i % step === 0)
}

// Hoisted, not default parameters. A default like `tickFormatter = (v) => ...`
// mints a fresh function on every render, and these land in the effect deps
// below: the effect would re-run each render, set axis state, re-render, and
// loop until React throws "Maximum update depth exceeded".
const defaultTickFormatter = (v: unknown) => String(v)

export function XAxis({
  dataKey,
  tickFormatter = defaultTickFormatter,
  maxTicks = 8,
}: XAxisProps) {
  const { data, plot, xScale, xAxis, setXAxis } = useChartContext()

  useEffect(() => {
    setXAxis({ dataKey, tickFormatter, maxTicks })
  }, [dataKey, tickFormatter, maxTicks, setXAxis])

  const ticks = useMemo(() => {
    const domain = data.map((d) => String(d[dataKey] ?? ""))
    return pickTicks(domain, maxTicks)
  }, [data, dataKey, maxTicks])

  const y = plot.y + plot.height

  return (
    <g className="engrave-x-axis">
      <line
        x1={plot.x}
        x2={plot.x + plot.width}
        y1={y}
        y2={y}
        stroke="var(--foreground, #181816)"
        strokeWidth={1}
        opacity={0.35}
      />
      {ticks.map((label) => {
        const x = xCenter(xScale, label)
        return (
          <g key={label} transform={`translate(${x}, ${y})`}>
            <line y2={4} stroke="var(--foreground, #181816)" strokeWidth={1} opacity={0.35} />
            <text
              y={16}
              textAnchor="middle"
              className="fill-[var(--muted-foreground,#6b7280)] text-[10px]"
            >
              {xAxis.tickFormatter(label)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export function YAxis({
  tickFormatter = defaultTickFormatter,
  tickCount = 5,
}: YAxisProps) {
  const { plot, yScale, yAxis, setYAxis } = useChartContext()

  useEffect(() => {
    setYAxis({ tickFormatter, tickCount })
  }, [tickFormatter, tickCount, setYAxis])

  const ticks = useMemo(() => yScale.ticks(tickCount), [yScale, tickCount])

  return (
    <g className="engrave-y-axis">
      <line
        x1={plot.x}
        x2={plot.x}
        y1={plot.y}
        y2={plot.y + plot.height}
        stroke="var(--foreground, #181816)"
        strokeWidth={1}
        opacity={0.35}
      />
      {ticks.map((tick) => {
        const y = yScale(tick)
        return (
          <g key={tick} transform={`translate(${plot.x}, ${y})`}>
            <line x2={-4} stroke="var(--foreground, #181816)" strokeWidth={1} opacity={0.35} />
            <text
              x={-8}
              dy="0.32em"
              textAnchor="end"
              className="fill-[var(--muted-foreground,#6b7280)] text-[10px]"
            >
              {yAxis.tickFormatter(tick)}
            </text>
          </g>
        )
      })}
    </g>
  )
}