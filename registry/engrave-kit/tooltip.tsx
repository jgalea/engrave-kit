"use client"

import { useMemo } from "react"
import { useChartContext } from "./chart-context"
import { xCenter } from "./scales"

export type TooltipProps = {
  labelKey?: string
  valueFormatter?: (value: number, dataKey: string) => string
}

export function Tooltip({
  labelKey,
  valueFormatter = (v) => String(Math.round(v * 10) / 10),
}: TooltipProps) {
  const { data, series, config, hoverIndex, plot, xScale, xAxis } =
    useChartContext()

  const active = hoverIndex != null ? data[hoverIndex] : null
  const labelField = labelKey ?? xAxis.dataKey

  const crosshairX = useMemo(() => {
    if (hoverIndex == null || !active) return null
    const label = String(active[labelField] ?? "")
    return xCenter(xScale, label)
  }, [hoverIndex, active, labelField, xScale])

  if (hoverIndex == null || !active || crosshairX == null) return null

  return (
    <>
      <line
        x1={crosshairX}
        x2={crosshairX}
        y1={plot.y}
        y2={plot.y + plot.height}
        stroke="var(--foreground, #181816)"
        strokeWidth={1}
        opacity={0.2}
        strokeDasharray="3 3"
      />
      <foreignObject
        x={Math.min(crosshairX + 8, plot.x + plot.width - 140)}
        y={plot.y + 8}
        width={140}
        height={120}
      >
        <div className="rounded border border-[var(--border,#e5e7eb)] bg-[var(--background,#fff)] px-2 py-1.5 text-[11px] shadow-sm">
          <div className="mb-1 font-medium text-[var(--foreground,#181816)]">
            {String(active[labelField] ?? "")}
          </div>
          {series.map((entry) => {
            const raw = active[entry.dataKey]
            const value = typeof raw === "number" ? raw : 0
            const label = config[entry.dataKey]?.label ?? entry.dataKey
            return (
              <div
                key={entry.dataKey}
                className="flex justify-between gap-3 text-[var(--muted-foreground,#6b7280)]"
              >
                <span>{label}</span>
                <span className="tabular-nums text-[var(--foreground,#181816)]">
                  {valueFormatter(value, entry.dataKey)}
                </span>
              </div>
            )
          })}
        </div>
      </foreignObject>
    </>
  )
}