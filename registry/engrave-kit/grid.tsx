"use client"

import { useMemo } from "react"
import { useChartContext } from "./chart-context"

export function Grid() {
  const { plot, yScale, yAxis } = useChartContext()

  const ticks = useMemo(
    () => yScale.ticks(yAxis.tickCount),
    [yScale, yAxis.tickCount]
  )

  return (
    <g className="engrave-grid">
      {ticks.map((tick) => {
        const y = yScale(tick)
        return (
          <line
            key={tick}
            x1={plot.x}
            x2={plot.x + plot.width}
            y1={y}
            y2={y}
            stroke="var(--foreground, #181816)"
            strokeWidth={1}
            opacity={0.08}
            strokeDasharray="2 4"
          />
        )
      })}
    </g>
  )
}