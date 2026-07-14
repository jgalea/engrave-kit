"use client"

import type { ReactNode } from "react"
import { ChartProvider, type ChartConfig, type ChartKind } from "./chart-context"
import { EngraveCanvas } from "./engrave-canvas"
import { useChartDimensions } from "./use-chart-dimensions"
import type { ChartDatum, Margins, StackType } from "./scales"

export type ChartShellProps = {
  data: ChartDatum[]
  config?: ChartConfig
  stackType?: StackType
  margins?: Partial<Margins>
  animate?: boolean
  className?: string
  chartKind: ChartKind
  children: ReactNode
}

export function ChartShell({
  data,
  config,
  stackType,
  margins,
  animate = true,
  className = "",
  chartKind,
  children,
}: ChartShellProps) {
  const { ref, width, height } = useChartDimensions<HTMLDivElement>()

  return (
    <ChartProvider
      data={data}
      config={config}
      stackType={stackType}
      margins={margins}
      width={width}
      height={height}
      chartKind={chartKind}
      animate={animate}
    >
      {/* Fill the box you're given. Hardcoding a height here (this used to be h-64)
          silently ignores the caller's sizing and overflows whatever wraps it, so
          the caller sizes the parent — as with recharts' ResponsiveContainer. */}
      {/* The positioning is pinned inline rather than left to utility classes.
          Everything inside is absolutely positioned and sized from the measured
          box, so if the classes are missing (no Tailwind, or purged) the children
          fall into flow, grow this box, get re-measured, and run away. */}
      <div
        ref={ref}
        className={`relative h-full w-full ${className}`.trim()}
        style={{ position: "relative", height: "100%", width: "100%" }}
      >
        <EngraveCanvas />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
          width={width}
          height={height}
        >
          {children}
        </svg>
      </div>
    </ChartProvider>
  )
}