"use client"

import { useMemo } from "react"
import { useChartContext } from "./chart-context"
import { resolveColor } from "./palette"

export function Legend() {
  const { series, config, plot } = useChartContext()

  const items = useMemo(
    () =>
      series.map((entry) => {
        const rgb = resolveColor(config[entry.dataKey]?.color, entry.dataKey)
        const label = config[entry.dataKey]?.label ?? entry.dataKey
        return { key: entry.dataKey, label, rgb }
      }),
    [series, config]
  )

  if (items.length === 0) return null

  return (
    <foreignObject
      x={plot.x}
      y={plot.y - 28}
      width={plot.width}
      height={24}
    >
      <div className="flex flex-wrap items-center justify-end gap-3 text-[11px] text-[var(--muted-foreground,#6b7280)]">
        {items.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: `rgb(${item.rgb.join(",")})` }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </foreignObject>
  )
}